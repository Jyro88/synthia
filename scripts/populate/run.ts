import { getAllElements, getAllRecipes, getAttemptedKeys, claimAttempt, releaseAttempt, findOrCreateElement, finalizeApproved, finalizeRejected, type ElementRow } from './db';
import { pickCandidate, pickMultiCandidate } from './explorer';
import { evaluateCombination } from './judge';
import { setMinIntervalMs } from './gemini';
import { DEFAULT_LANES, resolveLane, laneAnchorIds, type Lane } from './lanes';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const get = (flag: string, fallback: number): number => {
    const arg = args.find(a => a.startsWith(`--${flag}=`));
    return arg ? Number(arg.split('=')[1]) : fallback;
  };

  // --branch alone = all DEFAULT_LANES; --branch=life,culture = just those,
  // by name (see lanes.ts). Runs one worker per lane instead of `concurrency`
  // identical workers, each nudged toward its own theme -- but all still
  // sharing the one global Gemini rate limiter in gemini.ts, same as today,
  // so this branches exploration direction without multiplying real request
  // volume (separate OS processes would each pace independently and blow
  // straight through the shared per-project quota; this doesn't).
  const branchArg = args.find(a => a === '--branch' || a.startsWith('--branch='));
  const branchNames = branchArg
    ? (branchArg.includes('=')
      ? branchArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean)
      : DEFAULT_LANES.map(l => l.name))
    : [];

  return {
    count: get('count', 50),
    concurrency: get('concurrency', 3),
    minIntervalMs: get('min-interval-ms', 4500),
    dryRun: args.includes('--dry-run'),
    // 3-5 ingredient combinations, guided toward thematically-related sets
    // (see pickMultiCandidate) instead of pairwise exploration.
    multi: args.includes('--multi'),
    branchNames
  };
};

const label = (elements: ElementRow[]): string => elements.map(el => el.name).join(' + ');

// Multi-element (3-5 ingredient) generation is a future feature -- it only
// produces a rich, varied recipe pool once there's a wide base of
// pairwise-discovered elements for the neighbor-graph picker to draw from.
// Below this size it'd just be re-shuffling a shallow pool. This is a hard
// gate, not a suggestion: --multi refuses to spend any Judge calls below it.
const MIN_ELEMENTS_FOR_MULTI = 500;

interface WorkerBudget {
  remaining: number;
}

const run = async () => {
  const { count, concurrency, dryRun, minIntervalMs, multi, branchNames } = parseArgs();
  setMinIntervalMs(minIntervalMs);

  const branchLanes: Lane[] = branchNames.map(name => {
    const lane = resolveLane(name);
    if (!lane) throw new Error(`Unknown lane "${name}". Available: ${DEFAULT_LANES.map(l => l.name).join(', ')}`);
    return lane;
  });

  console.log(`Starting populate run: count=${count} concurrency=${concurrency} minIntervalMs=${minIntervalMs} dryRun=${dryRun} multi=${multi}${
    branchLanes.length > 0 ? ` branch=[${branchLanes.map(l => l.name).join(', ')}]` : ''
  }`);

  const elements = await getAllElements();

  if (multi && elements.length < MIN_ELEMENTS_FOR_MULTI) {
    console.log(`Multi-element populate is gated until the catalog has ${MIN_ELEMENTS_FOR_MULTI} elements (currently ${elements.length}). Run more pairwise batches first.`);
    return;
  }
  const attemptedKeys = dryRun ? new Set<string>() : await getAttemptedKeys();
  const elementNameById = new Map(elements.map(el => [el.id, el.name]));

  // Read-only, so always fetched regardless of dry-run: both pickCandidate
  // (graph-degree weighting) and pickMultiCandidate (neighbor graph) need it,
  // and newly-approved recipes get pushed into this same array as the run
  // goes (see below) so degree/neighbor weighting reacts within a single run,
  // not just across separate ones -- that in-run feedback is what actually
  // stops a run from snowballing into one theme once it starts finding a
  // dense cluster.
  const recipes = await getAllRecipes();

  const recipesByResultName = new Map<string, string[]>();
  const recordRecipe = (resultName: string, ingredientIds: string[]) => {
    const path = ingredientIds.map(id => elementNameById.get(id) || id).join(' + ');
    const list = recipesByResultName.get(resultName) || [];
    list.push(path);
    recipesByResultName.set(resultName, list);
  };
  if (!dryRun) {
    for (const recipe of recipes) {
      const resultName = elementNameById.get(recipe.resultId);
      if (resultName) recordRecipe(resultName, recipe.ingredientIds);
    }
  }

  let approvedCount = 0;
  let rejectedCount = 0;
  let checkpointGuardrailCount = 0;
  const createdElementNames: string[] = [];
  const resultUsageCounts = new Map<string, number>();
  const bumpUsage = (name: string) => resultUsageCounts.set(name, (resultUsageCounts.get(name) || 0) + 1);

  const worker = async (lane: Lane | undefined, budget: WorkerBudget) => {
    const anchorIds = lane ? laneAnchorIds(lane) : undefined;

    while (budget.remaining > 0) {
      const candidate = multi
        ? pickMultiCandidate(elements, recipes, attemptedKeys)
        : pickCandidate(elements, recipes, attemptedKeys, anchorIds);
      if (!candidate) {
        console.log(multi ? 'No untried multi-element combinations found.' : 'No untried combinations remain.');
        return;
      }

      budget.remaining -= 1;
      attemptedKeys.add(candidate.key); // reserve in-process before any await

      // A single candidate failing catastrophically (e.g. a network outage
      // that outlasts db.ts's own retries) should cost this one candidate,
      // not take down every concurrent worker -- Promise.all below would
      // otherwise kill the whole batch on one uncaught error.
      try {

      let attemptId: number | null = null;
      if (!dryRun) {
        attemptId = await claimAttempt(candidate.key);
        if (attemptId === null) continue; // claimed by another worker/run, skip
      }

      const verdict = await evaluateCombination(candidate.elements, elements, resultUsageCounts, recipesByResultName, lane?.themeHint);

      if (!verdict) {
        console.warn(`⚠️  ${label(candidate.elements)}: judge call failed, skipping`);
        if (!dryRun && attemptId !== null) {
          await releaseAttempt(attemptId);
        }
        continue;
      }

      if (!verdict.approved || !verdict.resultName || !verdict.resultEmoji || !verdict.resultRarity) {
        rejectedCount += 1;
        if (verdict.overriddenByGuardrail === 'checkpoint') checkpointGuardrailCount += 1;
        const hint = verdict.needsAdditionalIngredient
          ? ` (needs additional ingredient: ${verdict.needsAdditionalIngredient})`
          : '';
        const tag = verdict.overriddenByGuardrail === 'checkpoint' ? '🛑[guardrail] ' : '';
        const laneTag = lane ? `[${lane.name}] ` : '';
        console.log(`❌ ${laneTag}${tag}${label(candidate.elements)}: ${verdict.reasoning}${hint}`);
        if (!dryRun && attemptId !== null) {
          await finalizeRejected(attemptId, verdict.reasoning, verdict.needsAdditionalIngredient);
        }
        continue;
      }

      if (dryRun) {
        approvedCount += 1;
        bumpUsage(verdict.resultName);
        recordRecipe(verdict.resultName, candidate.elements.map(el => el.id));
        console.log(`✅ ${lane ? `[${lane.name}] ` : ''}(dry-run) ${label(candidate.elements)} = ${verdict.resultName} [${verdict.resultRarity}]`);
        continue;
      }

      const resultElement = await findOrCreateElement(
        verdict.resultName,
        verdict.resultEmoji,
        verdict.resultRarity,
        elements
      );
      if (!elements.some(el => el.id === resultElement.id)) {
        elements.push(resultElement);
        createdElementNames.push(resultElement.name);
      }

      await finalizeApproved(
        attemptId!,
        candidate.key,
        candidate.elements.map(el => el.id),
        resultElement.id,
        verdict.reasoning
      );

      approvedCount += 1;
      bumpUsage(resultElement.name);
      recordRecipe(resultElement.name, candidate.elements.map(el => el.id));
      // Feeds pickCandidate/pickMultiCandidate's graph weighting immediately,
      // within this same run -- see the comment on `recipes` above.
      recipes.push({ resultId: resultElement.id, ingredientIds: candidate.elements.map(el => el.id) });
      console.log(`✅ ${lane ? `[${lane.name}] ` : ''}${label(candidate.elements)} = ${resultElement.name} [${resultElement.rarity}]`);

      } catch (error) {
        console.error(`⚠️  ${label(candidate.elements)}: unexpected error, skipping this candidate:`, error instanceof Error ? error.message : error);
      }
    }
  };

  let workerRuns: Promise<void>[];
  if (branchLanes.length > 0) {
    // One worker per lane, each with its own slice of `count` -- not a
    // shared pool -- so every lane gets guaranteed exploration time instead
    // of a faster lane eating the whole budget.
    const perLane = Math.floor(count / branchLanes.length);
    let leftover = count - perLane * branchLanes.length;
    workerRuns = branchLanes.map(lane => {
      const budget: WorkerBudget = { remaining: perLane + (leftover-- > 0 ? 1 : 0) };
      return worker(lane, budget);
    });
  } else {
    const sharedBudget: WorkerBudget = { remaining: count };
    workerRuns = Array.from({ length: concurrency }, () => worker(undefined, sharedBudget));
  }

  await Promise.all(workerRuns);

  console.log('\n--- Summary ---');
  console.log(`Approved: ${approvedCount}`);
  console.log(`Rejected: ${rejectedCount}`);
  console.log(`Checkpoint guardrail overrides: ${checkpointGuardrailCount} (model said approved but failed its own self-graded checks)`);
  console.log(`New elements: ${createdElementNames.length ? createdElementNames.join(', ') : '(none)'}`);
};

run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

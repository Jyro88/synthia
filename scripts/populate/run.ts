import { getAllElements, getAllRecipes, getAttemptedKeys, claimAttempt, releaseAttempt, findOrCreateElement, finalizeApproved, finalizeRejected, type ElementRow } from './db';
import { pickCandidate } from './explorer';
import { evaluateCombination } from './judge';
import { setMinIntervalMs } from './gemini';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const get = (flag: string, fallback: number): number => {
    const arg = args.find(a => a.startsWith(`--${flag}=`));
    return arg ? Number(arg.split('=')[1]) : fallback;
  };
  return {
    count: get('count', 50),
    concurrency: get('concurrency', 3),
    minIntervalMs: get('min-interval-ms', 4500),
    dryRun: args.includes('--dry-run')
  };
};

const label = (elements: ElementRow[]): string => elements.map(el => el.name).join(' + ');

const run = async () => {
  const { count, concurrency, dryRun, minIntervalMs } = parseArgs();
  setMinIntervalMs(minIntervalMs);
  console.log(`Starting populate run: count=${count} concurrency=${concurrency} minIntervalMs=${minIntervalMs} dryRun=${dryRun}`);

  const elements = await getAllElements();
  const attemptedKeys = dryRun ? new Set<string>() : await getAttemptedKeys();
  const elementNameById = new Map(elements.map(el => [el.id, el.name]));

  const recipesByResultName = new Map<string, string[]>();
  const recordRecipe = (resultName: string, ingredientIds: string[]) => {
    const path = ingredientIds.map(id => elementNameById.get(id) || id).join(' + ');
    const list = recipesByResultName.get(resultName) || [];
    list.push(path);
    recipesByResultName.set(resultName, list);
  };
  if (!dryRun) {
    for (const recipe of await getAllRecipes()) {
      const resultName = elementNameById.get(recipe.resultId);
      if (resultName) recordRecipe(resultName, recipe.ingredientIds);
    }
  }

  let remaining = count;
  let approvedCount = 0;
  let rejectedCount = 0;
  let checkpointGuardrailCount = 0;
  const createdElementNames: string[] = [];
  const resultUsageCounts = new Map<string, number>();
  const bumpUsage = (name: string) => resultUsageCounts.set(name, (resultUsageCounts.get(name) || 0) + 1);

  const worker = async () => {
    while (remaining > 0) {
      const candidate = pickCandidate(elements, attemptedKeys);
      if (!candidate) {
        console.log('No untried combinations remain.');
        return;
      }

      remaining -= 1;
      attemptedKeys.add(candidate.key); // reserve in-process before any await

      let attemptId: number | null = null;
      if (!dryRun) {
        attemptId = await claimAttempt(candidate.key);
        if (attemptId === null) continue; // claimed by another worker/run, skip
      }

      const verdict = await evaluateCombination(candidate.elements, elements, resultUsageCounts, recipesByResultName);

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
        console.log(`❌ ${tag}${label(candidate.elements)}: ${verdict.reasoning}${hint}`);
        if (!dryRun && attemptId !== null) {
          await finalizeRejected(attemptId, verdict.reasoning, verdict.needsAdditionalIngredient);
        }
        continue;
      }

      if (dryRun) {
        approvedCount += 1;
        bumpUsage(verdict.resultName);
        recordRecipe(verdict.resultName, candidate.elements.map(el => el.id));
        console.log(`✅ (dry-run) ${label(candidate.elements)} = ${verdict.resultName} [${verdict.resultRarity}]`);
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
      console.log(`✅ ${label(candidate.elements)} = ${resultElement.name} [${resultElement.rarity}]`);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

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

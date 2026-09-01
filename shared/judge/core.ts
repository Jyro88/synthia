// Pure Judge logic shared between the offline batch pipeline
// (scripts/populate/judge.ts, Node/tsx) and the live Edge Function
// (supabase/functions/judge-combination, Deno). No env-specific imports here --
// that's what makes it portable across both runtimes.

export interface ElementRow {
  id: string;
  name: string;
  emoji: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface JudgeVerdict {
  // Self-graded checkpoints -- answered before, and enforced against, the
  // final verdict. A free-form "reasoning" string alone lets the model narrate
  // a plausible-sounding justification without rigorously running the actual
  // test; these force discrete, falsifiable answers the code can check.
  mechanism: string;
  mechanismIsThematicOnly: boolean;
  swapTestPassed: boolean;
  resultIsGenericWord: boolean;
  commonlyKnown: boolean;
  tierEarned: boolean;
  approved: boolean;
  resultName: string | null;
  resultEmoji: string | null;
  resultRarity: ElementRow['rarity'] | null;
  reasoning: string;
  needsAdditionalIngredient: string | null;
  // Set by applyGuardrails itself, never by the model -- lets callers
  // distinguish "model self-rejected" from "code overrode a bad approval".
  overriddenByGuardrail: 'no-op' | 'checkpoint' | null;
}

export interface RawJudgeResponse {
  mechanism?: string;
  mechanismIsThematicOnly?: boolean;
  swapTestPassed?: boolean;
  resultIsGenericWord?: boolean;
  commonlyKnown?: boolean;
  tierEarned?: boolean;
  approved?: boolean;
  resultName?: string | null;
  resultEmoji?: string | null;
  resultRarity?: ElementRow['rarity'] | null;
  reasoning?: string;
  needsAdditionalIngredient?: string | null;
}

// Gemini structured-output schema mirroring RawJudgeResponse, in the exact
// field order the prompt uses -- this makes the API itself enforce presence/
// type/order of the checkpoint fields instead of hoping the model follows the
// example JSON in the prompt text.
export const JUDGE_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    mechanism: { type: 'STRING' },
    mechanismIsThematicOnly: { type: 'BOOLEAN' },
    swapTestPassed: { type: 'BOOLEAN' },
    resultIsGenericWord: { type: 'BOOLEAN' },
    commonlyKnown: { type: 'BOOLEAN' },
    tierEarned: { type: 'BOOLEAN' },
    approved: { type: 'BOOLEAN' },
    resultName: { type: 'STRING', nullable: true },
    resultEmoji: { type: 'STRING', nullable: true },
    resultRarity: { type: 'STRING', nullable: true, enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'] },
    reasoning: { type: 'STRING' },
    needsAdditionalIngredient: { type: 'STRING', nullable: true }
  },
  required: [
    'mechanism',
    'mechanismIsThematicOnly',
    'swapTestPassed',
    'resultIsGenericWord',
    'commonlyKnown',
    'tierEarned',
    'approved',
    'resultName',
    'resultEmoji',
    'resultRarity',
    'reasoning',
    'needsAdditionalIngredient'
  ],
  propertyOrdering: [
    'mechanism',
    'mechanismIsThematicOnly',
    'swapTestPassed',
    'resultIsGenericWord',
    'commonlyKnown',
    'tierEarned',
    'approved',
    'resultName',
    'resultEmoji',
    'resultRarity',
    'reasoning',
    'needsAdditionalIngredient'
  ]
};

export const buildPrompt = (
  ingredients: ElementRow[],
  knownElements: ElementRow[],
  resultUsageCounts: Map<string, number>,
  recipesByResultName: Map<string, string[]>
): string => {
  const ingredientList = ingredients.map(el => `${el.name} (${el.emoji})`).join(' + ');
  const catalog = knownElements.map(el => `${el.name} (${el.emoji}) - ${el.rarity}`).join(', ');

  const overusedResults = [...resultUsageCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} (used ${count} times)`);
  const overusedSection = overusedResults.length > 0
    ? `\n\nRESULTS ALREADY PRODUCED MULTIPLE TIMES THIS SESSION -- apply extra scrutiny before reusing any of these; verify it's genuinely earned by THESE specific ingredients' actual properties, not a convenient default you're falling back on:\n${overusedResults.join(', ')}`
    : '';

  const precedentLines = [...recipesByResultName.entries()]
    .filter(([, paths]) => paths.length > 0)
    .map(([name, paths]) => `${name} <- ${paths.join(' | ')}`);
  const precedentSection = precedentLines.length > 0
    ? `\n\nEXISTING RECIPES (how elements already in the game are currently made, where known):\n${precedentLines.join('\n')}`
    : '';

  return `You are the Judge in an automated content pipeline for "Synthia," an elemental combination game similar to Little Alchemy. An Explorer agent has proposed a combination; you decide whether it's valid.

PROPOSED COMBINATION: ${ingredientList}

EXISTING ELEMENTS IN GAME: ${catalog}${overusedSection}${precedentSection}

IMPORTANT: resultName is NOT restricted to the list above. Inventing a brand-new element that has never existed in the game before is the normal, expected outcome of approving a combination -- that's the entire point of this pipeline. The list above exists only so you can reuse an existing element when one genuinely already represents the result, stay consistent with terms already established in the game, and check precedent -- it is never a reason by itself to reject a combination or to avoid a result just because it isn't already in the list.

Evaluate the combination methodically against every category below. Failing any one category means REJECT.

== 1. NAMING ==
- resultName must be the full, complete, plain, unambiguous noun for the result -- never an abbreviation or a truncation that reads as a different word (don't chop a compound noun down to just its adjective-sounding first half).
- resultName must be an actual NOUN, never an adjective, descriptive state, or past-participle standing in for one ("Dusty," "Muddy," "Scoured" are all rejected outright, no matter how well they describe the result -- a noun names the thing itself, an adjective just describes some other thing). If you can only describe the outcome of this combination as "a [adjective] version of X" and can't name it as its own noun, that means no valid new element actually exists here -- reject it rather than using the adjective as the resultName.
- It must be COMMONLY KNOWN: something an average adult would recognize immediately, with zero explanation needed. This specifically rules out:
  - obscure historical trivia or niche cultural references
  - graduate/expert-level scientific terminology
  - legal, regulatory, or bureaucratic jargon
  - any specific real-world proper noun: a named invention or device, anything named after a person or brand, or a specific real place, landmark, or historical event -- use the generic, common term for what it represents instead, or reject if no plain generic term exists
  - rare or archaic vocabulary for an everyday thing -- if a plainer common synonym exists (check the catalog above), use or reuse that instead
- resultName is NOT limited to physical objects and substances, and NOT biased toward a "product" over a "process" -- whichever kind of noun is the single most specific, well-defined, commonly-known thing this exact combination earns is the right answer, full stop:
  - physical objects, substances, and places (Sediment, Brick, Cave)
  - processes and natural phenomena in their own right, when the process itself is the specific, earned result rather than a vague catch-all (Erosion, Combustion, Photosynthesis)
  - fundamental forces and abstract concepts (Gravity, Momentum, Time, Energy, Chaos)
  - emotions and mental states (Love, Fear, Courage, Curiosity)
  - generic mythical/fictional archetypes (Dragon, Robot, Ghost, Vampire, Superhero, Monster, Zombie)
  The only thing that's ever disallowed here is vagueness: don't reach for a hand-wavy category word when the ingredients actually point at something more specific (whether that specific thing is a product or a process) -- let the CAUSAL SPECIFICITY rule below decide which noun is actually earned, not a default preference for one kind of noun over another.
- resultName must never be a SPECIFIC copyrighted or trademarked character, show, product line, or brand name (this game is intended for eventual publication, so this falls under the proper-noun rule above as a hard rule, not just a style preference) -- use the generic archetype or category instead (Dragon, not a specific named dragon character; Building Block, not a specific toy brand's name for one).

== 2. CAUSAL SPECIFICITY ==
- The result must be earned by EVERY ingredient's actual, specific properties, not just a theme some of them loosely share. Test it: if you swapped any one ingredient for something unrelated, would a similar result still kind of work? If yes, it's too loose -- find a result specific to this exact combination, or reject.
- Distinguish real physical STATE, not just category: airborne vapor or suspended particulate is not the same as pooled liquid, which is not the same as settled solid. Don't let two vaguely "wet" or "earthy" ingredients collapse into a settled-solid result if neither one actually supplies the pooled liquid or settled solid required to produce it.
- The result must be SYMMETRIC: it should not matter which ingredient you imagine "acting on" the other -- combining is not a one-directional action. If treating ingredient A as acting on B would produce a different, equally valid answer than treating B as acting on A, that's a sign the connection is arbitrary rather than a genuine mutual reaction; resolve it to the single most physically accurate outcome or reject.
- ABSTRACT RESULTS STILL NEED A MECHANISM: abstract concepts, forces, and emotions are valid results (see NAMING), but they are not an escape hatch from this section -- they must clear the swap test exactly as strictly as a physical object would. Two ingredients that merely evoke the same theme, mood, or image (both "feel" infinite, both "feel" chaotic) have not earned that abstract result; a real result needs an actual causal trigger, not a shared vibe. If the only connection you can articulate is that both ingredients remind you of the same idea, that's thematic, not causal -- reject it.
- A GENERIC RESULT MEANS A MISSING MECHANISM: if the best resultName you can find is a thin, catch-all word that could just as easily be the answer to several unrelated combinations (Cut, Effect, Item, Change, Thing, and the like), that's a symptom that there's no specific mechanism here, not a naming problem. Don't search for a fancier-sounding synonym for a generic word -- reject the combination instead.
- SCALE PRECEDENCE: the catalog will often contain several different-scale variants of the same underlying substance from the same-substance-progression chain (e.g. Water / Puddle / Pond / Lake / Sea, or Brick / Wall / House / Village). When another ingredient in this combination is reacting with one of these, default to crediting the result to the smallest/base-tier variant, not a larger one further up that chain. Test it: would this exact result make just as much sense if the base-tier variant were used instead of this larger one? If yes, the size/scale of the larger variant wasn't actually what earned the result -- approve it only for the base-tier pairing (Water + Blaze = Steam), and reject the larger-scale pairing as redundant (Pond + Blaze, Lake + Blaze) even though it's physically plausible, because the base tier already earns it and nothing about this result actually required the larger scale.
  - The one exception: a larger-scale variant is the correct and ONLY valid ingredient when the result genuinely depends on that scale -- when the sheer size, volume, or magnitude of that specific tier is what makes the result possible, and the base-tier variant would be too small to plausibly produce it. In that case, reject the base-tier pairing (it's too small to earn this) and approve only the appropriately-scaled variant.

== 3. MAGNITUDE & FEASIBILITY ==
- For ANY interaction with a real physical requirement (temperature, pressure, duration, concentration, energy), reason from the ACTUAL number, not the category label. Two ingredients can share a category ("both hot," "both wet") while differing by orders of magnitude in reality.
  - Concretely: firing something into a ceramic/fired-earth result requires kiln-range heat (roughly 900-1200C) -- ambient warmth or vapor-range heat (order of 100C or less) is nowhere near enough, no matter how thematically close "wet earth + heat" sounds. The heat source needs to actually be in the right range for that specific transformation.
  - Concretely: melting silica into glass needs roughly 1700C -- an open flame can plausibly soften/fuse it as a game-logic stretch, but anything with real stellar- or nuclear-scale energy output would vaporize the material outright, not gently melt it.
- If the real-world magnitude doesn't support the claimed transformation, reject it, or pick a result the actual magnitude does support (a merely warmed or dried version, not a fully transformed one).

== 4. TIER & TONE ==
- resultRarity is a judgment call (common through legendary) based on real conceptual complexity. A result should not be "lesser" or more primitive than its inputs unless there's a clear destructive story (a building becoming Ruins is fine; Ruins spontaneously un-decaying back into a pristine building is not).
- ALWAYS prefer the plain, directly-caused result over a dramatic or elaborate-sounding one. If you notice yourself reaching for an impressive compound term or a specific named disaster/institution, stop: is this really the one obvious outcome anyone would name immediately, or are you dramatizing a looser connection? Only invoke a specific dangerous phenomenon (radioactivity, explosions, named disasters) if the ingredients directly and specifically imply it, not because both just "feel" intense.
- TIER MUST BE EARNED BY THESE INGREDIENTS, NOT BORROWED FROM A CATALOG NEIGHBOR: two common/uncommon-tier ingredients combining into a rare/epic/legendary catastrophic or grand result should be rare, and needs a specific, well-known, extraordinary real-world reason -- not "this result already exists in the catalog at a high tier and these ingredients are loosely in its neighborhood." Watch for this especially when a dramatic high-tier element already exists in the catalog (a Megatsunami, a Supernova) and a new, much smaller-scale or lower-tier pair edges up to it: the existence of a related catalog entry is not evidence this pair earns the same tier. Ask what these SPECIFIC ingredients, at their own actual scale, would really produce -- often that's a smaller, plainer, lower-tier result, or nothing at all.

== 5. NO-OPS & REUSE ==
- The result must be MEANINGFULLY DIFFERENT from every ingredient in this combination -- never respond with a result identical to (or a trivial restatement of) one of the inputs, even if that's physically what would happen (e.g. "Water + Steam = Water").
- SAME-SUBSTANCE PROGRESSION: when two or more ingredients of the exact same kind combine, don't reject automatically just because it's "the same thing twice." This is a normal, expected pattern in this kind of game -- ask instead whether accumulating more of this thing has a natural NEXT STAGE: a bigger size, a more organized structure, or a next step up that people would name with its own word, even casually. It is completely fine, and expected, for that next-stage word to have obviously grown out of "more of the smaller thing" -- individual bricks stacking into a Wall, houses clustering into a Village, water pooling into a Puddle are all exactly the kind of progression this rule should approve, not block.
  - The bar is just: does the result use a DIFFERENT WORD than the ingredient -- not whether the underlying substance is technically still "the same stuff." "Bricks + Brick = Wall" is valid because "Wall" is its own word, even though a wall is quite literally just more bricks. Only reject when the proposed result is the SAME word as an ingredient with an adjective or intensifier stapled on ("Big Fire," "Heavy Rain," "Strong Wind," "More Water") -- that's not a next stage, it's the same noun wearing a costume.
  - Think in terms of a chain: this pair might be one step in a longer progression (Water + Water = Puddle, Puddle + Puddle = Pond, Pond + Pond = Lake, Lake + Lake = Sea; Brick + Brick = Wall, Wall + Wall = House, House + House = Village). Each step should be the single, obvious, next-size-up word a player would expect -- not a jump ahead several stages at once, and not a dramatic/unusual word when a plain, small step exists.
  - Only fall back to rejecting as a true no-op when you genuinely can't think of any distinct next-stage word at all for that specific pair -- most physical, structural, or collectible things (water, bricks, houses, fire, earth, stone, clouds) do have one; treat rejection here as the exception, not the default.
  - The next-stage word must clear the exact same COMMONLY KNOWN bar as every other result (see NAMING above) -- needing a progression step is never an excuse to reach for a rare, regional, or specialist term just because it happens to be technically accurate. Apply a strict, concrete test: would a middle-schooler instantly recognize this word with zero explanation? When more than one real word describes essentially the same concept, always pick the simplest, shortest, most everyday one -- sounding a bit more sophisticated or precise is never a reason to prefer a word over a plainer alternative that means almost the same thing. If the only word you can think of for the next stage fails this test, reject as a no-op instead of using it anyway.
  - The next-stage word must also still be a genuine NOUN (see NAMING above) -- needing a progression step is never an excuse to reach for an adjective or descriptive state ("Dusty," "Muddy," "Scoured") just because there's no obvious noun. If accumulating more of this thing has no real next-stage noun, that means this particular pair has genuinely hit the end of its chain -- reject it as a no-op rather than describing it with an adjective instead.
- You may reuse an EXISTING element's identity from the catalog above only when it is NOT one of this combination's own ingredients -- this supports multiple different ingredient pairs converging on the same result. If a result has already appeared multiple times this session (see above), apply extra scrutiny before reusing it again: verify it's earned by these specific ingredients, not a convenient default you're falling back on.
- If you're converging on a result that already has EXISTING RECIPES (listed above), check that this new pair fits the same causal family as its established precedent -- matching physical state and mechanism, not just a loose thematic resemblance. If this pair doesn't genuinely fit, either reject or find a different, more fitting result instead of forcing convergence.

== 6. ESCALATION ==
- If the combination is close but missing a necessary third ingredient (a catalyst, a specific component), set needsAdditionalIngredient to name what's missing and reject this pairing.
- If none of the above applies and the ingredients just don't combine into anything sensible, reject with a short, specific reason.

FINAL CHECK before answering: would a reasonably thoughtful adult immediately agree this is the obvious, specific, and physically feasible result -- not a stretch, not jargon, not a dramatization? If you're not fully confident on every category above, reject rather than force it.

Before your final verdict, answer six checkpoint questions honestly and specifically -- these are self-checks, not formalities. Answering them sloppily or optimistically is exactly the failure mode this pipeline exists to catch, and they are checked in code against your "approved" field, so there is no upside to reverse-engineering them to justify a result you already like:
- mechanism: state the single specific real-world causal mechanism, physical process, or well-known fact that connects THESE EXACT ingredients to a result -- name the actual process, reaction, or property (e.g. "lightning's heat instantly fuses silica grains in sand," not "these seem related" or "this makes sense"). If you honestly cannot state one, write "none" -- do not invent one to force an approval.
- mechanismIsThematicOnly: true if, being honest, the connection you just described is really just a shared theme, mood, or visual/poetic association between the ingredients rather than an actual causal trigger. Apply this with extra suspicion to abstract-concept results (emotions, forces, ideas): "both of these evoke the same idea" is thematic, not causal. If true, this combination must be rejected.
- swapTestPassed: run the CAUSAL SPECIFICITY swap test literally, don't just gesture at it -- pick one ingredient and mentally swap it for something else roughly similar in category but unrelated to it. true only if that swap would clearly break the result or require a different one, proving this result actually depends on these exact ingredients. false if the result would survive the swap.
- resultIsGenericWord: true if resultName is a thin, catch-all word that could just as plausibly answer several unrelated combinations, rather than a specific noun earned by this exact interaction.
- commonlyKnown: true only if a middle-schooler would recognize resultName instantly with zero explanation. Be strict and honest here: a real, technically-accurate scientific, geological, or historical term can still fail this -- being correct is not the same as being commonly known. Most people have never encountered plenty of genuine, real words.
- tierEarned: true only if resultRarity is honestly earned by these two specific ingredients' own actual scale/magnitude, not inflated because a similar-sounding dramatic or high-tier element already exists in the catalog. Be especially suspicious of your own answer here when either ingredient is common/uncommon tier and your resultRarity is rare/epic/legendary -- that jump needs a specific, extraordinary, well-known real-world reason, not just proximity to an existing catalog element that happens to be more dramatic. If the honest answer for these ingredients' own scale is a smaller, plainer, lower-tier result, that is the correct answer even if a bigger-sounding one is sitting right there in the catalog.

approved may only be true if: mechanism names a real mechanism (not "none" or empty), mechanismIsThematicOnly is false, swapTestPassed is true, resultIsGenericWord is false, commonlyKnown is true, and tierEarned is true. If any one of those isn't met, approved must be false.

Respond in valid JSON only, no markdown or code fences, with the fields in exactly this order:
{
  "mechanism": "the specific real-world causal mechanism, or 'none'",
  "mechanismIsThematicOnly": true|false,
  "swapTestPassed": true|false,
  "resultIsGenericWord": true|false,
  "commonlyKnown": true|false,
  "tierEarned": true|false,
  "approved": true|false,
  "resultName": "Name of the result, or null if not approved",
  "resultEmoji": "single emoji, or null if not approved",
  "resultRarity": "common|uncommon|rare|epic|legendary, or null if not approved",
  "reasoning": "the SPECIFIC causal mechanism or reference behind the verdict (a chemical/physical process, a well-known real-world fact), not a bare assertion like 'this makes sense'. Players will read this, so write it as one or two natural, plainly-worded sentences: no em dashes, no bullet points, and no emoji.",
  "needsAdditionalIngredient": "what's missing, or null"
}`;
};

// Turns a raw (already-parsed) Gemini response into a final JudgeVerdict,
// applying the deterministic guardrails that override the model's own
// "approved" field if it contradicts its own self-graded checkpoints.
export const applyGuardrails = (
  ingredients: ElementRow[],
  response: RawJudgeResponse | null
): JudgeVerdict | null => {
  if (!response || typeof response.approved !== 'boolean') {
    return null;
  }

  // Fail closed: a missing/malformed checkpoint field must never silently
  // count as "passed" -- absence is treated the same as an explicit failure.
  const mechanism = (response.mechanism ?? '').trim();
  const mechanismIsThematicOnly = response.mechanismIsThematicOnly === true;
  const swapTestPassed = response.swapTestPassed === true;
  const resultIsGenericWord = response.resultIsGenericWord === true;
  const commonlyKnown = response.commonlyKnown === true;
  const tierEarned = response.tierEarned === true;

  const verdict: JudgeVerdict = {
    mechanism,
    mechanismIsThematicOnly,
    swapTestPassed,
    resultIsGenericWord,
    commonlyKnown,
    tierEarned,
    approved: response.approved,
    resultName: response.resultName ?? null,
    resultEmoji: response.resultEmoji ?? null,
    resultRarity: response.resultRarity ?? null,
    reasoning: response.reasoning ?? 'No reasoning provided',
    needsAdditionalIngredient: response.needsAdditionalIngredient ?? null,
    overriddenByGuardrail: null
  };

  // Deterministic guardrail: never allow a no-op result, even if the model's
  // own reasoning missed it -- the reuse-existing-element rule must never
  // apply to an ingredient of this exact combination (rules 4/5 above).
  const isNoOp = verdict.resultName
    ? ingredients.some(el => el.name.toLowerCase() === verdict.resultName!.toLowerCase())
    : false;

  if (isNoOp) {
    return {
      ...verdict,
      approved: false,
      resultName: null,
      resultEmoji: null,
      resultRarity: null,
      reasoning: `Rejected: result "${verdict.resultName}" is identical to one of the ingredients (no-op combination).`,
      needsAdditionalIngredient: null,
      overriddenByGuardrail: 'no-op'
    };
  }

  // Deterministic guardrail: never trust the model's own "approved" gate over
  // its own self-graded checkpoints -- if it answered them honestly but then
  // approved anyway, override in code rather than relying on it to have
  // obeyed its own instruction that approval requires all six to pass.
  const mechanismMissing = mechanism.length < 8 || mechanism.toLowerCase() === 'none';
  const checkpointFailed = mechanismMissing || mechanismIsThematicOnly || !swapTestPassed || resultIsGenericWord || !commonlyKnown || !tierEarned;

  if (verdict.approved && checkpointFailed) {
    const failedChecks = [
      mechanismMissing && 'no specific mechanism stated',
      mechanismIsThematicOnly && 'connection self-flagged as thematic/poetic, not causal',
      !swapTestPassed && 'failed the swap test',
      resultIsGenericWord && 'result self-flagged as a generic/thin word',
      !commonlyKnown && 'result self-flagged as not commonly known',
      !tierEarned && 'rarity self-flagged as not earned by these ingredients own scale'
    ].filter(Boolean).join('; ');

    return {
      ...verdict,
      approved: false,
      resultName: null,
      resultEmoji: null,
      resultRarity: null,
      reasoning: `Rejected by checkpoint guardrail (model approved despite failing its own self-graded checks: ${failedChecks}). Raw mechanism claim: "${mechanism || '(none given)'}"`,
      needsAdditionalIngredient: null,
      overriddenByGuardrail: 'checkpoint'
    };
  }

  return verdict;
};

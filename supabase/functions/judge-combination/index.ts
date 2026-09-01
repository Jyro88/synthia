// Live Judge Edge Function -- evaluates a brand-new Canvas (2-ingredient)
// combination the way scripts/populate/run.ts does for the offline batch
// pipeline, but for a single player-triggered request. Reuses the exact same
// prompt/schema/guardrail logic from shared/judge/core.ts so live play is held
// to the same bar as the pre-populated content.
//
// Cost/concurrency design (see plan for full rationale):
// - Cache check up front: a combination already in `recipes` costs zero LLM calls.
// - `combination_attempts.ingredient_key` UNIQUE constraint is the concurrency
//   lock -- if two players race the same new combo, only one calls Gemini; the
//   other polls briefly for that result instead of firing a duplicate call.
// - A soft per-user rate limit (`judge_rate_limits`) caps novel-combination
//   evaluations per user per time window.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buildPrompt, applyGuardrails, JUDGE_RESPONSE_SCHEMA, type ElementRow, type RawJudgeResponse } from '../../../shared/judge/core.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

// Same pinned models/endpoints as scripts/populate/gemini.ts -- see that
// file's comment for why not the "-latest" aliases.
const GEMINI_ENDPOINTS = [
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface GeminiApiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

const callGemini = async (prompt: string, responseSchema: object, apiKey: string): Promise<unknown> => {
  for (const endpoint of GEMINI_ENDPOINTS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      let response: Response;
      try {
        response = await fetch(`${endpoint}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json',
              responseSchema
            }
          })
        });
      } catch (error) {
        console.error(`Gemini request failed (${endpoint}):`, error);
        break;
      }

      if (response.status === 429) {
        const backoffMs = 1000 * 2 ** attempt;
        console.warn(`Rate limited by ${endpoint}, retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
        continue;
      }

      if (!response.ok) {
        console.error(`Gemini endpoint failed (${endpoint}):`, response.status, await response.text());
        break;
      }

      const data = await response.json() as GeminiApiResponse;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.error('Gemini response missing text content:', JSON.stringify(data));
        return null;
      }

      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      try {
        return JSON.parse(jsonText.trim());
      } catch (error) {
        console.error('Failed to parse Gemini JSON response:', jsonText, error);
        return null;
      }
    }
  }

  console.error('All Gemini endpoints failed.');
  return null;
};

const buildIngredientKey = (elementIds: string[]): string => [...elementIds].sort().join('+');

const slugify = (name: string): string =>
  name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const CLAIM_POLL_ATTEMPTS = 10;
const CLAIM_POLL_INTERVAL_MS = 400;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let body: { elementIds?: string[]; userId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { elementIds, userId } = body;
  if (!Array.isArray(elementIds) || elementIds.length !== 2 || !userId) {
    return json({ error: 'elementIds (array of 2) and userId are required' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const ingredientKey = buildIngredientKey(elementIds);

  const fetchResultElement = async (resultId: string): Promise<ElementRow | null> => {
    const { data } = await supabase
      .from('elements')
      .select('id, name, emoji, rarity')
      .eq('id', resultId)
      .single();
    return data;
  };

  // 1. Cache check -- closes the race where two players both miss the
  // client-side findRecipe() check within moments of each other, and covers
  // the normal case where this combination is already known.
  const { data: cachedRecipe } = await supabase
    .from('recipes')
    .select('result')
    .eq('ingredient_key', ingredientKey)
    .maybeSingle();

  if (cachedRecipe) {
    const element = await fetchResultElement(cachedRecipe.result);
    return json({ approved: true, element, isNew: false });
  }

  // 2. Soft per-user rate limit -- a client-generated id (see src/services/user.ts),
  // so this deters casual spam, not a determined abuser. Acceptable for v1.
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count: recentCount } = await supabase
    .from('judge_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStart);

  if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
    return json({ approved: false, reasoning: 'Too many new discoveries attempted recently. Try again in a few minutes.' }, 429);
  }

  // 3. Claim the attempt -- ingredient_key's UNIQUE constraint is the
  // concurrency lock, same mechanism the offline batch pipeline uses.
  const { data: claim, error: claimError } = await supabase
    .from('combination_attempts')
    .insert({ ingredient_key: ingredientKey })
    .select('id')
    .single();

  if (claimError) {
    if (claimError.code !== '23505') {
      console.error('Failed to claim attempt:', claimError.message);
      return json({ approved: false, reasoning: 'Something went wrong. Try again.' }, 500);
    }

    // Someone else is already evaluating this exact combination -- poll
    // briefly for their result instead of firing a duplicate LLM call.
    for (let i = 0; i < CLAIM_POLL_ATTEMPTS; i++) {
      await sleep(CLAIM_POLL_INTERVAL_MS);

      const { data: recipe } = await supabase
        .from('recipes')
        .select('result')
        .eq('ingredient_key', ingredientKey)
        .maybeSingle();
      if (recipe) {
        const element = await fetchResultElement(recipe.result);
        return json({ approved: true, element, isNew: false });
      }

      const { data: attempt } = await supabase
        .from('combination_attempts')
        .select('verdict, reasoning')
        .eq('ingredient_key', ingredientKey)
        .maybeSingle();
      if (attempt?.verdict === 'rejected') {
        return json({ approved: false, reasoning: attempt.reasoning });
      }
    }

    return json({ approved: false, reasoning: 'Still being evaluated. Try again in a moment.' });
  }

  const attemptId = claim.id as number;
  const releaseClaim = () => supabase.from('combination_attempts').delete().eq('id', attemptId);

  try {
    await supabase.from('judge_rate_limits').insert({ user_id: userId });

    const { data: knownElementsRaw } = await supabase.from('elements').select('id, name, emoji, rarity');
    const knownElements = (knownElementsRaw ?? []) as ElementRow[];
    const elementById = new Map(knownElements.map(el => [el.id, el]));

    const ingredients = elementIds.map(id => elementById.get(id)).filter((el): el is ElementRow => !!el);
    if (ingredients.length !== 2) {
      await releaseClaim();
      return json({ approved: false, reasoning: 'Unknown ingredient.' }, 400);
    }

    const { data: recipeRows } = await supabase.from('recipes').select('id, result');
    const { data: recipeIngredientRows } = await supabase.from('recipe_ingredients').select('recipe_id, element_id');
    const elementNameById = new Map(knownElements.map(el => [el.id, el.name]));
    const ingredientsByRecipe = new Map<number, string[]>();
    for (const row of recipeIngredientRows ?? []) {
      const list = ingredientsByRecipe.get(row.recipe_id) || [];
      list.push(row.element_id);
      ingredientsByRecipe.set(row.recipe_id, list);
    }

    const recipesByResultName = new Map<string, string[]>();
    const resultUsageCounts = new Map<string, number>();
    for (const recipe of recipeRows ?? []) {
      const resultName = elementNameById.get(recipe.result);
      if (!resultName) continue;
      const path = (ingredientsByRecipe.get(recipe.id) || []).map(id => elementNameById.get(id) || id).join(' + ');
      const list = recipesByResultName.get(resultName) || [];
      list.push(path);
      recipesByResultName.set(resultName, list);
      resultUsageCounts.set(resultName, (resultUsageCounts.get(resultName) || 0) + 1);
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;
    const rawResponse = await callGemini(
      buildPrompt(ingredients, knownElements, resultUsageCounts, recipesByResultName),
      JUDGE_RESPONSE_SCHEMA,
      geminiApiKey
    ) as RawJudgeResponse | null;

    const verdict = applyGuardrails(ingredients, rawResponse);

    if (!verdict) {
      await releaseClaim();
      return json({ approved: false, reasoning: 'The judge is unavailable right now. Try again shortly.' });
    }

    if (!verdict.approved || !verdict.resultName || !verdict.resultEmoji || !verdict.resultRarity) {
      await supabase.from('combination_attempts').update({
        verdict: 'rejected',
        reasoning: verdict.reasoning,
        needs_additional_ingredient: verdict.needsAdditionalIngredient
      }).eq('id', attemptId);
      return json({ approved: false, reasoning: verdict.reasoning });
    }

    // Reuse an existing element by name/slug (same rule as findOrCreateElement
    // in scripts/populate/db.ts) so multiple recipes can converge on one result.
    let resultElement = knownElements.find(el => el.name.toLowerCase() === verdict.resultName!.toLowerCase());
    let isNew = false;

    if (!resultElement) {
      let id = slugify(verdict.resultName);
      if (knownElements.some(el => el.id === id)) {
        let suffix = 2;
        while (knownElements.some(el => el.id === `${id}_${suffix}`)) suffix++;
        id = `${id}_${suffix}`;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('elements')
        .insert({ id, name: verdict.resultName, emoji: verdict.resultEmoji, rarity: verdict.resultRarity, discovery_count: 0 })
        .select('id, name, emoji, rarity')
        .single();

      if (insertError || !inserted) {
        console.error('Failed to create element:', insertError?.message);
        await releaseClaim();
        return json({ approved: false, reasoning: 'Something went wrong creating the result. Try again.' }, 500);
      }

      resultElement = inserted;
      isNew = true;
    }

    const { data: newRecipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({ ingredient_key: ingredientKey, result: resultElement.id, reasoning: verdict.reasoning, source: 'player_ai' })
      .select('id')
      .single();

    if (recipeError || !newRecipe) {
      console.error('Failed to insert recipe:', recipeError?.message);
      await releaseClaim();
      return json({ approved: false, reasoning: 'Something went wrong saving the result. Try again.' }, 500);
    }

    await supabase.from('recipe_ingredients').insert(
      [...new Set(elementIds)].map(elementId => ({ recipe_id: newRecipe.id, element_id: elementId }))
    );

    await supabase.from('combination_attempts').update({
      verdict: 'approved',
      result: resultElement.id,
      reasoning: verdict.reasoning
    }).eq('id', attemptId);

    return json({ approved: true, element: resultElement, isNew });
  } catch (error) {
    console.error('Unhandled error evaluating combination:', error);
    await releaseClaim();
    return json({ approved: false, reasoning: 'Something went wrong. Try again.' }, 500);
  }
});

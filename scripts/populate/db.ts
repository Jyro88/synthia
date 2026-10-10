import { supabase } from './env';
import type { ElementRow } from '../../shared/judge/core';

export type { ElementRow };

type SupabaseErrorLike = { code?: string; message?: string } | null;

const isTransientError = (error: SupabaseErrorLike): boolean => {
  if (!error) return false;
  if (error.code === '23505') return false; // real conflict ("already claimed") -- never retry, callers handle it as a normal outcome
  return true; // DNS blips, dropped connections, transient 5xx -- worth a retry
};

const RETRY_DELAYS_MS = [500, 1500, 3000];

// Wraps a single Supabase call with a few retries on transient failures.
// Without this, one network blip mid-run throws an uncaught error that kills
// the whole batch (all concurrent workers die together via Promise.all in
// run.ts) -- which has actually happened a couple of times on plain DNS
// hiccups, not real errors.
const withRetry = async <R extends { error: SupabaseErrorLike }>(fn: () => PromiseLike<R>): Promise<R> => {
  let result = await fn();
  for (let i = 0; i < RETRY_DELAYS_MS.length && isTransientError(result.error); i++) {
    console.warn(`Transient DB error, retrying in ${RETRY_DELAYS_MS[i]}ms: ${result.error?.message}`);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[i]));
    result = await fn();
  }
  return result;
};

export const getAllElements = async (): Promise<ElementRow[]> => {
  const { data, error } = await withRetry(() => supabase.from('elements').select('id, name, emoji, rarity'));
  if (error) {
    throw new Error(`Failed to load elements: ${error.message}`);
  }
  return data || [];
};

export interface RecipeSummary {
  resultId: string;
  ingredientIds: string[];
}

// Loads every approved recipe so the Judge can check precedent -- e.g. before
// converging a new pair onto an existing element, it can see how that element
// is already made and judge whether this new pair fits the same causal family.
export const getAllRecipes = async (): Promise<RecipeSummary[]> => {
  const { data: recipes, error: recipesError } = await withRetry(() => supabase.from('recipes').select('id, result'));
  if (recipesError) {
    throw new Error(`Failed to load recipes: ${recipesError.message}`);
  }

  const { data: ingredients, error: ingredientsError } = await withRetry(() => supabase
    .from('recipe_ingredients')
    .select('recipe_id, element_id'));
  if (ingredientsError) {
    throw new Error(`Failed to load recipe_ingredients: ${ingredientsError.message}`);
  }

  const ingredientsByRecipe = new Map<number, string[]>();
  for (const row of ingredients || []) {
    const list = ingredientsByRecipe.get(row.recipe_id) || [];
    list.push(row.element_id);
    ingredientsByRecipe.set(row.recipe_id, list);
  }

  return (recipes || []).map(r => ({
    resultId: r.result,
    ingredientIds: ingredientsByRecipe.get(r.id) || []
  }));
};

export const getAttemptedKeys = async (): Promise<Set<string>> => {
  const { data, error } = await withRetry(() => supabase.from('combination_attempts').select('ingredient_key'));
  if (error) {
    throw new Error(`Failed to load combination_attempts: ${error.message}`);
  }
  return new Set((data || []).map(row => row.ingredient_key));
};

// The UNIQUE constraint on ingredient_key is the concurrency lock: whichever
// worker's insert succeeds owns this candidate, everyone else moves on.
export const claimAttempt = async (ingredientKey: string): Promise<number | null> => {
  const { data, error } = await withRetry(() => supabase
    .from('combination_attempts')
    .insert({ ingredient_key: ingredientKey })
    .select('id')
    .single());

  if (error) {
    if (error.code === '23505') return null; // already claimed by another worker/run
    throw new Error(`Failed to claim attempt "${ingredientKey}": ${error.message}`);
  }

  return data.id;
};

const slugify = (name: string): string =>
  name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

// Reuses an existing element (matched by slug or case-insensitive name) so multiple
// recipes can point at the same result -- "multiple paths to the same thing" is
// intentional, not a bug.
export const findOrCreateElement = async (
  name: string,
  emoji: string,
  rarity: ElementRow['rarity'],
  knownElements: ElementRow[]
): Promise<ElementRow> => {
  const byName = knownElements.find(el => el.name.toLowerCase() === name.toLowerCase());
  if (byName) return byName;

  let id = slugify(name);
  const byId = knownElements.find(el => el.id === id);
  if (byId) return byId;

  if (knownElements.some(el => el.id === id)) {
    let suffix = 2;
    while (knownElements.some(el => el.id === `${id}_${suffix}`)) suffix++;
    id = `${id}_${suffix}`;
  }

  const { data, error } = await withRetry(() => supabase
    .from('elements')
    .insert({ id, name, emoji, rarity, discovery_count: 0 })
    .select('id, name, emoji, rarity')
    .single());

  if (error) {
    throw new Error(`Failed to create element "${name}": ${error.message}`);
  }

  return data;
};

// Called when the judge call itself failed (both Gemini endpoints exhausted) --
// deletes the claim so this candidate isn't permanently stuck at verdict=NULL
// and can be picked up again on a future run instead of silently vanishing.
export const releaseAttempt = async (attemptId: number): Promise<void> => {
  const { error } = await withRetry(() => supabase.from('combination_attempts').delete().eq('id', attemptId));
  if (error) {
    console.error(`Failed to release attempt ${attemptId}:`, error.message);
  }
};

export const finalizeApproved = async (
  attemptId: number,
  ingredientKey: string,
  elementIds: string[],
  resultId: string,
  reasoning: string
): Promise<void> => {
  const { data: recipe, error: recipeError } = await withRetry(() => supabase
    .from('recipes')
    .insert({ ingredient_key: ingredientKey, result: resultId, reasoning, source: 'bot' })
    .select('id')
    .single());

  if (recipeError) {
    throw new Error(`Failed to insert recipe "${ingredientKey}": ${recipeError.message}`);
  }

  const uniqueElementIds = [...new Set(elementIds)];
  const { error: ingredientsError } = await withRetry(() => supabase
    .from('recipe_ingredients')
    .insert(uniqueElementIds.map(elementId => ({ recipe_id: recipe.id, element_id: elementId }))));

  if (ingredientsError) {
    throw new Error(`Failed to insert recipe_ingredients for "${ingredientKey}": ${ingredientsError.message}`);
  }

  const { error: updateError } = await withRetry(() => supabase
    .from('combination_attempts')
    .update({ verdict: 'approved', result: resultId, reasoning })
    .eq('id', attemptId));

  if (updateError) {
    throw new Error(`Failed to finalize approved attempt ${attemptId}: ${updateError.message}`);
  }
};

export const finalizeRejected = async (
  attemptId: number,
  reasoning: string,
  needsAdditionalIngredient: string | null
): Promise<void> => {
  const { error } = await withRetry(() => supabase
    .from('combination_attempts')
    .update({ verdict: 'rejected', reasoning, needs_additional_ingredient: needsAdditionalIngredient })
    .eq('id', attemptId));

  if (error) {
    throw new Error(`Failed to finalize rejected attempt ${attemptId}: ${error.message}`);
  }
};

import type { ElementRow, RecipeSummary } from './db';

export const buildIngredientKey = (ids: string[]): string => [...ids].sort().join('+');

// Weighted random pick shared by both candidate pickers.
const weightedPick = <T,>(items: T[], weight: (item: T) => number): T | null => {
  if (items.length === 0) return null;
  const weights = items.map(weight);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
};

// How many distinct recipes each element already appears in, as an
// ingredient or a result. This is the graph-degree signal used to stop hub
// elements from snowballing (see pickCandidate below).
const computeDegree = (recipes: RecipeSummary[]): Map<string, number> => {
  const degree = new Map<string, number>();
  const bump = (id: string) => degree.set(id, (degree.get(id) || 0) + 1);
  for (const recipe of recipes) {
    bump(recipe.resultId);
    for (const ingredientId of recipe.ingredientIds) bump(ingredientId);
  }
  return degree;
};

export interface Candidate {
  elements: ElementRow[]; // 2 entries; the same element twice for a self-merge
  key: string;
}

// Picks a random not-yet-attempted pair (or self-merge), weighted away from
// elements that are already heavily attempted AND (more importantly) already
// heavily connected in the recipe graph.
//
// Attempt-count-only weighting isn't enough on its own: once a cluster of a
// few thematically-related elements exists (say, a dozen ruins/crypt-flavored
// results), the number of *untried internal pairs* within that cluster grows
// quadratically with its size, while a linear per-element discount only
// shrinks proportionally -- so the cluster keeps winning the random draw
// purely on candidate volume, and the whole run snowballs into one theme
// (this happened twice: once with geology, once with ruins/crypts). Degree
// (how many recipes an element already sits in) is weighted quadratically
// here specifically to counteract that -- it bites much harder than the
// linear attempt-count discount, actively favoring pairs that pull in a
// sparser, less-explored element instead of two already-dense hubs.
// anchorIds: elements whose weight gets boosted regardless of degree -- lets
// a branch keep periodically reaching back to root elements (Fire/Water/
// Earth/Air, typically) instead of only ever deepening whatever leaf cluster
// currently happens to be sparsest, which is its own snowball risk (a small
// pool of low-degree siblings just recombining with each other).
export const pickCandidate = (
  elements: ElementRow[],
  recipes: RecipeSummary[],
  attemptedKeys: Set<string>,
  anchorIds: Set<string> = new Set(),
  anchorBoost = 8
): Candidate | null => {
  const attemptCount = new Map<string, number>();
  for (const key of attemptedKeys) {
    for (const id of key.split('+')) {
      attemptCount.set(id, (attemptCount.get(id) || 0) + 1);
    }
  }
  const degree = computeDegree(recipes);
  const weightOf = (el: ElementRow) => {
    const base = 1 / (Math.pow(1 + (degree.get(el.id) || 0), 2) * (1 + (attemptCount.get(el.id) || 0)));
    return anchorIds.has(el.id) ? base * anchorBoost : base;
  };

  const candidates: Candidate[] = [];
  for (let i = 0; i < elements.length; i++) {
    for (let j = i; j < elements.length; j++) {
      const a = elements[i];
      const b = elements[j];
      const key = buildIngredientKey([a.id, b.id]);
      if (attemptedKeys.has(key)) continue;
      candidates.push({ elements: a.id === b.id ? [a, a] : [a, b], key });
    }
  }

  if (candidates.length === 0) return null;

  return weightedPick(candidates, c => c.elements.reduce((product, el) => product * weightOf(el), 1));
};

export interface MultiCandidate {
  elements: ElementRow[]; // 3-5 distinct entries
  key: string;
}

const MULTI_CANDIDATE_SIZES = [3, 4, 5];

// Multi-element combinations are a fundamentally different search problem
// than pairwise ones: at even a modest catalog size, the number of possible
// 3-5 element subsets is in the hundreds of thousands to millions (grows
// roughly as N^5), versus low hundreds for pairs. Exhaustively enumerating
// and weighting every subset (like pickCandidate does for pairs) is not
// feasible, and wouldn't even be desirable -- most random N-tuples have no
// coherent combined meaning, so blind sampling would mostly waste Judge
// calls on doomed candidates.
//
// Instead this builds a "relatedness" graph from existing recipes (any two
// elements that co-occurred in the same recipe -- as fellow ingredients, or
// as an ingredient and its result -- are graph neighbors), then grows each
// candidate as a connected cluster: pick a seed element, then repeatedly add
// a graph-neighbor of the group so far, falling back to a random unrelated
// element only if the neighborhood is exhausted. This biases toward
// thematically/causally connected sets (the same intuition a human designer
// would use -- "what already relates to what") without needing any
// semantic/embedding analysis, and keeps the candidate pool small and
// intentional rather than an exhaustive sweep of the whole combinatorial
// space.
const buildNeighborMap = (recipes: RecipeSummary[]): Map<string, Set<string>> => {
  const neighbors = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!neighbors.has(a)) neighbors.set(a, new Set());
    neighbors.get(a)!.add(b);
  };
  for (const recipe of recipes) {
    const group = [...recipe.ingredientIds, recipe.resultId];
    for (const a of group) {
      for (const b of group) {
        if (a !== b) link(a, b);
      }
    }
  }
  return neighbors;
};

export const pickMultiCandidate = (
  elements: ElementRow[],
  recipes: RecipeSummary[],
  attemptedKeys: Set<string>
): MultiCandidate | null => {
  if (elements.length < 3) return null;

  const neighborMap = buildNeighborMap(recipes);
  const byId = new Map(elements.map(el => [el.id, el]));

  const attemptCount = new Map<string, number>();
  for (const key of attemptedKeys) {
    for (const id of key.split('+')) {
      attemptCount.set(id, (attemptCount.get(id) || 0) + 1);
    }
  }
  const weightOf = (el: ElementRow) => 1 / (1 + (attemptCount.get(el.id) || 0));

  // A handful of retries absorbs the occasional already-attempted duplicate
  // without looping forever on a near-exhausted pool.
  for (let attempt = 0; attempt < 30; attempt++) {
    const size = MULTI_CANDIDATE_SIZES[Math.floor(Math.random() * MULTI_CANDIDATE_SIZES.length)];
    const seed = weightedPick(elements, weightOf);
    if (!seed) return null;

    const group = [seed];
    const groupIds = new Set([seed.id]);

    while (group.length < size) {
      const neighborPool: ElementRow[] = [];
      for (const memberId of groupIds) {
        for (const neighborId of neighborMap.get(memberId) ?? []) {
          if (!groupIds.has(neighborId)) {
            const el = byId.get(neighborId);
            if (el) neighborPool.push(el);
          }
        }
      }

      const pool = neighborPool.length > 0
        ? neighborPool
        : elements.filter(el => !groupIds.has(el.id));

      const next = weightedPick(pool, weightOf);
      if (!next) break; // catalog exhausted (only relevant for tiny catalogs)
      group.push(next);
      groupIds.add(next.id);
    }

    if (group.length < 3) continue;

    const key = buildIngredientKey(group.map(el => el.id));
    if (attemptedKeys.has(key)) continue;

    return { elements: group, key };
  }

  return null;
};

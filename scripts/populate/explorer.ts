import type { ElementRow } from './db';

export const buildIngredientKey = (ids: string[]): string => [...ids].sort().join('+');

export interface Candidate {
  elements: ElementRow[]; // 2 entries; the same element twice for a self-merge
  key: string;
}

// Picks a random not-yet-attempted pair (or self-merge), weighted toward elements
// that have been involved in fewer attempts so far -- favors breadth over
// repeatedly drilling into the same handful of elements as the pool grows.
export const pickCandidate = (
  elements: ElementRow[],
  attemptedKeys: Set<string>
): Candidate | null => {
  const attemptCount = new Map<string, number>();
  for (const key of attemptedKeys) {
    for (const id of key.split('+')) {
      attemptCount.set(id, (attemptCount.get(id) || 0) + 1);
    }
  }

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

  const weights = candidates.map(c => {
    const total = c.elements.reduce((sum, el) => sum + (attemptCount.get(el.id) || 0), 0);
    return 1 / (1 + total);
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i];
  }

  return candidates[candidates.length - 1];
};

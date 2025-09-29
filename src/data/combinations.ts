import type { Combination } from '../types';

// Combination recipes - only different elements can combine
export const combinations: Combination[] = [
  { elements: ['fire', 'water'], result: 'steam' },
  { elements: ['water', 'earth'], result: 'mud' },
  { elements: ['fire', 'earth'], result: 'lava' },
  { elements: ['fire', 'lava'], result: 'volcano' },
  { elements: ['steam', 'air'], result: 'cloud' },
  { elements: ['air', 'water'], result: 'rain' }
];

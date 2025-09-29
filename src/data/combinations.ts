import { Combination } from '../types';
import { ALL_ELEMENTS } from './elements';

// Combination recipes for the MVP
// TODO: Later expand this with AI-generated combinations or load from backend
export const COMBINATIONS: Combination[] = [
  // Two-element combinations
  {
    id: 'fire_water',
    elements: ['fire', 'water'],
    result: 'steam',
    description: 'Fire heats water to create steam',
    difficulty: 'easy',
  },
  {
    id: 'water_earth',
    elements: ['water', 'earth'],
    result: 'mud',
    description: 'Water mixes with earth to create mud',
    difficulty: 'easy',
  },
  {
    id: 'fire_earth',
    elements: ['fire', 'earth'],
    result: 'lava',
    description: 'Fire melts earth to create lava',
    difficulty: 'medium',
  },
  {
    id: 'earth_air',
    elements: ['earth', 'air'],
    result: 'dust',
    description: 'Air blows earth particles to create dust',
    difficulty: 'easy',
  },
  {
    id: 'water_air',
    elements: ['water', 'air'],
    result: 'rain',
    description: 'Water condenses in air to create rain',
    difficulty: 'medium',
  },
  {
    id: 'steam_air',
    elements: ['steam', 'air'],
    result: 'cloud',
    description: 'Steam cools in air to create clouds',
    difficulty: 'medium',
  },
  
  // Three-element combinations
  {
    id: 'fire_earth_water',
    elements: ['fire', 'earth', 'water'],
    result: 'volcano',
    description: 'Fire, earth, and water create a volcanic eruption',
    difficulty: 'hard',
  },
  {
    id: 'steam_earth_fire',
    elements: ['steam', 'earth', 'fire'],
    result: 'geyser',
    description: 'Steam trapped under earth with fire creates a geyser',
    difficulty: 'hard',
  },
];

// Helper function to find combination by element IDs
export const findCombination = (elementIds: string[]): Combination | undefined => {
  // Sort the input array to match the stored combinations
  const sortedIds = [...elementIds].sort();
  
  return COMBINATIONS.find(combination => {
    const sortedCombinationElements = [...combination.elements].sort();
    return JSON.stringify(sortedIds) === JSON.stringify(sortedCombinationElements);
  });
};

// Helper function to get all possible combinations for a given set of elements
export const getPossibleCombinations = (elementIds: string[]): Combination[] => {
  return COMBINATIONS.filter(combination => {
    // Check if all elements in the combination are available in the input
    return combination.elements.every(elementId => elementIds.includes(elementId));
  });
};

// Helper function to get combinations that result in a specific element
export const getCombinationsForResult = (resultElementId: string): Combination[] => {
  return COMBINATIONS.filter(combination => combination.result === resultElementId);
};

// Helper function to validate if a combination attempt is valid
export const isValidCombination = (elementIds: string[]): boolean => {
  return findCombination(elementIds) !== undefined;
};

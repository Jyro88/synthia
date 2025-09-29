import { Element, Combination, CombinationAttempt } from '../types';
import { getElementById } from '../data/elements';
import { findCombination } from '../data/combinations';

/**
 * Core combination logic - pure functions that can be easily ported to React Native
 * TODO: Later integrate with AI-generated combinations or backend API
 */

/**
 * Attempts to combine selected elements
 * @param selectedElements - Array of elements to combine
 * @param maxElements - Maximum number of elements allowed in combination
 * @returns CombinationAttempt with result or validation info
 */
export const attemptCombination = (
  selectedElements: Element[],
  maxElements: number = 3
): CombinationAttempt => {
  // Validation
  if (selectedElements.length < 2) {
    return {
      selectedElements,
      isValid: false,
    };
  }

  if (selectedElements.length > maxElements) {
    return {
      selectedElements,
      isValid: false,
    };
  }

  // Get element IDs for combination lookup
  const elementIds = selectedElements.map(element => element.id);
  
  // Find matching combination
  const combination = findCombination(elementIds);
  
  if (!combination) {
    return {
      selectedElements,
      isValid: false,
    };
  }

  // Get the result element
  const resultElement = getElementById(combination.result);
  
  if (!resultElement) {
    return {
      selectedElements,
      isValid: false,
    };
  }

  return {
    selectedElements,
    isValid: true,
    result: resultElement,
  };
};

/**
 * Calculates the score for discovering a new element
 * @param element - The discovered element
 * @returns Score points based on rarity
 */
export const calculateDiscoveryScore = (element: Element): number => {
  const rarityMultipliers = {
    common: 10,
    uncommon: 25,
    rare: 50,
    epic: 100,
    legendary: 250,
  };

  return rarityMultipliers[element.rarity] || 10;
};

/**
 * Determines if a combination is possible with current discovered elements
 * @param combination - The combination to check
 * @param discoveredElementIds - Array of discovered element IDs
 * @returns Boolean indicating if combination is possible
 */
export const isCombinationPossible = (
  combination: Combination,
  discoveredElementIds: string[]
): boolean => {
  return combination.elements.every(elementId => 
    discoveredElementIds.includes(elementId)
  );
};

/**
 * Gets all possible combinations with current discovered elements
 * @param discoveredElementIds - Array of discovered element IDs
 * @returns Array of possible combinations
 */
export const getAvailableCombinations = (discoveredElementIds: string[]) => {
  const { COMBINATIONS } = require('../data/combinations');
  
  return COMBINATIONS.filter((combination: Combination) =>
    isCombinationPossible(combination, discoveredElementIds)
  );
};

/**
 * Generates a hint for the player about possible combinations
 * @param discoveredElementIds - Array of discovered element IDs
 * @returns String hint or null if no hints available
 */
export const generateHint = (discoveredElementIds: string[]): string | null => {
  const availableCombinations = getAvailableCombinations(discoveredElementIds);
  
  if (availableCombinations.length === 0) {
    return null;
  }

  // Pick a random combination for the hint
  const randomCombination = availableCombinations[
    Math.floor(Math.random() * availableCombinations.length)
  ];
  
  const elementNames = randomCombination.elements.map(id => {
    const element = getElementById(id);
    return element?.name || id;
  }).join(' + ');

  return `Try combining: ${elementNames}`;
};

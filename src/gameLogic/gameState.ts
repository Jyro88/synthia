import { GameState, Element } from '../types';
import { STORAGE_KEYS } from '../types';
import { ALL_ELEMENTS } from '../data/elements';
import { calculateDiscoveryScore } from './combinations';

/**
 * Game state management with localStorage persistence
 * TODO: Later integrate with backend for cross-device sync
 */

/**
 * Initial game state with basic elements discovered
 */
export const getInitialGameState = (): GameState => {
  const basicElements = ALL_ELEMENTS.filter(element => element.discovered);
  
  return {
    discoveredElements: basicElements.map(element => element.id),
    inventory: basicElements,
    combinations: [],
    score: 0,
  };
};

/**
 * Loads game state from localStorage
 * @returns GameState or initial state if none exists
 */
export const loadGameState = (): GameState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure we have all required fields
      return {
        ...getInitialGameState(),
        ...parsed,
        inventory: parsed.discoveredElements 
          ? parsed.discoveredElements.map((id: string) => 
              ALL_ELEMENTS.find(element => element.id === id)
            ).filter(Boolean)
          : getInitialGameState().inventory,
      };
    }
  } catch (error) {
    console.warn('Failed to load game state:', error);
  }
  
  return getInitialGameState();
};

/**
 * Saves game state to localStorage
 * @param gameState - Current game state
 */
export const saveGameState = (gameState: GameState): void => {
  try {
    // Only save essential data to minimize storage
    const dataToSave = {
      discoveredElements: gameState.discoveredElements,
      score: gameState.score,
      timestamp: Date.now(),
    };
    
    localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(dataToSave));
    localStorage.setItem(STORAGE_KEYS.DISCOVERED_ELEMENTS, JSON.stringify(gameState.discoveredElements));
  } catch (error) {
    console.warn('Failed to save game state:', error);
  }
};

/**
 * Adds a newly discovered element to the game state
 * @param element - The newly discovered element
 * @param currentState - Current game state
 * @returns Updated game state
 */
export const discoverElement = (element: Element, currentState: GameState): GameState => {
  // Check if already discovered
  if (currentState.discoveredElements.includes(element.id)) {
    return currentState;
  }

  const newState: GameState = {
    ...currentState,
    discoveredElements: [...currentState.discoveredElements, element.id],
    inventory: [...currentState.inventory, element],
    score: currentState.score + calculateDiscoveryScore(element),
  };

  saveGameState(newState);
  return newState;
};

/**
 * Resets the game state to initial state
 * @returns Fresh game state
 */
export const resetGameState = (): GameState => {
  const initialState = getInitialGameState();
  saveGameState(initialState);
  return initialState;
};

/**
 * Gets statistics about the current game progress
 * @param gameState - Current game state
 * @returns Object with progress statistics
 */
export const getGameStats = (gameState: GameState) => {
  const totalDiscoverable = ALL_ELEMENTS.filter(element => !element.discovered).length;
  const discovered = gameState.discoveredElements.length - 4; // Subtract basic elements
  const progressPercentage = Math.round((discovered / totalDiscoverable) * 100);
  
  const rarityCounts = gameState.inventory.reduce((acc, element) => {
    acc[element.rarity] = (acc[element.rarity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalElements: ALL_ELEMENTS.length,
    discoveredElements: gameState.discoveredElements.length,
    discoverableElements: totalDiscoverable,
    discoveredCount: discovered,
    progressPercentage,
    score: gameState.score,
    rarityBreakdown: rarityCounts,
  };
};

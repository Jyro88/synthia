import { useState, useEffect, useCallback } from 'react';
import { GameState, Element } from '../types';
import { loadGameState, saveGameState, discoverElement, getInitialGameState } from '../gameLogic/gameState';

/**
 * Custom hook for managing game state with localStorage persistence
 */
export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(getInitialGameState);
  const [isLoading, setIsLoading] = useState(true);

  // Load game state on mount
  useEffect(() => {
    const loadedState = loadGameState();
    setGameState(loadedState);
    setIsLoading(false);
  }, []);

  // Save game state whenever it changes
  useEffect(() => {
    if (!isLoading) {
      saveGameState(gameState);
    }
  }, [gameState, isLoading]);

  const addDiscoveredElement = useCallback((element: Element) => {
    setGameState(currentState => discoverElement(element, currentState));
  }, []);

  const resetGame = useCallback(() => {
    const initialState = getInitialGameState();
    setGameState(initialState);
  }, []);

  return {
    gameState,
    isLoading,
    addDiscoveredElement,
    resetGame,
  };
};

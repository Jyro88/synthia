import { useState, useCallback } from 'react';
import { Element, SelectionState } from '../types';

/**
 * Custom hook for managing element selection in the UI
 */
export const useElementSelection = (maxSelection: number = 3) => {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedElements: [],
    maxSelection,
  });

  const selectElement = useCallback((element: Element) => {
    setSelectionState(currentState => {
      // Don't add if already selected
      if (currentState.selectedElements.some(el => el.id === element.id)) {
        return currentState;
      }

      // Don't add if at max selection
      if (currentState.selectedElements.length >= currentState.maxSelection) {
        return currentState;
      }

      return {
        ...currentState,
        selectedElements: [...currentState.selectedElements, element],
      };
    });
  }, []);

  const deselectElement = useCallback((elementId: string) => {
    setSelectionState(currentState => ({
      ...currentState,
      selectedElements: currentState.selectedElements.filter(el => el.id !== elementId),
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionState(currentState => ({
      ...currentState,
      selectedElements: [],
    }));
  }, []);

  const toggleElement = useCallback((element: Element) => {
    setSelectionState(currentState => {
      const isSelected = currentState.selectedElements.some(el => el.id === element.id);
      
      if (isSelected) {
        return {
          ...currentState,
          selectedElements: currentState.selectedElements.filter(el => el.id !== element.id),
        };
      } else {
        // Don't add if at max selection
        if (currentState.selectedElements.length >= currentState.maxSelection) {
          return currentState;
        }

        return {
          ...currentState,
          selectedElements: [...currentState.selectedElements, element],
        };
      }
    });
  }, []);

  return {
    selectionState,
    selectElement,
    deselectElement,
    clearSelection,
    toggleElement,
  };
};

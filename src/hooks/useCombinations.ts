import { useState } from 'react';
import type { Element } from '../types';
import { combinations } from '../data/combinations';
import { allElements } from '../data/elements';

export const useCombinations = () => {
  const [discoveredElements, setDiscoveredElements] = useState<string[]>([
    'fire', 'water', 'earth'
  ]);

  const checkForCombinations = (targetElement: Element, elements: Element[]) => {
    // Find nearby elements (within 80px)
    const nearbyElements = elements.filter(el => {
      if (el.instanceId === targetElement.instanceId) return false;
      const distance = Math.sqrt(
        Math.pow(el.x - targetElement.x, 2) + Math.pow(el.y - targetElement.y, 2)
      );
      return distance < 80;
    });

    if (nearbyElements.length > 0) {
      // Try to combine with the closest element
      const closest = nearbyElements.reduce((closest, current) => {
        const closestDistance = Math.sqrt(
          Math.pow(closest.x - targetElement.x, 2) + Math.pow(closest.y - targetElement.y, 2)
        );
        const currentDistance = Math.sqrt(
          Math.pow(current.x - targetElement.x, 2) + Math.pow(current.y - targetElement.y, 2)
        );
        return currentDistance < closestDistance ? current : closest;
      });

      return attemptCombination(targetElement, closest, elements);
    }

    return null;
  };

  const attemptCombination = (
    element1: Element,
    element2: Element,
    allElementsOnCanvas: Element[]
  ) => {
    // Can't combine same element types
    if (element1.elementId === element2.elementId) {
      return null;
    }

    const sortedElements = [element1.elementId, element2.elementId].sort();
    const combination = combinations.find(combo => {
      const sortedCombo = [...combo.elements].sort();
      return JSON.stringify(sortedElements) === JSON.stringify(sortedCombo);
    });

    if (combination) {
      const resultElement = allElements.find(el => el.id === combination.result);
      
      if (resultElement) {
        const isNewDiscovery = !discoveredElements.includes(resultElement.id);
        
        if (isNewDiscovery) {
          setDiscoveredElements(prev => [...prev, resultElement.id]);
        }
        
        // Calculate midpoint between the two elements
        const midX = (element1.x + element2.x) / 2;
        const midY = (element1.y + element2.y) / 2;
        
        return {
          elementId: resultElement.id,
          name: resultElement.name,
          emoji: resultElement.emoji,
          rarity: resultElement.rarity,
          x: midX,
          y: midY,
          isNew: isNewDiscovery
        };
      }
    }

    return null;
  };

  const getDiscoveredElementsList = () => discoveredElements;

  return {
    checkForCombinations,
    getDiscoveredElementsList
  };
};
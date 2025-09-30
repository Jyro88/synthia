import { useState, useCallback } from 'react';
import type { Element } from '../types';
import { getElements } from '../services/elements';
import { findCombination } from '../services/combinations';

export const useCombinations = () => {
  const [discoveredElements, setDiscoveredElements] = useState<string[]>(['fire', 'water', 'earth', 'air']);

  const checkForCombinations = useCallback(async (
    targetElement: Element,
    allElements: Element[]
  ): Promise<Element | null> => {
    // Find nearby elements (within 80px)
    const nearbyElements = allElements.filter(el => {
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

      return await attemptCombination(targetElement, closest);
    }

    return null;
  }, []);

  const attemptCombination = useCallback(async (
    element1: Element, 
    element2: Element
  ): Promise<Element | null> => {
    // Can't combine same element types
    if (element1.elementId === element2.elementId) {
      return null;
    }

    try {
      // Query Supabase for the combination
      const combination = await findCombination(element1.elementId, element2.elementId);
      
      if (combination) {
        const elements = await getElements();
        const resultElement = elements.find(el => el.id === combination.result);
        
        if (resultElement) {
          const isNewDiscovery = !discoveredElements.includes(resultElement.id);
          
          if (isNewDiscovery) {
            setDiscoveredElements(prev => [...prev, resultElement.id]);
          }
          
          // Calculate midpoint between the two elements
          const midX = (element1.x + element2.x) / 2;
          const midY = (element1.y + element2.y) / 2;
          
          return {
            instanceId: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
    } catch (error) {
      console.error('Error checking combination in Supabase:', error);
    }

    return null;
  }, [discoveredElements]);

  const getDiscoveredElementsList = useCallback(() => discoveredElements, [discoveredElements]);

  return {
    checkForCombinations,
    getDiscoveredElementsList
  };
};

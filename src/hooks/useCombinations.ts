import { useState, useCallback } from 'react';
import type { Element } from '../types';
import { getElements } from '../services/elements';
import { findRecipe } from '../services/recipes';
import { recordUserDiscovery } from '../services/rarity';
import { evaluateCombinationLive, type LiveJudgeElement } from '../services/judge';

export const useCombinations = () => {
  const [discoveredElements, setDiscoveredElements] = useState<string[]>(['fire', 'water', 'earth', 'air']);

  // Shared by both the cache-hit and live-Judge paths below: turns a resolved
  // result element into a placed Element instance, tracking first-discovery
  // state and rarity stats the same way regardless of where the result came from.
  const buildResultElement = useCallback(async (
    resultElement: LiveJudgeElement,
    x: number,
    y: number
  ): Promise<Element> => {
    const isNewDiscovery = !discoveredElements.includes(resultElement.id);

    if (isNewDiscovery) {
      setDiscoveredElements(prev => [...prev, resultElement.id]);
    }

    // Sync with the AI-populated database: recording the discovery here
    // (not just when a fresh AI suggestion is approved) is what makes
    // rarity and "first discovery" stats reflect real play instead of
    // staying frozen at whatever the bot guessed when it seeded this recipe.
    await recordUserDiscovery(resultElement.id);

    return {
      instanceId: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      elementId: resultElement.id,
      name: resultElement.name,
      emoji: resultElement.emoji,
      rarity: resultElement.rarity,
      x,
      y,
      isNew: isNewDiscovery
    };
  }, [discoveredElements]);

  const attemptCombination = useCallback(async (
    element1: Element,
    element2: Element
  ): Promise<Element | null | 'FAILED_MERGE'> => {
    try {
      const ingredientIds: [string, string] = [element1.elementId, element2.elementId];
      const midX = (element1.x + element2.x) / 2;
      const midY = (element1.y + element2.y) / 2;

      const combination = await findRecipe(ingredientIds);
      if (combination) {
        const elements = await getElements();
        const resultElement = elements.find(el => el.id === combination.result);
        if (resultElement) {
          return await buildResultElement(resultElement, midX, midY);
        }
      }

      // No known recipe -- the live Judge evaluates it in the background using
      // the same rules as the offline batch pipeline. No popup, no manual
      // approval: this resolves automatically to either a new element or a
      // silent rejection (treated the same as a failed merge).
      const verdict = await evaluateCombinationLive(ingredientIds);
      if (verdict.approved) {
        return await buildResultElement(verdict.element, midX, midY);
      }

      return 'FAILED_MERGE';
    } catch (error) {
      console.error('Error checking combination in Supabase:', error);
      return 'FAILED_MERGE';
    }
  }, [buildResultElement]);

  const checkForCombinations = useCallback(async (
    targetElement: Element,
    allElements: Element[]
  ): Promise<Element | null | 'FAILED_MERGE'> => {
    // Find nearby elements (within 120px for easier merging)
    const nearbyElements = allElements.filter(el => {
      if (el.instanceId === targetElement.instanceId) return false;
      const distance = Math.sqrt(
        Math.pow(el.x - targetElement.x, 2) + Math.pow(el.y - targetElement.y, 2)
      );
      return distance < 120;
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
  }, [attemptCombination]);

  const getDiscoveredElementsList = useCallback(() => discoveredElements, [discoveredElements]);

  return {
    checkForCombinations,
    attemptCombination,
    getDiscoveredElementsList
  };
};

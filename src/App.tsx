import React, { useState, useEffect, useCallback } from 'react';
import type { Element } from './types';
import { allElements } from './data/elements';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useCombinations } from './hooks/useCombinations';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';

function App() {
  const [elements, setElements] = useState<Element[]>([
    { instanceId: 'fire-1', elementId: 'fire', name: 'Fire', emoji: '🔥', x: 200, y: 150, rarity: 'common' },
    { instanceId: 'water-1', elementId: 'water', name: 'Water', emoji: '💧', x: 350, y: 200, rarity: 'common' },
    { instanceId: 'earth-1', elementId: 'earth', name: 'Earth', emoji: '🌍', x: 500, y: 180, rarity: 'common' }
  ]);

  const {
    handleCanvasMouseDown,
    handleSidebarMouseDown,
    updateElementPosition,
    stopDragging,
    getInstanceCounter,
    getDraggedElement,
    isDragging
  } = useDragAndDrop();

  const {
    checkForCombinations,
    getDiscoveredElementsList
  } = useCombinations();

  const handleCanvasElementMouseDown = useCallback((e: React.MouseEvent, instanceId: string) => {
    const element = elements.find(el => el.instanceId === instanceId);
    if (element) {
      handleCanvasMouseDown(e, instanceId, element);
    }
  }, [elements, handleCanvasMouseDown]);

  const handleSidebarElementMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    const elementDefinition = allElements.find(el => el.id === elementId);
    if (!elementDefinition) return;

    const newInstanceId = handleSidebarMouseDown(e, elementId, elementDefinition);
    
    // Create new instance from sidebar
    const newElement: Element = {
      instanceId: newInstanceId,
      elementId: elementId,
      name: elementDefinition.name,
      emoji: elementDefinition.emoji,
      rarity: elementDefinition.rarity,
      x: e.clientX,
      y: e.clientY
    };

    setElements(prev => [...prev, newElement]);
  }, [handleSidebarMouseDown]);

  // Global mouse event listeners for smooth dragging
  useEffect(() => {
    if (!isDragging()) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      updateElementPosition(elements, setElements, e);
    };

    const handleGlobalMouseUp = () => {
      const draggedElementId = getDraggedElement();
      if (!draggedElementId) {
        stopDragging();
        return;
      }

      const draggedEl = elements.find(el => el.instanceId === draggedElementId);
      if (draggedEl) {
        const result = checkForCombinations(draggedEl, elements);
        
        if (result) {
          // Find the element that was combined with
          const nearbyElements = elements.filter(el => {
            if (el.instanceId === draggedEl.instanceId) return false;
            const distance = Math.sqrt(
              Math.pow(el.x - draggedEl.x, 2) + Math.pow(el.y - draggedEl.y, 2)
            );
            return distance < 80;
          });

          if (nearbyElements.length > 0) {
            const closest = nearbyElements[0];
            
            // Remove the two combined elements and add the result
            setElements(prev => [
              ...prev.filter(el => 
                el.instanceId !== draggedEl.instanceId && 
                el.instanceId !== closest.instanceId
              ),
              {
                instanceId: `${result.elementId}-${getInstanceCounter()}`,
                elementId: result.elementId,
                name: result.name,
                emoji: result.emoji,
                rarity: result.rarity,
                x: result.x,
                y: result.y,
                isNew: result.isNew
              }
            ]);

            // Remove the "new" flag after animation
            if (result.isNew) {
              setTimeout(() => {
                setElements(prev => prev.map(el => ({ ...el, isNew: false })));
              }, 1000);
            }
          }
        }
      }
      stopDragging();
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging(), elements, getDraggedElement, getInstanceCounter, checkForCombinations, updateElementPosition, stopDragging, setElements]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex">
      <div className="flex-1 relative">
        <Canvas
          elements={elements}
          draggedElement={getDraggedElement()}
          onElementMouseDown={handleCanvasElementMouseDown}
        />
      </div>

      <Sidebar
        discoveredElements={allElements.filter(el => getDiscoveredElementsList().includes(el.id))}
        totalElements={allElements.length}
        elementsOnCanvas={elements.length}
        onElementMouseDown={handleSidebarElementMouseDown}
      />
    </div>
  );
}

export default App;
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Element } from './types';
import { getElements } from './services/elements';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useCombinations } from './hooks/useCombinations';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';

function App() {
  const [elements, setElements] = useState<Element[]>([
    { instanceId: 'fire-1', elementId: 'fire', name: 'Fire', emoji: '🔥', x: 200, y: 150, rarity: 'common' },
    { instanceId: 'water-1', elementId: 'water', name: 'Water', emoji: '💧', x: 350, y: 200, rarity: 'common' },
    { instanceId: 'earth-1', elementId: 'earth', name: 'Earth', emoji: '🌍', x: 500, y: 180, rarity: 'common' },
    { instanceId: 'air-1', elementId: 'air', name: 'Air', emoji: '💨', x: 300, y: 300, rarity: 'common' }
  ]);
  const [allElements, setAllElements] = useState<any[]>([]);

  const finalMousePosition = useRef({ x: 0, y: 0 });
  const startPosition = useRef({ x: 0, y: 0 });
  const [tempDragElement, setTempDragElement] = useState<Element | null>(null);

  const {
    handleCanvasMouseDown,
    handleSidebarMouseDown,
    updateElementPosition,
    stopDragging,
    getInstanceCounter,
    getDraggedElement,
    isDragging,
    wasDragging,
    getDragState
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

    // Capture start position for drag threshold detection
    startPosition.current = { x: e.clientX, y: e.clientY };

    // Just start the drag tracking, don't create element yet
    handleSidebarMouseDown(e, elementId, elementDefinition);
  }, [handleSidebarMouseDown]);

  const clearCanvas = useCallback(() => {
    setElements([]);
  }, []);

  // Fetch all elements on mount
  useEffect(() => {
    const fetchElements = async () => {
      const elements = await getElements();
      setAllElements(elements);
    };
    fetchElements();
  }, []);

  // Global mouse event listeners for smooth dragging
  useEffect(() => {
    if (!isDragging()) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      finalMousePosition.current = { x: e.clientX, y: e.clientY };
      
      const dragState = getDragState();
      if (dragState.draggedElement && dragState.isFromSidebar && dragState.draggedElementData) {
        // Only update if we're actually dragging (moved past threshold)
        const deltaX = Math.abs(e.clientX - startPosition.current.x);
        const deltaY = Math.abs(e.clientY - startPosition.current.y);
        
        if (deltaX > 5 || deltaY > 5) {
          // Create temporary drag element that follows mouse cursor directly
          // Offset by half element size to center it on cursor
          const elementWidth = 150;
          const elementHeight = 80;
          const offsetX = elementWidth / 2;
          const offsetY = elementHeight / 2;
          
          const newX = e.clientX - offsetX;
          const newY = e.clientY - offsetY;
          
          setTempDragElement(prev => {
            // Only update if position actually changed to avoid unnecessary re-renders
            if (!prev || prev.x !== newX || prev.y !== newY) {
              return {
                instanceId: dragState.draggedElement!,
                elementId: dragState.draggedElementData.id,
                name: dragState.draggedElementData.name,
                emoji: dragState.draggedElementData.emoji,
                rarity: dragState.draggedElementData.rarity,
                x: newX,
                y: newY
              };
            }
            return prev;
          });
        }
      }
      
      updateElementPosition(elements, setElements, e);
    };

    const handleGlobalMouseUp = async () => {
      const draggedElementId = getDraggedElement();
      if (!draggedElementId) {
        stopDragging();
        return;
      }

      // Check if this was a click (not a drag) - element doesn't exist on canvas yet
      const draggedEl = elements.find(el => el.instanceId === draggedElementId);
      
      if (!draggedEl) {
        // This was a sidebar interaction - create element
        const elementDefinition = allElements.find(el => el.id === draggedElementId.split('-')[0]);
        if (elementDefinition) {
          const sidebarWidth = 320; // Width of the sidebar (w-80 = 320px)
          const canvasWidth = window.innerWidth - sidebarWidth;
          
          let finalX, finalY;
          
          if (wasDragging()) {
            // Use the final drag position (centered on cursor, constrained to canvas)
            const elementWidth = 150;
            const elementHeight = 80;
            const offsetX = elementWidth / 2;
            const offsetY = elementHeight / 2;
            
            finalX = Math.max(0, Math.min(canvasWidth - elementWidth, finalMousePosition.current.x - offsetX));
            finalY = Math.max(0, Math.min(window.innerHeight - elementHeight, finalMousePosition.current.y - offsetY));
          } else {
            // Click - use random position
            finalX = Math.random() * (canvasWidth - 200) + 100;
            finalY = Math.random() * (window.innerHeight - 150) + 75;
          }

          const newElement: Element = {
            instanceId: draggedElementId,
            elementId: elementDefinition.id,
            name: elementDefinition.name,
            emoji: elementDefinition.emoji,
            rarity: elementDefinition.rarity,
            x: finalX,
            y: finalY
          };

          setElements(prev => [...prev, newElement]);
        }
      } else {
        // This was a drag - only check for combinations if we actually dragged (not just clicked)
        if (wasDragging()) {
          const result = await checkForCombinations(draggedEl, elements);
          
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
        // If it was just a click (not a drag), don't check for combinations
      }
      
      // Clear temporary drag element
      setTempDragElement(null);
      stopDragging();
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging(), elements, getDraggedElement, getInstanceCounter, checkForCombinations, updateElementPosition, stopDragging, getDragState]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex relative overflow-hidden">
      
      <div className="flex-1 relative z-10">
        <Canvas
          elements={elements}
          draggedElement={getDraggedElement()}
          onElementMouseDown={handleCanvasElementMouseDown}
          onClearCanvas={clearCanvas}
          tempDragElement={tempDragElement}
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
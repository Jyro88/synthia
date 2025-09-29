import { useState, useRef } from 'react';
import type { Element } from '../types';

interface DragState {
  draggedElement: string | null;
  dragOffset: { x: number; y: number };
}

export const useDragAndDrop = () => {
  const [dragState, setDragState] = useState<DragState>({
    draggedElement: null,
    dragOffset: { x: 0, y: 0 }
  });
  
  const instanceCounter = useRef(3);

  const handleCanvasMouseDown = (
    e: React.MouseEvent, 
    instanceId: string, 
    element: Element
  ) => {
    setDragState(prev => ({
      ...prev,
      dragOffset: {
        x: e.clientX - element.x,
        y: e.clientY - element.y
      },
      draggedElement: instanceId
    }));

    e.preventDefault();
    e.stopPropagation();
  };

  const handleSidebarMouseDown = (
    e: React.MouseEvent, 
    elementId: string,
    _elementDefinition: any
  ) => {
    instanceCounter.current += 1;
    const newInstanceId = `${elementId}-${instanceCounter.current}`;
    
    setDragState(prev => ({
      ...prev,
      dragOffset: { x: 0, y: 0 },
      draggedElement: newInstanceId
    }));

    e.preventDefault();
    e.stopPropagation();
    
    return newInstanceId;
  };

  const updateElementPosition = (
    _elements: Element[],
    setElements: React.Dispatch<React.SetStateAction<Element[]>>,
    e: MouseEvent
  ) => {
    if (!dragState.draggedElement) return;

    const newX = e.clientX - dragState.dragOffset.x;
    const newY = e.clientY - dragState.dragOffset.y;

    setElements(prev => prev.map(el => 
      el.instanceId === dragState.draggedElement 
        ? { ...el, x: newX, y: newY }
        : el
    ));
  };

  const stopDragging = () => {
    setDragState(prev => ({
      ...prev,
      draggedElement: null
    }));
  };

  const getInstanceCounter = () => instanceCounter.current;
  const getDraggedElement = () => dragState.draggedElement;
  const isDragging = () => dragState.draggedElement !== null;

  return {
    handleCanvasMouseDown,
    handleSidebarMouseDown,
    updateElementPosition,
    stopDragging,
    getInstanceCounter,
    getDraggedElement,
    isDragging
  };
};

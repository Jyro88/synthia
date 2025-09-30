import { useState, useRef } from 'react';
import type { Element } from '../types';

interface DragState {
  draggedElement: string | null;
  dragOffset: { x: number; y: number };
  isFromSidebar: boolean;
  draggedElementData: any;
}

export const useDragAndDrop = () => {
  const [dragState, setDragState] = useState<DragState>({
    draggedElement: null,
    dragOffset: { x: 0, y: 0 },
    isFromSidebar: false,
    draggedElementData: null
  });
  
  const instanceCounter = useRef(3);
  const dragThreshold = useRef(5); // Minimum pixels to move before considering it a drag
  const startPosition = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const handleCanvasMouseDown = (
    e: React.MouseEvent, 
    instanceId: string, 
    element: Element
  ) => {
    startPosition.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
    
    setDragState(prev => ({
      ...prev,
      dragOffset: {
        x: e.clientX - element.x,
        y: e.clientY - element.y
      },
      draggedElement: instanceId,
      isFromSidebar: false,
      draggedElementData: null
    }));

    e.preventDefault();
    e.stopPropagation();
  };

  const handleSidebarMouseDown = (
    e: React.MouseEvent, 
    elementId: string,
    elementDefinition: any
  ) => {
    startPosition.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
    
    instanceCounter.current += 1;
    const newInstanceId = `${elementId}-${instanceCounter.current}`;
    
    setDragState(prev => ({
      ...prev,
      dragOffset: { x: 0, y: 0 },
      draggedElement: newInstanceId,
      isFromSidebar: true,
      draggedElementData: elementDefinition
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

    // Check if we've moved enough to consider it a drag
    const deltaX = Math.abs(e.clientX - startPosition.current.x);
    const deltaY = Math.abs(e.clientY - startPosition.current.y);
    
    if (!isDraggingRef.current && (deltaX > dragThreshold.current || deltaY > dragThreshold.current)) {
      isDraggingRef.current = true;
    }

    // Only update position if we're actually dragging
    if (isDraggingRef.current) {
      const sidebarWidth = 320; // Width of the sidebar (w-80 = 320px)
      const canvasWidth = window.innerWidth - sidebarWidth;
      const elementWidth = 150; // Approximate element width
      const elementHeight = 80; // Approximate element height

      // Constrain to canvas bounds
      const newX = Math.max(0, Math.min(canvasWidth - elementWidth, e.clientX - dragState.dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - elementHeight, e.clientY - dragState.dragOffset.y));

      // Check if element exists on canvas (for sidebar drags, it might not exist yet)
      const existingElement = _elements.find(el => el.instanceId === dragState.draggedElement);
      
      if (existingElement) {
        // Update existing element position
        setElements(prev => prev.map(el => 
          el.instanceId === dragState.draggedElement 
            ? { ...el, x: newX, y: newY }
            : el
        ));
      }
      // If element doesn't exist yet, we'll create it on mouse up with the final position
    }
  };

  const stopDragging = () => {
    setDragState(prev => ({
      ...prev,
      draggedElement: null,
      isFromSidebar: false,
      draggedElementData: null
    }));
    isDraggingRef.current = false;
  };

  const getInstanceCounter = () => instanceCounter.current;
  const getDraggedElement = () => dragState.draggedElement;
  const isDragging = () => dragState.draggedElement !== null;
  const wasDragging = () => isDraggingRef.current;
  const getDragState = () => dragState;

  return {
    handleCanvasMouseDown,
    handleSidebarMouseDown,
    updateElementPosition,
    stopDragging,
    getInstanceCounter,
    getDraggedElement,
    isDragging,
    wasDragging,
    getDragState
  };
};

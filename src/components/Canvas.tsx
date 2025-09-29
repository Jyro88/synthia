import React from 'react';
import type { Element } from '../types';
import { CanvasElement } from './CanvasElement';
import { Instructions } from './Instructions';

interface CanvasProps {
  elements: Element[];
  draggedElement: string | null;
  onElementMouseDown: (e: React.MouseEvent, instanceId: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  elements,
  draggedElement,
  onElementMouseDown
}) => {
  return (
    <div className="w-full h-screen relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {Array.from({ length: 50 }, (_, i) => (
          <div
            key={`bg-dot-${i}`}
            className="absolute w-1 h-1 bg-purple-300 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Elements on canvas */}
      {elements.map(element => (
        <CanvasElement
          key={element.instanceId}
          element={element}
          isDragged={draggedElement === element.instanceId}
          onMouseDown={onElementMouseDown}
        />
      ))}

      {/* Instructions overlay */}
      <Instructions />
    </div>
  );
};

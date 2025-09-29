import React from 'react';
import type { Element } from '../types';

interface CanvasElementProps {
  element: Element;
  isDragged: boolean;
  onMouseDown: (e: React.MouseEvent, instanceId: string) => void;
}

export const CanvasElement: React.FC<CanvasElementProps> = ({
  element,
  isDragged,
  onMouseDown
}) => {
  return (
    <div
      className={`absolute select-none ${
        element.isNew ? 'duration-500 animate-pulse' : ''
      } ${
        isDragged 
          ? 'z-50 scale-110 rotate-2 cursor-grabbing' 
          : 'z-10 hover:scale-105 cursor-pointer'
      }`}
      style={{
        left: `${element.x}px`,
        top: `${element.y}px`,
        transition: isDragged ? 'none' : 'transform 0.2s, box-shadow 0.2s'
      }}
      onMouseDown={(e) => onMouseDown(e, element.instanceId)}
    >
      <div className={`bg-white rounded-xl border-2 px-4 py-2 flex items-center gap-2 transition-all ${
        isDragged 
          ? 'shadow-2xl border-purple-400' 
          : 'shadow-md hover:shadow-xl border-gray-200 hover:border-purple-300'
      }`}>
        <span className="text-2xl pointer-events-none">{element.emoji}</span>
        <span className="font-semibold text-gray-800 pointer-events-none">{element.name}</span>
      </div>
    </div>
  );
};

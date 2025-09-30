import React from 'react';
import type { Element } from '../types';
import { CanvasElement } from './CanvasElement';
import { Instructions } from './Instructions';

interface CanvasProps {
  elements: Element[];
  draggedElement: string | null;
  onElementMouseDown: (e: React.MouseEvent, instanceId: string) => void;
  onClearCanvas: () => void;
  tempDragElement: Element | null;
}

export const Canvas: React.FC<CanvasProps> = ({
  elements,
  draggedElement,
  onElementMouseDown,
  onClearCanvas,
  tempDragElement
}) => {
  return (
    <div className="w-full h-screen relative overflow-hidden">
      {/* Modern grid pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(168, 85, 247, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168, 85, 247, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
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

      {/* Temporary drag element from sidebar */}
      {tempDragElement && (
        <div
          key={tempDragElement.instanceId}
          className="absolute select-none z-50 scale-110 rotate-2 cursor-grabbing shadow-2xl shadow-purple-500/50 opacity-90"
          style={{
            left: `${tempDragElement.x}px`,
            top: `${tempDragElement.y}px`,
            transition: 'none' // No transitions for smooth dragging
          }}
        >
          <div className="bg-gradient-to-br from-purple-500/20 to-violet-600/20 backdrop-blur-md rounded-2xl border border-purple-400/30 px-4 py-3 flex items-center gap-3 shadow-lg">
            <div className="text-3xl pointer-events-none drop-shadow-lg">{tempDragElement.emoji}</div>
            <div className="pointer-events-none">
              <div className="font-bold text-white text-sm drop-shadow-md">{tempDragElement.name}</div>
              <div className="text-xs text-white/70 capitalize font-medium">{tempDragElement.rarity}</div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions overlay */}
      <Instructions 
        onClearCanvas={onClearCanvas} 
        elementCount={elements.length} 
      />
    </div>
  );
};

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
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-500/20 to-gray-600/20 border-gray-400/30';
      case 'uncommon': return 'from-green-500/20 to-emerald-600/20 border-green-400/30';
      case 'rare': return 'from-blue-500/20 to-cyan-600/20 border-blue-400/30';
      case 'epic': return 'from-purple-500/20 to-violet-600/20 border-purple-400/30';
      case 'legendary': return 'from-yellow-500/20 to-orange-600/20 border-yellow-400/30';
      default: return 'from-gray-500/20 to-gray-600/20 border-gray-400/30';
    }
  };

  return (
    <div
      className={`absolute select-none ${
        element.isNew ? 'duration-500 animate-pulse' : ''
      } ${
        isDragged 
          ? 'z-50 scale-110 rotate-2 cursor-grabbing shadow-2xl shadow-purple-500/50' 
          : 'z-10 hover:scale-105 cursor-pointer'
      }`}
      style={{
        left: `${element.x}px`,
        top: `${element.y}px`,
        transition: isDragged ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onMouseDown={(e) => onMouseDown(e, element.instanceId)}
    >
      <div className={`bg-gradient-to-br ${getRarityColor(element.rarity)} backdrop-blur-md rounded-2xl border px-4 py-3 flex items-center gap-3 transition-all shadow-lg ${
        isDragged 
          ? 'shadow-2xl shadow-purple-500/50 scale-110' 
          : 'hover:shadow-xl hover:shadow-white/20 hover:scale-105'
      }`}>
        <div className="text-3xl pointer-events-none drop-shadow-lg">{element.emoji}</div>
        <div className="pointer-events-none">
          <div className="font-bold text-white text-sm drop-shadow-md">{element.name}</div>
          <div className="text-xs text-white/70 capitalize font-medium">{element.rarity}</div>
        </div>
      </div>
    </div>
  );
};

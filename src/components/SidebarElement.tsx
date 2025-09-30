import React from 'react';
import type { ElementDefinition } from '../types';

interface SidebarElementProps {
  element: ElementDefinition;
  onMouseDown: (e: React.MouseEvent, elementId: string) => void;
}

export const SidebarElement: React.FC<SidebarElementProps> = ({
  element,
  onMouseDown
}) => {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-500/30 to-gray-600/30 border-gray-400/50';
      case 'uncommon': return 'from-green-500/30 to-emerald-600/30 border-green-400/50';
      case 'rare': return 'from-blue-500/30 to-cyan-600/30 border-blue-400/50';
      case 'epic': return 'from-purple-500/30 to-violet-600/30 border-purple-400/50';
      case 'legendary': return 'from-yellow-500/30 to-orange-600/30 border-yellow-400/50';
      default: return 'from-gray-500/30 to-gray-600/30 border-gray-400/50';
    }
  };

  return (
    <div
      onMouseDown={(e) => onMouseDown(e, element.id)}
      className={`w-full bg-gradient-to-br ${getRarityColor(element.rarity)} backdrop-blur-sm rounded-xl border px-4 py-3 shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer active:cursor-grabbing flex items-center gap-3 group hover:border-white/40`}
    >
      <div className="text-2xl group-hover:scale-110 transition-transform pointer-events-none drop-shadow-lg">
        {element.emoji}
      </div>
      <div className="flex-1 text-left pointer-events-none">
        <div className="font-bold text-white text-sm drop-shadow-md">{element.name}</div>
        <div className="text-xs text-white/70 capitalize font-medium">{element.rarity}</div>
      </div>
    </div>
  );
};

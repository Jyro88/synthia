import React from 'react';
import type { ElementDefinition } from '../types';
import { getRarityInfo } from '../services/rarity';

interface SidebarElementProps {
  element: ElementDefinition;
  onMouseDown: (e: React.MouseEvent, elementId: string) => void;
  onInfoClick?: (element: ElementDefinition) => void;
}

export const SidebarElement: React.FC<SidebarElementProps> = ({
  element,
  onMouseDown,
  onInfoClick
}) => {
  const rarityInfo = getRarityInfo(element.rarity);

  return (
    <div
      onMouseDown={(e) => onMouseDown(e, element.id)}
      className={`relative w-full bg-gradient-to-br ${rarityInfo.bgColor} rounded-xl border-2 px-4 py-3 shadow-sm hover:shadow-md hover:border-amber-300 transition-shadow cursor-pointer active:cursor-grabbing flex items-center gap-3 group`}
    >
      <div className="text-2xl pointer-events-none">
        {element.emoji}
      </div>
      <div className="flex-1 min-w-0 text-left pointer-events-none">
        <div className="font-display font-semibold text-ink-700 text-sm truncate">{element.name}</div>
        <div className={`text-xs capitalize font-medium ${rarityInfo.color}`}>{element.rarity}</div>
      </div>

      {onInfoClick && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onInfoClick(element);
          }}
          className="w-5 h-5 rounded-full bg-cream-50 border-2 border-ink-400/40 text-ink-500 text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-amber-100 hover:border-amber-400 hover:text-amber-700"
          title={`About ${element.name}`}
        >
          i
        </button>
      )}
    </div>
  );
};

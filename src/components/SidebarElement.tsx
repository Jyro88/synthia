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
  return (
    <div
      onMouseDown={(e) => onMouseDown(e, element.id)}
      className="w-full bg-gradient-to-r from-white to-gray-50 rounded-lg border-2 border-gray-200 px-4 py-3 shadow-sm hover:shadow-md hover:border-purple-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-white transition-all cursor-pointer active:cursor-grabbing flex items-center gap-3 group"
    >
      <span className="text-2xl group-hover:scale-110 transition-transform pointer-events-none">
        {element.emoji}
      </span>
      <div className="flex-1 text-left pointer-events-none">
        <div className="font-semibold text-gray-800">{element.name}</div>
        <div className="text-xs text-gray-500 capitalize">{element.rarity}</div>
      </div>
    </div>
  );
};

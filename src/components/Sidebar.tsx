import React from 'react';
import type { ElementDefinition } from '../types';
import { SidebarElement } from './SidebarElement';

interface SidebarProps {
  discoveredElements: ElementDefinition[];
  totalElements: number;
  elementsOnCanvas: number;
  onElementMouseDown: (e: React.MouseEvent, elementId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  discoveredElements,
  totalElements,
  elementsOnCanvas,
  onElementMouseDown
}) => {
  return (
    <div className="w-72 bg-white border-l border-gray-200 p-6 overflow-y-auto shadow-xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">🧪 Synthia</h2>
        <p className="text-sm text-gray-500">Element Crafting</p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700">Discovered Elements</h3>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
            {discoveredElements.length}/{totalElements}
          </span>
        </div>
        <div className="space-y-2">
          {discoveredElements.map(element => (
            <SidebarElement
              key={element.id}
              element={element}
              onMouseDown={onElementMouseDown}
            />
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1">
        <div className="flex justify-between">
          <span>Discoveries:</span>
          <span className="font-semibold">{discoveredElements.length}</span>
        </div>
        <div className="flex justify-between">
          <span>On canvas:</span>
          <span className="font-semibold">{elementsOnCanvas}</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import type { ElementDefinition } from '../types';
import { SidebarElement } from './SidebarElement';

interface SidebarProps {
  discoveredElements: ElementDefinition[];
  totalElements: number;
  elementsOnCanvas: number;
  onElementMouseDown: (e: React.MouseEvent, elementId: string) => void;
  onElementInfoClick?: (element: ElementDefinition) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  discoveredElements,
  totalElements,
  elementsOnCanvas,
  onElementMouseDown,
  onElementInfoClick
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredElements = discoveredElements.filter(element =>
    element.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="w-80 h-full flex flex-col bg-cream-50 border-l-2 border-cream-300 p-6 shadow-[-4px_0_16px_rgba(0,0,0,0.04)]">
      <div className="mb-6 flex-shrink-0">
        <h2 className="text-3xl font-display font-bold text-ink-700 mb-2">
          Synthia
        </h2>
        <p className="text-sm text-ink-500 font-medium">Your element collection</p>
      </div>

      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-sm font-display font-bold text-ink-600 uppercase tracking-wider">Elements</h3>
        <div className="bg-amber-100 border border-amber-300 rounded-full px-3 py-1">
          <span className="text-xs font-bold text-amber-700">
            {discoveredElements.length}/{totalElements}
          </span>
        </div>
      </div>

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search elements"
        className="w-full mb-4 px-4 py-2 rounded-xl border-2 border-cream-300 bg-cream-100 text-sm text-ink-700 placeholder:text-ink-400 focus:outline-none focus:border-amber-400 flex-shrink-0"
      />

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3 pr-1">
        {filteredElements.length === 0 && (
          <p className="text-sm text-ink-400 text-center mt-4">No elements found.</p>
        )}
        {filteredElements.map(element => (
          <SidebarElement
            key={element.id}
            element={element}
            onMouseDown={onElementMouseDown}
            onInfoClick={onElementInfoClick}
          />
        ))}
      </div>

      <div className="bg-cream-100 border-2 border-cream-300 rounded-2xl p-4 space-y-3 mt-6 flex-shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-sm text-ink-600 font-medium">Discoveries</span>
          <span className="font-display font-bold text-amber-600">
            {discoveredElements.length}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-ink-600 font-medium">Active</span>
          <span className="font-display font-bold text-amber-600">
            {elementsOnCanvas}
          </span>
        </div>
      </div>
    </div>
  );
};

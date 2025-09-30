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
    <div className="w-80 bg-black/20 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto shadow-2xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          ⚗️ Synthia
        </h2>
        <p className="text-sm text-white/70 font-medium">Element Synthesis Lab</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Elements</h3>
          <div className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1">
            <span className="text-xs font-bold text-white">
              {discoveredElements.length}/{totalElements}
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {discoveredElements.map(element => (
            <SidebarElement
              key={element.id}
              element={element}
              onMouseDown={onElementMouseDown}
            />
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-white/80 font-medium">Discoveries</span>
          <span className="font-bold text-white bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            {discoveredElements.length}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-white/80 font-medium">Active</span>
          <span className="font-bold text-white bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            {elementsOnCanvas}
          </span>
        </div>
      </div>
    </div>
  );
};

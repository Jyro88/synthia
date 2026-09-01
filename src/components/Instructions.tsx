import React from 'react';

interface InstructionsProps {
  onClearCanvas: () => void;
  elementCount: number;
}

export const Instructions: React.FC<InstructionsProps> = ({ onClearCanvas, elementCount }) => {
  return (
    <div className="absolute top-6 left-6 bg-cream-50 rounded-2xl p-6 shadow-md border-2 border-cream-300 max-w-sm">
      <div className="font-display font-bold text-ink-700 mb-3 text-xl">
        How to Synthesize
      </div>
      <div className="text-sm text-ink-600 space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
          <span>Drag elements from the lab panel</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-sky-400 rounded-full"></div>
          <span>Drop them near each other to combine</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-rose-400 rounded-full"></div>
          <span>Same elements won't synthesize</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
          <span>Discover new elements!</span>
        </div>
      </div>

      {elementCount > 0 && (
        <button
          onClick={onClearCanvas}
          className="w-full bg-rose-100 border-2 border-rose-300 rounded-xl px-4 py-2 text-sm font-display font-bold text-rose-700 hover:bg-rose-200 hover:border-rose-400 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          Clear Canvas ({elementCount})
        </button>
      )}
    </div>
  );
};

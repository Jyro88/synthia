import React from 'react';

interface InstructionsProps {
  onClearCanvas: () => void;
  elementCount: number;
}

export const Instructions: React.FC<InstructionsProps> = ({ onClearCanvas, elementCount }) => {
  return (
    <div className="absolute top-6 left-6 bg-black/30 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/20 max-w-sm">
      <div className="font-bold text-white mb-3 text-xl bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
        ⚡ How to Synthesize
      </div>
      <div className="text-sm text-white/80 space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
          <span>Drag elements from the lab panel</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
          <span>Drop them near each other to combine</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
          <span>Same elements won't synthesize</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
          <span>Discover new elements!</span>
        </div>
      </div>
      
      {elementCount > 0 && (
        <button
          onClick={onClearCanvas}
          className="w-full bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl px-4 py-2 text-sm font-bold text-white hover:from-red-500/30 hover:to-orange-500/30 hover:border-red-400/50 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          🗑️ Clear Canvas ({elementCount})
        </button>
      )}
    </div>
  );
};

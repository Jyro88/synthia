import React from 'react';

export const Instructions: React.FC = () => {
  return (
    <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-gray-200 max-w-xs pointer-events-none">
      <div className="font-bold text-gray-800 mb-2 text-lg">🎮 How to Play</div>
      <div className="text-sm text-gray-600 space-y-1">
        <div>• Drag elements from the sidebar</div>
        <div>• Drop them near each other to combine</div>
        <div>• Same elements don't combine!</div>
        <div>• Discover new elements!</div>
      </div>
    </div>
  );
};

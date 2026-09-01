import React from 'react';

interface WelcomeScreenProps {
  onStartPlaying: () => void;
  onLogin: () => void;
  onClose: () => void;
  isVisible: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onStartPlaying, 
  onLogin, 
  onClose,
  isVisible 
}) => {
  if (!isVisible) return null;

  const features = [
    'Discover new elements',
    'AI-powered combinations',
    'Dynamic rarity system',
    'Multi-element combinations',
    'Progress tracking',
    'Community leaderboards'
  ];

  return (
    <div className="fixed inset-0 bg-cream-100 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-cream-50 border-2 border-cream-300 text-ink-500 hover:bg-amber-100 hover:border-amber-400 hover:text-amber-700 transition-colors flex items-center justify-center z-10"
          title="Skip welcome screen"
        >
          ✕
        </button>

        <div className="bg-cream-50 rounded-3xl border-2 border-cream-300 shadow-xl max-w-2xl w-full p-8 text-center my-8">
        {/* Game Logo/Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold text-ink-700 mb-2">Welcome to Synthia</h1>
          <p className="text-lg text-ink-500">
            Discover the art of elemental combination
          </p>
        </div>

        {/* Game Description */}
        <div className="mb-6 space-y-4 text-ink-600">
          <p className="text-base">
            Combine elements to create new discoveries. Drag elements together and let the Judge suggest
            logical combinations based on science and nature.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-cream-100 border border-cream-300 rounded-xl p-3">
              <h3 className="font-display font-semibold text-ink-700 text-sm mb-1">Canvas Mode</h3>
              <p className="text-xs text-ink-500">Drag and drop elements to combine them</p>
            </div>

            <div className="bg-cream-100 border border-cream-300 rounded-xl p-3">
              <h3 className="font-display font-semibold text-ink-700 text-sm mb-1">Laboratory</h3>
              <p className="text-xs text-ink-500">Combine 3-5 elements for complex results</p>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-3 border border-amber-300">
            <h3 className="font-display font-semibold text-amber-700 text-sm mb-1">Dynamic Rarity System</h3>
            <p className="text-xs text-ink-600">
              Elements become more common as more players discover them. Be among the first to find legendary combinations.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={onStartPlaying}
            className="w-full bg-amber-400 hover:bg-amber-500 text-ink-800 font-display font-bold py-3 px-6 rounded-full shadow-sm transition-all duration-200"
          >
            Start Playing (Anonymous)
          </button>

          <button
            onClick={onLogin}
            className="w-full bg-emerald-400 hover:bg-emerald-500 text-white font-display font-semibold py-3 px-6 rounded-full shadow-sm transition-all duration-200"
          >
            Create Account & Save Progress
          </button>
        </div>

        {/* Features List */}
        <div className="pt-4 border-t border-cream-300">
          <h3 className="text-base font-display font-semibold text-ink-700 mb-3">What you can do</h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-ink-500 mb-4">
            {features.map(feature => (
              <div key={feature} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0"></div>
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="text-xs text-ink-400 mb-4">
            Your discoveries help determine element rarity for all players
          </div>

          <button
            onClick={onClose}
            className="text-ink-500 hover:text-ink-700 transition-colors text-sm underline"
          >
            Skip and start playing
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

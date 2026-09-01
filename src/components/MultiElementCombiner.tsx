import React from 'react';
import type { ElementDefinition } from '../types';
import { getRarityInfo } from '../services/rarity';

interface MultiElementCombinerProps {
  elements: ElementDefinition[];
  selectedElements: ElementDefinition[];
  onSelectElement: (element: ElementDefinition) => void;
  onGenerateCombination: () => void;
  isGenerating: boolean;
  feedbackMessage?: string | null;
}

export const MultiElementCombiner: React.FC<MultiElementCombinerProps> = ({
  elements,
  selectedElements,
  onSelectElement,
  onGenerateCombination,
  isGenerating,
  feedbackMessage
}) => {
  const canGenerate = selectedElements.length >= 3 && selectedElements.length <= 5;
  const isSelected = (element: ElementDefinition) => selectedElements.some(el => el.id === element.id);

  return (
    <div className="min-h-screen bg-cream-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-ink-700 mb-3">
            Laboratory
          </h1>
          <p className="text-ink-500 text-lg max-w-2xl mx-auto">
            Combine 3-5 elements to create complex, rarer discoveries. Multi-element combinations need careful planning.
          </p>
        </div>

        {/* Selected Elements Display */}
        <div className="bg-cream-50 rounded-2xl p-6 mb-8 border-2 border-cream-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-bold text-ink-700">
              Selected Elements
            </h2>
            <div className="bg-amber-100 border border-amber-300 rounded-full px-3 py-1">
              <span className="text-xs font-bold text-amber-700">{selectedElements.length}/5</span>
            </div>
          </div>

          {selectedElements.length === 0 ? (
            <div className="text-ink-400 text-center py-8">
              Click elements below to add them to your combination
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
              {selectedElements.map((element, index) => {
                const rarityInfo = getRarityInfo(element.rarity);
                return (
                  <div
                    key={element.id}
                    className={`bg-gradient-to-br ${rarityInfo.bgColor} rounded-xl border-2 p-4 text-center relative group shadow-sm`}
                  >
                    <div className="text-3xl mb-2">{element.emoji}</div>
                    <div className="font-display font-semibold text-ink-700 text-sm">{element.name}</div>
                    <div className={`text-xs capitalize font-medium ${rarityInfo.color}`}>{element.rarity}</div>

                    {/* Remove button */}
                    <button
                      onClick={() => onSelectElement(element)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-cream-50 border-2 border-rose-300 rounded-full flex items-center justify-center text-rose-500 text-xs hover:bg-rose-100 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ✕
                    </button>

                    {/* Index indicator */}
                    <div className="absolute top-2 left-2 w-6 h-6 bg-cream-50/90 border border-cream-300 rounded-full flex items-center justify-center text-ink-600 text-xs font-bold">
                      {index + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Generate Button */}
          <div className="text-center">
            <button
              onClick={onGenerateCombination}
              disabled={!canGenerate || isGenerating}
              className={`px-8 py-4 rounded-full font-display font-bold text-lg transition-all duration-200 ${
                canGenerate && !isGenerating
                  ? 'bg-emerald-400 hover:bg-emerald-500 text-white shadow-sm'
                  : 'bg-cream-200 text-ink-400 cursor-not-allowed'
              }`}
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  Checking...
                </div>
              ) : (
                canGenerate ? 'Generate Combination' : `Select ${3 - selectedElements.length} more elements`
              )}
            </button>
            {feedbackMessage && (
              <p className="text-sm text-ink-500 mt-3">{feedbackMessage}</p>
            )}
          </div>
        </div>

        {/* Available Elements */}
        <div className="bg-cream-50 rounded-2xl p-6 border-2 border-cream-300">
          <h2 className="text-xl font-display font-bold text-ink-700 mb-4">
            Available Elements
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {elements.map((element) => {
              const selected = isSelected(element);
              const canSelect = selectedElements.length < 5 || selected;
              const rarityInfo = getRarityInfo(element.rarity);

              return (
                <button
                  key={element.id}
                  onClick={() => onSelectElement(element)}
                  disabled={!canSelect}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                    selected
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300/50 scale-105 shadow-sm'
                      : canSelect
                      ? `bg-gradient-to-br ${rarityInfo.bgColor} hover:scale-105 hover:shadow-sm`
                      : 'bg-cream-100 border-cream-300 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="text-3xl mb-2">{element.emoji}</div>
                  <div className="font-display font-semibold text-sm text-ink-700">
                    {element.name}
                  </div>
                  <div className={`text-xs capitalize font-medium ${selected ? 'text-emerald-600' : rarityInfo.color}`}>
                    {element.rarity}
                  </div>

                  {selected && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-cream-50 rounded-2xl p-6 border-2 border-cream-300">
          <h3 className="text-lg font-display font-bold text-ink-700 mb-3">
            Combination Tips
          </h3>
          <ul className="text-ink-600 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 mt-2 bg-amber-400 rounded-full flex-shrink-0"></div>
              <span><strong>Think scientifically:</strong> consider real chemical reactions, biological processes, or technological creations.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 mt-2 bg-sky-400 rounded-full flex-shrink-0"></div>
              <span><strong>All elements matter:</strong> every element should contribute meaningfully to the result.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 mt-2 bg-emerald-400 rounded-full flex-shrink-0"></div>
              <span><strong>Higher rarity:</strong> multi-element combinations typically create rarer results.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 mt-2 bg-rose-400 rounded-full flex-shrink-0"></div>
              <span><strong>Be patient:</strong> combinations are checked against what's already been discovered. If it's not known yet, someone will have to find it first.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

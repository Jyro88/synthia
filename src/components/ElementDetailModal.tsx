import React, { useEffect, useState } from 'react';
import { getRecipesForResult, type RecipeDetail } from '../services/recipes';
import { getElement } from '../services/elements';
import { getRarityInfo } from '../services/rarity';
import type { ElementRecord } from '../lib/supabase';

interface ElementDetailModalProps {
  element: { id: string; name: string; emoji: string; rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' } | null;
  isVisible: boolean;
  onClose: () => void;
}

const BASE_ELEMENT_IDS = new Set(['fire', 'water', 'earth', 'air']);

const formatDate = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export const ElementDetailModal: React.FC<ElementDetailModalProps> = ({ element, isVisible, onClose }) => {
  const [recipes, setRecipes] = useState<RecipeDetail[]>([]);
  const [fullElement, setFullElement] = useState<ElementRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isVisible || !element) return;

    setIsLoading(true);
    Promise.all([
      BASE_ELEMENT_IDS.has(element.id) ? Promise.resolve([]) : getRecipesForResult(element.id),
      getElement(element.id)
    ])
      .then(([recipeData, elementData]) => {
        setRecipes(recipeData);
        setFullElement(elementData);
      })
      .finally(() => setIsLoading(false));
  }, [isVisible, element]);

  if (!isVisible || !element) return null;

  const rarityInfo = getRarityInfo(element.rarity);
  const isBaseElement = BASE_ELEMENT_IDS.has(element.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-800/30 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-cream-50 rounded-3xl border-2 border-cream-300 shadow-xl max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream-100 border-2 border-cream-300 text-ink-500 hover:bg-amber-100 hover:border-amber-400 hover:text-amber-700 transition-colors flex items-center justify-center"
        >
          ✕
        </button>

        <div className="flex flex-col items-center text-center mb-4">
          <div className="text-6xl mb-3">{element.emoji}</div>
          <h2 className="text-2xl font-display font-bold text-ink-700">{element.name}</h2>
          <span className={`mt-2 inline-block text-xs capitalize font-bold px-3 py-1 rounded-full bg-gradient-to-br ${rarityInfo.bgColor} border ${rarityInfo.color}`}>
            {element.rarity}
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="bg-cream-100 border border-cream-300 rounded-xl p-2.5 text-center">
            <div className="text-lg font-display font-bold text-ink-700">
              {fullElement ? fullElement.discovery_count : '—'}
            </div>
            <div className="text-[11px] text-ink-500">Discoveries</div>
          </div>
          <div className="bg-cream-100 border border-cream-300 rounded-xl p-2.5 text-center">
            <div className="text-lg font-display font-bold text-ink-700">
              {isBaseElement ? '—' : recipes.length}
            </div>
            <div className="text-[11px] text-ink-500">Recipes known</div>
          </div>
          <div className="bg-cream-100 border border-cream-300 rounded-xl p-2.5 text-center">
            <div className="text-sm font-display font-bold text-ink-700">
              {fullElement ? formatDate(fullElement.created_at) : '—'}
            </div>
            <div className="text-[11px] text-ink-500">Added to game</div>
          </div>
          <div className="bg-cream-100 border border-cream-300 rounded-xl p-2.5 text-center">
            <div className="text-sm font-display font-bold text-ink-400">
              Coming soon
            </div>
            <div className="text-[11px] text-ink-500">First discovered by</div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-display font-bold text-ink-600 uppercase tracking-wider mb-2">
            How it's made
          </h3>

          {isBaseElement && (
            <p className="text-sm text-ink-500 bg-cream-100 border border-cream-300 rounded-2xl p-4">
              One of the four fundamental elements. Everything else in Synthia is built from this.
            </p>
          )}

          {!isBaseElement && isLoading && (
            <p className="text-sm text-ink-400">Loading...</p>
          )}

          {!isBaseElement && !isLoading && recipes.length === 0 && (
            <p className="text-sm text-ink-500 bg-cream-100 border border-cream-300 rounded-2xl p-4">
              No known recipe yet. Someone will have to discover one!
            </p>
          )}

          {!isBaseElement && !isLoading && recipes.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {recipes.map((recipe, i) => (
                <div key={i} className="bg-cream-100 border border-cream-300 rounded-xl px-3 py-2">
                  <div className="flex items-center justify-center gap-1.5 font-display font-semibold text-ink-700 text-sm">
                    {recipe.ingredients.map((ing, j) => (
                      <React.Fragment key={ing.id}>
                        {j > 0 && <span className="text-ink-400 font-normal">+</span>}
                        <span>{ing.emoji} {ing.name}</span>
                      </React.Fragment>
                    ))}
                  </div>
                  {recipe.reasoning && (
                    <p className="text-xs text-ink-500 text-center mt-1 leading-snug">
                      {recipe.reasoning}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

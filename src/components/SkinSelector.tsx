import React, { useEffect, useState } from 'react';
import { getSkinsForUser, equipSkin } from '../services/skins';
import type { Skin } from '../types';

interface SkinSelectorProps {
  isVisible: boolean;
  onClose: () => void;
}

export const SkinSelector: React.FC<SkinSelectorProps> = ({ isVisible, onClose }) => {
  const [skins, setSkins] = useState<Skin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [equippingId, setEquippingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisible) return;
    setIsLoading(true);
    getSkinsForUser().then(setSkins).finally(() => setIsLoading(false));
  }, [isVisible]);

  if (!isVisible) return null;

  const handleEquip = async (skin: Skin) => {
    if (!skin.isOwned || skin.isEquipped) return;
    setEquippingId(skin.id);
    const succeeded = await equipSkin(skin.id);
    if (succeeded) {
      setSkins(prev => prev.map(s => ({ ...s, isEquipped: s.id === skin.id })));
    }
    setEquippingId(null);
  };

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

        <h2 className="text-2xl font-display font-bold text-ink-700 text-center mb-1">Skins</h2>
        <p className="text-sm text-ink-500 text-center mb-5">
          Reskins the look of every element card at once. Placeholder catalog -- no real art yet.
        </p>

        {isLoading && <p className="text-sm text-ink-400 text-center py-6">Loading...</p>}

        {!isLoading && skins.length === 0 && (
          <p className="text-sm text-ink-500 bg-cream-100 border border-cream-300 rounded-2xl p-4 text-center">
            No skins available yet.
          </p>
        )}

        {!isLoading && skins.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {skins.map(skin => (
              <div
                key={skin.id}
                className="flex items-center gap-3 bg-cream-100 border-2 border-cream-300 rounded-2xl px-4 py-3"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 border-2 border-amber-300 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-ink-700 text-sm">{skin.name}</div>
                  {skin.description && (
                    <div className="text-xs text-ink-500 truncate">{skin.description}</div>
                  )}
                </div>

                {skin.isEquipped && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-3 py-1 flex-shrink-0">
                    Equipped
                  </span>
                )}

                {!skin.isEquipped && skin.isOwned && (
                  <button
                    onClick={() => handleEquip(skin)}
                    disabled={equippingId === skin.id}
                    className="text-xs font-bold text-ink-600 bg-cream-50 border-2 border-cream-300 rounded-full px-3 py-1 hover:bg-amber-100 hover:border-amber-400 hover:text-amber-700 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {equippingId === skin.id ? 'Equipping...' : 'Equip'}
                  </button>
                )}

                {!skin.isOwned && (
                  <span className="text-xs font-bold text-ink-400 bg-cream-50 border-2 border-cream-300 rounded-full px-3 py-1 flex-shrink-0">
                    {skin.isPremium ? 'Locked' : 'Not owned'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

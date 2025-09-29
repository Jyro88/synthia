import React from 'react';
import { Element } from '../types';
import ElementCard from './ElementCard';

interface InventoryProps {
  elements: Element[];
  title?: string;
  showStats?: boolean;
}

const Inventory: React.FC<InventoryProps> = ({
  elements,
  title = 'Discovered Elements',
  showStats = true,
}) => {
  const getRarityCount = (rarity: string) => 
    elements.filter(element => element.rarity === rarity).length;

  const rarityCounts = {
    common: getRarityCount('common'),
    uncommon: getRarityCount('uncommon'),
    rare: getRarityCount('rare'),
    epic: getRarityCount('epic'),
    legendary: getRarityCount('legendary'),
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        {showStats && (
          <div className="text-sm text-gray-600">
            {elements.length} elements
          </div>
        )}
      </div>

      {showStats && (
        <div className="grid grid-cols-5 gap-2 mb-4 text-xs">
          {Object.entries(rarityCounts).map(([rarity, count]) => (
            <div key={rarity} className="text-center">
              <div className="font-semibold capitalize">{rarity}</div>
              <div className="text-gray-600">{count}</div>
            </div>
          ))}
        </div>
      )}

      {elements.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <div className="text-4xl mb-2">🔍</div>
          <p>No elements discovered yet</p>
          <p className="text-sm">Try combining basic elements!</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-96 overflow-y-auto">
          {elements
            .sort((a, b) => {
              // Sort by rarity first, then by name
              const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
              if (rarityOrder[a.rarity] !== rarityOrder[b.rarity]) {
                return rarityOrder[a.rarity] - rarityOrder[b.rarity];
              }
              return a.name.localeCompare(b.name);
            })
            .map(element => (
              <ElementCard
                key={element.id}
                element={element}
                size="small"
                showRarity={false}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default Inventory;

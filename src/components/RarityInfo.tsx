import React from 'react';
import { getRarityInfo } from '../services/rarity';

interface RarityInfoProps {
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  className?: string;
  showDescription?: boolean;
}

export const RarityInfo: React.FC<RarityInfoProps> = ({ 
  rarity, 
  className = '', 
  showDescription = false 
}) => {
  const info = getRarityInfo(rarity);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`text-xs font-medium ${info.color}`}>
        {rarity.toUpperCase()}
      </div>
      {showDescription && (
        <div className={`text-xs ${info.color} opacity-75`}>
          {info.description}
        </div>
      )}
    </div>
  );
};

interface RarityBadgeProps {
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  className?: string;
}

export const RarityBadge: React.FC<RarityBadgeProps> = ({ 
  rarity, 
  className = '' 
}) => {
  const info = getRarityInfo(rarity);

  return (
    <div className={`px-2 py-1 rounded-full text-xs font-semibold ${info.color} ${className}`}>
      {rarity.toUpperCase()}
    </div>
  );
};

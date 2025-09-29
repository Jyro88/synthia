import React from 'react';
import { Element } from '../types';

interface ElementCardProps {
  element: Element;
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
  showRarity?: boolean;
}

const ElementCard: React.FC<ElementCardProps> = ({
  element,
  isSelected = false,
  isDisabled = false,
  onClick,
  size = 'medium',
  showRarity = true,
}) => {
  const sizeClasses = {
    small: 'w-16 h-16 text-2xl',
    medium: 'w-20 h-20 text-3xl',
    large: 'w-24 h-24 text-4xl',
  };

  const rarityColors = {
    common: 'border-gray-300 bg-gray-50',
    uncommon: 'border-green-300 bg-green-50',
    rare: 'border-blue-300 bg-blue-50',
    epic: 'border-purple-300 bg-purple-50',
    legendary: 'border-yellow-300 bg-yellow-50',
  };

  const rarityLabels = {
    common: 'Common',
    uncommon: 'Uncommon',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        flex flex-col items-center justify-center
        rounded-xl border-2 p-2
        cursor-pointer transition-all duration-200
        hover:scale-105 hover:shadow-md
        ${isSelected 
          ? 'border-primary-500 bg-primary-100 shadow-lg scale-105' 
          : rarityColors[element.rarity]
        }
        ${isDisabled 
          ? 'opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-none' 
          : ''
        }
      `}
      onClick={isDisabled ? undefined : onClick}
      title={`${element.name} - ${rarityLabels[element.rarity]}`}
    >
      <div className="text-center">
        <div className="text-2xl mb-1">{element.emoji}</div>
        <div className="text-xs font-medium text-gray-700 truncate">
          {element.name}
        </div>
        {showRarity && (
          <div className="text-xs text-gray-500">
            {rarityLabels[element.rarity]}
          </div>
        )}
      </div>
    </div>
  );
};

export default ElementCard;

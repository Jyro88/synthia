import React from 'react';
import { Element } from '../types';
import ElementCard from './ElementCard';

interface CombinationAreaProps {
  selectedElements: Element[];
  onElementRemove: (elementId: string) => void;
  onCombine: () => void;
  canCombine: boolean;
  isCombining: boolean;
}

const CombinationArea: React.FC<CombinationAreaProps> = ({
  selectedElements,
  onElementRemove,
  onCombine,
  canCombine,
  isCombining,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Combination Area
      </h2>
      
      <div className="flex items-center justify-center min-h-[120px] mb-6">
        {selectedElements.length === 0 ? (
          <div className="text-gray-400 text-center">
            <div className="text-4xl mb-2">⚗️</div>
            <p>Select elements to combine</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {selectedElements.map((element, index) => (
              <React.Fragment key={element.id}>
                <div className="relative">
                  <ElementCard
                    element={element}
                    size="large"
                    onClick={() => onElementRemove(element.id)}
                  />
                  <button
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors"
                    onClick={() => onElementRemove(element.id)}
                    title="Remove element"
                  >
                    ×
                  </button>
                </div>
                {index < selectedElements.length - 1 && (
                  <div className="text-2xl text-gray-400">+</div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex justify-center">
        <button
          className={`
            px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200
            ${canCombine && !isCombining
              ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
            ${isCombining ? 'animate-pulse' : ''}
          `}
          onClick={onCombine}
          disabled={!canCombine || isCombining}
        >
          {isCombining ? 'Combining...' : 'Combine Elements'}
        </button>
      </div>
    </div>
  );
};

export default CombinationArea;

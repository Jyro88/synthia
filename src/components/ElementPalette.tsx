import React from 'react';
import { Element } from '../types';
import ElementCard from './ElementCard';

interface ElementPaletteProps {
  elements: Element[];
  selectedElements: Element[];
  onElementClick: (element: Element) => void;
  maxSelection: number;
}

const ElementPalette: React.FC<ElementPaletteProps> = ({
  elements,
  selectedElements,
  onElementClick,
  maxSelection,
}) => {
  const isElementSelected = (element: Element) => 
    selectedElements.some(selected => selected.id === element.id);

  const isElementDisabled = (element: Element) => {
    const isSelected = isElementSelected(element);
    const isAtMaxSelection = selectedElements.length >= maxSelection;
    return !isSelected && isAtMaxSelection;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Element Palette
      </h2>
      
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
        {elements.map(element => (
          <ElementCard
            key={element.id}
            element={element}
            isSelected={isElementSelected(element)}
            isDisabled={isElementDisabled(element)}
            onClick={() => onElementClick(element)}
            size="medium"
            showRarity={false}
          />
        ))}
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        Selected: {selectedElements.length}/{maxSelection}
      </div>
    </div>
  );
};

export default ElementPalette;

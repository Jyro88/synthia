import React, { useState } from 'react';
import { Element } from './types';
import { BASIC_ELEMENTS, DISCOVERABLE_ELEMENTS, getElementById } from './data/elements';
import { attemptCombination } from './gameLogic/combinations';
import { useGameState } from './hooks/useGameState';
import { useElementSelection } from './hooks/useElementSelection';
import GameHeader from './components/GameHeader';
import ElementPalette from './components/ElementPalette';
import CombinationArea from './components/CombinationArea';
import Inventory from './components/Inventory';

function App() {
  const { gameState, isLoading, addDiscoveredElement, resetGame } = useGameState();
  const { selectionState, selectElement, deselectElement, clearSelection } = useElementSelection(3);
  const [isCombining, setIsCombining] = useState(false);
  const [lastResult, setLastResult] = useState<Element | null>(null);

  // Get all available elements (basic + discovered)
  const availableElements = [
    ...BASIC_ELEMENTS,
    ...DISCOVERABLE_ELEMENTS.filter(element => 
      gameState.discoveredElements.includes(element.id)
    )
  ];

  const handleElementClick = (element: Element) => {
    if (selectionState.selectedElements.some(el => el.id === element.id)) {
      deselectElement(element.id);
    } else {
      selectElement(element);
    }
  };

  const handleCombine = async () => {
    if (selectionState.selectedElements.length < 2) return;

    setIsCombining(true);
    
    // Simulate combination delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = attemptCombination(selectionState.selectedElements);
    
    if (result.isValid && result.result) {
      addDiscoveredElement(result.result);
      setLastResult(result.result);
    }
    
    clearSelection();
    setIsCombining(false);
  };

  const canCombine = selectionState.selectedElements.length >= 2 && 
                    selectionState.selectedElements.length <= 3;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚗️</div>
          <div className="text-xl text-gray-600">Loading Synthia...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        <GameHeader gameState={gameState} onReset={resetGame} />
        
        {/* Success notification */}
        {lastResult && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{lastResult.emoji}</span>
              <div>
                <div className="font-bold">New Element Discovered!</div>
                <div className="text-sm">{lastResult.name} - {lastResult.description}</div>
              </div>
              <button
                onClick={() => setLastResult(null)}
                className="ml-auto text-green-500 hover:text-green-700"
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Element Palette */}
          <div className="lg:col-span-2 space-y-6">
            <ElementPalette
              elements={availableElements}
              selectedElements={selectionState.selectedElements}
              onElementClick={handleElementClick}
              maxSelection={selectionState.maxSelection}
            />
            
            <CombinationArea
              selectedElements={selectionState.selectedElements}
              onElementRemove={deselectElement}
              onCombine={handleCombine}
              canCombine={canCombine}
              isCombining={isCombining}
            />
          </div>
          
          {/* Right column - Inventory */}
          <div className="lg:col-span-1">
            <Inventory
              elements={gameState.inventory}
              showStats={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

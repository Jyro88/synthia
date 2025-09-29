import React from 'react';
import { GameState } from '../types';
import { getGameStats } from '../gameLogic/gameState';

interface GameHeaderProps {
  gameState: GameState;
  onReset?: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({ gameState, onReset }) => {
  const stats = getGameStats(gameState);

  return (
    <header className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 rounded-xl shadow-lg mb-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Synthia</h1>
          <p className="text-primary-100">Element Combination Game</p>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold">{stats.score}</div>
          <div className="text-primary-100 text-sm">Score</div>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <div className="font-semibold">{stats.discoveredCount}</div>
          <div className="text-primary-200">Discovered</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">{stats.discoverableElements}</div>
          <div className="text-primary-200">Total</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">{stats.progressPercentage}%</div>
          <div className="text-primary-200">Progress</div>
        </div>
        <div className="text-center">
          <button
            onClick={onReset}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-xs"
          >
            Reset Game
          </button>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-4">
        <div className="w-full bg-primary-400 rounded-full h-2">
          <div
            className="bg-white h-2 rounded-full transition-all duration-300"
            style={{ width: `${stats.progressPercentage}%` }}
          />
        </div>
      </div>
    </header>
  );
};

export default GameHeader;

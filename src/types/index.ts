// Core types for the Synthia combination game

export interface Element {
  id: string;
  name: string;
  description?: string;
  emoji: string;
  rarity: Rarity;
  category: ElementCategory;
  discovered?: boolean;
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ElementCategory = 'basic' | 'natural' | 'artificial' | 'magical' | 'cosmic';

export interface Combination {
  id: string;
  elements: string[]; // Array of element IDs that combine to create this result
  result: string; // Element ID of the result
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface GameState {
  discoveredElements: string[]; // Array of discovered element IDs
  inventory: Element[];
  combinations: Combination[];
  score: number;
}

export interface CombinationAttempt {
  selectedElements: Element[];
  isValid: boolean;
  result?: Element;
}

// UI State types
export interface SelectionState {
  selectedElements: Element[];
  maxSelection: number;
}

export interface GameSettings {
  maxElementsPerCombination: number;
  showHints: boolean;
  soundEnabled: boolean;
}

// Storage keys for localStorage
export const STORAGE_KEYS = {
  DISCOVERED_ELEMENTS: 'synthia_discovered_elements',
  GAME_STATE: 'synthia_game_state',
  SETTINGS: 'synthia_settings',
} as const;

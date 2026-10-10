export interface Element {
  instanceId: string;
  elementId: string;
  name: string;
  emoji: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  x: number;
  y: number;
  isNew?: boolean;
}

export interface ElementDefinition {
  id: string;
  name: string;
  emoji: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface Combination {
  elements: string[];
  result: string;
}

export interface Skin {
  id: string;
  name: string;
  description: string | null;
  isPremium: boolean;
  isOwned: boolean;
  isEquipped: boolean;
}
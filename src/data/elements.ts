import type { ElementDefinition } from '../types';

// All discoverable elements
export const allElements: ElementDefinition[] = [
  { id: 'fire', name: 'Fire', emoji: '🔥', rarity: 'common' },
  { id: 'water', name: 'Water', emoji: '💧', rarity: 'common' },
  { id: 'earth', name: 'Earth', emoji: '🌍', rarity: 'common' },
  { id: 'air', name: 'Air', emoji: '💨', rarity: 'common' },
  { id: 'steam', name: 'Steam', emoji: '♨️', rarity: 'common' },
  { id: 'mud', name: 'Mud', emoji: '🟤', rarity: 'common' },
  { id: 'lava', name: 'Lava', emoji: '🌋', rarity: 'uncommon' },
  { id: 'volcano', name: 'Volcano', emoji: '🏔️', rarity: 'rare' },
  { id: 'cloud', name: 'Cloud', emoji: '☁️', rarity: 'uncommon' },
  { id: 'rain', name: 'Rain', emoji: '🌧️', rarity: 'uncommon' }
];

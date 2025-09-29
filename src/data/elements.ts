import { Element, Rarity, ElementCategory } from '../types';

// Sample elements data for the MVP
// TODO: Later expand this with AI-generated combinations or load from backend
export const BASIC_ELEMENTS: Element[] = [
  {
    id: 'fire',
    name: 'Fire',
    description: 'The element of heat and energy',
    emoji: '🔥',
    rarity: 'common',
    category: 'basic',
    discovered: true, // Always start with basic elements discovered
  },
  {
    id: 'water',
    name: 'Water',
    description: 'The element of fluidity and life',
    emoji: '💧',
    rarity: 'common',
    category: 'basic',
    discovered: true,
  },
  {
    id: 'earth',
    name: 'Earth',
    description: 'The element of stability and solidity',
    emoji: '🌍',
    rarity: 'common',
    category: 'basic',
    discovered: true,
  },
  {
    id: 'air',
    name: 'Air',
    description: 'The element of freedom and movement',
    emoji: '💨',
    rarity: 'common',
    category: 'basic',
    discovered: true,
  },
];

// Elements that can be discovered through combinations
export const DISCOVERABLE_ELEMENTS: Element[] = [
  {
    id: 'steam',
    name: 'Steam',
    description: 'Water heated by fire',
    emoji: '💨',
    rarity: 'common',
    category: 'natural',
    discovered: false,
  },
  {
    id: 'mud',
    name: 'Mud',
    description: 'Earth mixed with water',
    emoji: '🌊',
    rarity: 'common',
    category: 'natural',
    discovered: false,
  },
  {
    id: 'lava',
    name: 'Lava',
    description: 'Molten earth and fire combined',
    emoji: '🌋',
    rarity: 'uncommon',
    category: 'natural',
    discovered: false,
  },
  {
    id: 'dust',
    name: 'Dust',
    description: 'Earth blown by air',
    emoji: '💨',
    rarity: 'common',
    category: 'natural',
    discovered: false,
  },
  {
    id: 'rain',
    name: 'Rain',
    description: 'Water falling from the sky',
    emoji: '🌧️',
    rarity: 'uncommon',
    category: 'natural',
    discovered: false,
  },
  {
    id: 'cloud',
    name: 'Cloud',
    description: 'Water vapor in the air',
    emoji: '☁️',
    rarity: 'uncommon',
    category: 'natural',
    discovered: false,
  },
  {
    id: 'volcano',
    name: 'Volcano',
    description: 'Earth erupting with fire',
    emoji: '🌋',
    rarity: 'rare',
    category: 'natural',
    discovered: false,
  },
  {
    id: 'geyser',
    name: 'Geyser',
    description: 'Steam erupting from earth',
    emoji: '⛲',
    rarity: 'rare',
    category: 'natural',
    discovered: false,
  },
];

// All elements combined
export const ALL_ELEMENTS = [...BASIC_ELEMENTS, ...DISCOVERABLE_ELEMENTS];

// Helper function to get element by ID
export const getElementById = (id: string): Element | undefined => {
  return ALL_ELEMENTS.find(element => element.id === id);
};

// Helper function to get elements by category
export const getElementsByCategory = (category: ElementCategory): Element[] => {
  return ALL_ELEMENTS.filter(element => element.category === category);
};

// Helper function to get elements by rarity
export const getElementsByRarity = (rarity: Rarity): Element[] => {
  return ALL_ELEMENTS.filter(element => element.rarity === rarity);
};

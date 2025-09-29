# Synthia - Element Combination Game

A web-based combination game similar to Little Alchemy, built with React + TypeScript + Tailwind CSS.

## Features

- 🔥 **Element Combination**: Combine 2-3 elements to discover new ones
- 📱 **Mobile-Friendly**: Responsive design with touch-friendly interface
- 🎯 **Progressive Discovery**: Start with basic elements (Fire, Water, Earth, Air) and unlock more
- 💾 **Persistent Progress**: Your discoveries are saved in localStorage
- 🏆 **Scoring System**: Earn points based on element rarity
- 🎨 **Beautiful UI**: Clean, modern design with Tailwind CSS

## Game Mechanics

### Basic Elements (Always Available)
- 🔥 Fire
- 💧 Water  
- 🌍 Earth
- 💨 Air

### Discoverable Elements
Combine elements to discover new ones like Steam, Mud, Lava, Dust, Rain, Clouds, Volcano, and Geyser!

### Rarity System
- **Common** (10 points): Basic combinations
- **Uncommon** (25 points): More complex combinations
- **Rare** (50 points): Advanced combinations
- **Epic** (100 points): Expert combinations
- **Legendary** (250 points): Master combinations

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/          # React UI components
├── data/               # Game data (elements, combinations)
├── gameLogic/          # Pure game logic functions
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Future Enhancements

- 🤖 AI-generated combinations
- 🌐 Backend integration for cross-device sync
- 📱 React Native mobile app
- 🎵 Sound effects and animations
- 👥 Multiplayer features

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **LocalStorage** for persistence
- **Pure Functions** for easy React Native porting
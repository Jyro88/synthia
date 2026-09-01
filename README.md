# Synthia - Element Combination Game

A web-based combination game similar to Little Alchemy, built with React + TypeScript + Tailwind CSS.

## Features

- 🔥 **Element Combination**: Combine 2-3 elements to discover new ones
- 🤖 **AI-Powered Combinations**: Google Gemini AI generates sensible new combinations
- 📱 **Mobile-Friendly**: Responsive design with touch-friendly interface
- 🎯 **Progressive Discovery**: Start with basic elements (Fire, Water, Earth, Air) and unlock more
- 💾 **Persistent Progress**: Your discoveries are saved in Supabase
- 🏆 **Scoring System**: Earn points based on element rarity
- 🎨 **Beautiful UI**: Clean, modern design with Tailwind CSS
- ⚡ **Self-Merges**: Combine elements with themselves to create larger versions

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

### Prerequisites

1. **Supabase Setup**: Create a Supabase project and run the SQL schema from `supabase-schema.sql`
2. **Google Gemini API**: Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Gemini AI API Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### Installation

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

## AI Combination System

The game now features an AI-powered combination generator using Google Gemini:

- **Smart Suggestions**: AI analyzes element combinations and suggests logical results
- **Scientific Accuracy**: Combinations are based on real-world science and common sense
- **Validation System**: You approve or reject AI suggestions before they're added to the game
- **Self-Merge Support**: AI can create "larger versions" when elements are combined with themselves
- **Confidence Scoring**: AI provides confidence levels (high/medium/low) for its suggestions

### How It Works

1. When you try to combine elements that don't have a predefined combination
2. The AI analyzes the elements and suggests a logical result
3. A validation popup shows the suggested combination with reasoning
4. You can approve (adds to game) or reject the suggestion
5. Approved combinations are saved to Supabase for future use

## Future Enhancements

- 🌐 Backend integration for cross-device sync
- 📱 React Native mobile app
- 🎵 Sound effects and animations
- 👥 Multiplayer features
- 🔄 Community-shared combinations

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Supabase** for database and persistence
- **Google Gemini AI** for intelligent combination generation
- **Pure Functions** for easy React Native porting
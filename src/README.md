# Synthia - Organized File Structure

## 📁 Project Organization

### **Core Files:**
- `App.tsx` - Main application component with game logic orchestration
- `main.tsx` - React app entry point

### **Types (`src/types/`):**
- `index.ts` - TypeScript type definitions for elements and combinations

### **Data (`src/data/`):**
- `elements.ts` - Element definitions and combination recipes

### **Hooks (`src/hooks/`):**
- `useDragAndDrop.ts` - Drag and drop functionality logic
- `useCombinations.ts` - Combination detection and discovery logic

### **Components (`src/components/`):**
- `Canvas.tsx` - Main playground canvas with background and instructions
- `ElementTile.tsx` - Individual draggable element component
- `Sidebar.tsx` - Right sidebar with discovered elements
- `SidebarElement.tsx` - Individual sidebar element button

## 🎮 Game Features

### **Drag & Drop:**
- Smooth global dragging with visual feedback
- Element creation from sidebar
- Proximity-based combination detection

### **Combinations:**
- Fire + Water = Steam
- Water + Earth = Mud
- Fire + Earth = Lava
- Fire + Lava = Volcano
- Steam + Air = Cloud
- Air + Water = Rain

### **Discovery System:**
- Automatic element discovery
- Visual feedback for new discoveries
- Progress tracking in sidebar

## 🏗️ Architecture

The code is organized with clear separation of concerns:
- **Data layer**: Element definitions and combinations
- **Logic layer**: Custom hooks for game mechanics
- **UI layer**: Reusable React components
- **Types**: Shared TypeScript interfaces

This structure makes it easy to:
- Add new elements and combinations
- Modify drag and drop behavior
- Update UI components independently
- Port to React Native (pure logic in hooks)

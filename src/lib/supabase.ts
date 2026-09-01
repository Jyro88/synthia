import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types for recipes
export interface RecipeRecord {
  id: number
  ingredient_key: string
  result: string
  reasoning: string | null
  source: 'bot' | 'player_ai'
  created_at: string
}

// Database types for elements
export interface ElementRecord {
  id: string
  name: string
  emoji: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  discovery_count: number
  created_at: string
  updated_at: string
}

// Database types for user discoveries
export interface UserDiscoveryRecord {
  id: number
  user_id: string
  element_id: string
  discovered_at: string
}

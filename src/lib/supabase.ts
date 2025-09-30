import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types for combinations
export interface CombinationRecord {
  id: number
  element1: string
  element2: string
  result: string
  created_at: string
  updated_at: string
}

// Database types for elements
export interface ElementRecord {
  id: string
  name: string
  emoji: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  created_at: string
  updated_at: string
}

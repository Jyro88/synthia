-- Supabase schema for Synthia game
-- Run this in your Supabase SQL editor

-- Create elements table
CREATE TABLE IF NOT EXISTS elements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create combinations table
CREATE TABLE IF NOT EXISTS combinations (
  id SERIAL PRIMARY KEY,
  element1 TEXT NOT NULL REFERENCES elements(id),
  element2 TEXT NOT NULL REFERENCES elements(id),
  result TEXT NOT NULL REFERENCES elements(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure no duplicate combinations (order doesn't matter)
  CONSTRAINT unique_combination UNIQUE(element1, element2)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_combinations_element1 ON combinations(element1);
CREATE INDEX IF NOT EXISTS idx_combinations_element2 ON combinations(element2);
CREATE INDEX IF NOT EXISTS idx_combinations_result ON combinations(result);
CREATE INDEX IF NOT EXISTS idx_elements_rarity ON elements(rarity);

-- Insert initial elements
INSERT INTO elements (id, name, emoji, rarity) VALUES
  ('fire', 'Fire', '🔥', 'common'),
  ('water', 'Water', '💧', 'common'),
  ('earth', 'Earth', '🌍', 'common'),
  ('air', 'Air', '💨', 'common'),
  ('steam', 'Steam', '♨️', 'common'),
  ('mud', 'Mud', '🟤', 'common'),
  ('lava', 'Lava', '🌋', 'uncommon'),
  ('volcano', 'Volcano', '🏔️', 'rare'),
  ('cloud', 'Cloud', '☁️', 'uncommon'),
  ('rain', 'Rain', '🌧️', 'uncommon')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  rarity = EXCLUDED.rarity,
  updated_at = NOW();

-- Insert initial combinations
INSERT INTO combinations (element1, element2, result) VALUES
  ('fire', 'water', 'steam'),
  ('water', 'earth', 'mud'),
  ('fire', 'earth', 'lava'),
  ('fire', 'lava', 'volcano'),
  ('steam', 'air', 'cloud'),
  ('air', 'water', 'rain')
ON CONFLICT (element1, element2) DO UPDATE SET
  result = EXCLUDED.result,
  updated_at = NOW();

-- Enable Row Level Security (RLS)
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE combinations ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (adjust as needed for your use case)
CREATE POLICY "Allow public read access to elements" ON elements
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to combinations" ON combinations
  FOR SELECT USING (true);

-- Optional: Allow public insert/update/delete (remove if you want to restrict)
CREATE POLICY "Allow public insert to elements" ON elements
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to elements" ON elements
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete to elements" ON elements
  FOR DELETE USING (true);

CREATE POLICY "Allow public insert to combinations" ON combinations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to combinations" ON combinations
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete to combinations" ON combinations
  FOR DELETE USING (true);

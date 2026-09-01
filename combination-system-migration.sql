-- Combination system migration for Synthia
-- Replaces the pairwise-only `combinations` table with an ingredient-count-agnostic
-- `recipes` + `recipe_ingredients` schema, and wipes generated content back down to
-- the 4 classic base elements so the automated Explorer/Judge pipeline can repopulate
-- the game from scratch.
--
-- Run this in your Supabase SQL editor.

-- 1. Wipe generated content (base elements + everything that references them)
TRUNCATE elements, combinations, user_discoveries CASCADE;

-- 2. Drop the old pairwise-only combinations table (superseded below)
DROP TABLE IF EXISTS combinations;

-- 3. Re-seed the 4 classic base elements
INSERT INTO elements (id, name, emoji, rarity, discovery_count) VALUES
  ('fire', 'Fire', '🔥', 'common', 0),
  ('water', 'Water', '💧', 'common', 0),
  ('earth', 'Earth', '🌍', 'common', 0),
  ('air', 'Air', '💨', 'common', 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  rarity = EXCLUDED.rarity,
  discovery_count = EXCLUDED.discovery_count,
  updated_at = NOW();

-- 4. Recipes: one row per approved ingredient set -> result.
-- ingredient_key is the sorted, '+'-joined element ids (e.g. 'fire+water', or
-- 'fire+fire' for a self-merge). It generalizes the old UNIQUE(element1, element2)
-- constraint to N ingredients so a future multi-element phase needs no schema change.
CREATE TABLE recipes (
  id BIGSERIAL PRIMARY KEY,
  ingredient_key TEXT NOT NULL UNIQUE,
  result TEXT NOT NULL REFERENCES elements(id),
  reasoning TEXT,
  source TEXT NOT NULL DEFAULT 'bot' CHECK (source IN ('bot', 'player_ai')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recipe_ingredients (
  recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  element_id TEXT NOT NULL REFERENCES elements(id),
  PRIMARY KEY (recipe_id, element_id)
);

CREATE INDEX idx_recipe_ingredients_element_id ON recipe_ingredients(element_id);
CREATE INDEX idx_recipes_result ON recipes(result);

-- 5. Bot bookkeeping: every attempt the Explorer/Judge pipeline makes, approved or
-- not, keyed the same way as recipes so workers can't duplicate work (the UNIQUE
-- constraint doubles as a concurrency claim). Never read by the live app.
CREATE TABLE combination_attempts (
  id BIGSERIAL PRIMARY KEY,
  ingredient_key TEXT NOT NULL UNIQUE,
  verdict TEXT CHECK (verdict IN ('approved', 'rejected')), -- NULL while claimed/in-flight
  result TEXT REFERENCES elements(id),
  reasoning TEXT,
  needs_additional_ingredient TEXT, -- Phase 2 hook: unused by the Phase 1 orchestrator
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE combination_attempts ENABLE ROW LEVEL SECURITY;

-- recipes / recipe_ingredients: public read (needed for gameplay), public insert
-- (mirrors the existing permissive policy on elements today, so the live in-game
-- AI-suggestion-approval flow for real players keeps working unchanged). The
-- populate script uses the service-role key, which bypasses RLS regardless.
CREATE POLICY "Public can view recipes" ON recipes FOR SELECT USING (true);
CREATE POLICY "Public can insert recipes" ON recipes FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view recipe_ingredients" ON recipe_ingredients FOR SELECT USING (true);
CREATE POLICY "Public can insert recipe_ingredients" ON recipe_ingredients FOR INSERT WITH CHECK (true);

-- combination_attempts: no public policies at all -- service-role only.

COMMENT ON TABLE recipes IS 'Approved element combinations. One row per unique ingredient set.';
COMMENT ON TABLE recipe_ingredients IS 'Junction table: which elements make up each recipe.';
COMMENT ON TABLE combination_attempts IS 'Bot pipeline bookkeeping (Explorer/Judge). Not used by the live app.';
COMMENT ON COLUMN recipes.ingredient_key IS 'Sorted element ids joined by +, e.g. fire+water. Enforces one recipe per ingredient set and doubles as a fast existence check.';

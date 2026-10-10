-- Skins migration for Synthia
-- Scaffolding only: a skin is a global visual theme applied to every element
-- card at once (not per-element). No real art/animation yet -- this just
-- gives the catalog/ownership/equip data model something to sit on so the
-- UI has somewhere to read from and write to.
--
-- Run this in your Supabase SQL editor.

-- 1. Catalog of skins. Service-role managed; the client only ever reads this.
CREATE TABLE skins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO skins (id, name, description, is_premium) VALUES
  ('classic', 'Classic', 'The original hand-drawn paper look.', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Ownership: which skins a user has unlocked (free claim or purchase).
-- The 'classic' skin is never recorded here -- every user owns it implicitly
-- (see skins.ts), so it still works before any row exists for a new player.
CREATE TABLE user_skins (
  user_id TEXT NOT NULL, -- same id shape as user_discoveries.user_id (UUID or anon_*)
  skin_id TEXT NOT NULL REFERENCES skins(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, skin_id)
);

-- 3. Equip state: at most one equipped skin per user, applied to every
-- element card at once. Absence of a row means 'classic' (see skins.ts).
CREATE TABLE user_equipped_skin (
  user_id TEXT PRIMARY KEY,
  skin_id TEXT NOT NULL REFERENCES skins(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_skins_user_id ON user_skins(user_id);

-- 4. RLS
ALTER TABLE skins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_equipped_skin ENABLE ROW LEVEL SECURITY;

-- skins: public read-only catalog, same pattern as elements.
CREATE POLICY "Public can view skins" ON skins FOR SELECT USING (true);

-- user_skins / user_equipped_skin: same anon-id pattern already used for
-- user_discoveries (see RLS_SECURITY_GUIDE.md) -- a user can read/write only
-- rows under their own auth.uid(), or any anon_* row (anonymous users have
-- no auth.uid() to check against, same tradeoff user_discoveries already
-- accepts).
CREATE POLICY "Users can view own skins" ON user_skins
  FOR SELECT USING (auth.uid()::text = user_id OR user_id LIKE 'anon_%');
CREATE POLICY "Users can unlock own skins" ON user_skins
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'anon_%');

CREATE POLICY "Users can view own equipped skin" ON user_equipped_skin
  FOR SELECT USING (auth.uid()::text = user_id OR user_id LIKE 'anon_%');
CREATE POLICY "Users can set own equipped skin" ON user_equipped_skin
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'anon_%');
CREATE POLICY "Users can update own equipped skin" ON user_equipped_skin
  FOR UPDATE USING (auth.uid()::text = user_id OR user_id LIKE 'anon_%');

COMMENT ON TABLE skins IS 'Catalog of visual card skins. Global per-user, applied to every element card at once -- not per-element.';
COMMENT ON TABLE user_skins IS 'Which skins a user has unlocked. The classic skin is implicit and never recorded here.';
COMMENT ON TABLE user_equipped_skin IS 'At most one row per user: their currently-equipped skin. Absence means classic.';

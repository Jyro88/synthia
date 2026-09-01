-- Migration script to add dynamic rarity system to Synthia
-- Run this in your Supabase SQL editor

-- 1. Add discovery_count column to existing elements table
ALTER TABLE elements 
ADD COLUMN IF NOT EXISTS discovery_count INTEGER DEFAULT 0;

-- 2. Create user_profiles table for authenticated users
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  discoveries_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create user_discoveries table to track which users have discovered which elements
CREATE TABLE IF NOT EXISTS user_discoveries (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL, -- Can be UUID (authenticated) or anon_id (anonymous)
  element_id TEXT NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only discover an element once
  UNIQUE(user_id, element_id)
);

-- 4. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_discoveries_user_id ON user_discoveries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_discoveries_element_id ON user_discoveries(element_id);
CREATE INDEX IF NOT EXISTS idx_user_discoveries_discovered_at ON user_discoveries(discovered_at);

-- 5. Update existing elements to have discovery_count = 0
UPDATE elements 
SET discovery_count = 0 
WHERE discovery_count IS NULL;

-- 6. Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8. Optional: Create a function to automatically update rarity based on discovery percentage
CREATE OR REPLACE FUNCTION update_element_rarity()
RETURNS TRIGGER AS $$
DECLARE
  total_users INTEGER;
  discovery_percentage DECIMAL;
  new_rarity TEXT;
BEGIN
  -- Get total number of unique users
  SELECT COUNT(DISTINCT user_id) INTO total_users 
  FROM user_discoveries;
  
  -- Prevent division by zero
  IF total_users = 0 THEN
    total_users := 1;
  END IF;
  
  -- Calculate discovery percentage for this element
  SELECT (COUNT(*)::DECIMAL / total_users) INTO discovery_percentage
  FROM user_discoveries 
  WHERE element_id = NEW.element_id;
  
  -- Determine rarity based on percentage thresholds
  IF discovery_percentage <= 0.01 THEN
    new_rarity := 'legendary';
  ELSIF discovery_percentage <= 0.05 THEN
    new_rarity := 'epic';
  ELSIF discovery_percentage <= 0.15 THEN
    new_rarity := 'rare';
  ELSIF discovery_percentage <= 0.40 THEN
    new_rarity := 'uncommon';
  ELSE
    new_rarity := 'common';
  END IF;
  
  -- Update the element's rarity and discovery count
  UPDATE elements 
  SET 
    rarity = new_rarity,
    discovery_count = (SELECT COUNT(*) FROM user_discoveries WHERE element_id = NEW.element_id),
    updated_at = NOW()
  WHERE id = NEW.element_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to automatically update rarity when discoveries are added
DROP TRIGGER IF EXISTS trigger_update_element_rarity ON user_discoveries;
CREATE TRIGGER trigger_update_element_rarity
  AFTER INSERT ON user_discoveries
  FOR EACH ROW
  EXECUTE FUNCTION update_element_rarity();

-- 10. Optional: Create a view for easy rarity statistics
CREATE OR REPLACE VIEW element_rarity_stats AS
SELECT 
  e.id,
  e.name,
  e.emoji,
  e.rarity,
  e.discovery_count,
  COUNT(DISTINCT ud.user_id) as total_users,
  ROUND((e.discovery_count::DECIMAL / GREATEST(COUNT(DISTINCT ud.user_id), 1)) * 100, 2) as discovery_percentage
FROM elements e
LEFT JOIN user_discoveries ud ON ud.element_id = e.id
GROUP BY e.id, e.name, e.emoji, e.rarity, e.discovery_count
ORDER BY discovery_percentage ASC;

-- 11. Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON user_discoveries TO authenticated;
-- GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
-- GRANT SELECT ON element_rarity_stats TO authenticated;

-- 12. Enable Row Level Security (RLS) for user data protection
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_discoveries ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies
-- Users can only see and modify their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can only see their own discoveries
CREATE POLICY "Users can view own discoveries" ON user_discoveries
  FOR SELECT USING (auth.uid()::text = user_id OR user_id LIKE 'anon_%');

CREATE POLICY "Users can insert own discoveries" ON user_discoveries
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'anon_%');

-- 14. Create RLS policies for element_rarity_stats view
-- Note: Views inherit RLS from their underlying tables, but we need explicit policies

-- Allow authenticated users to see all element rarity stats (this is public game data)
CREATE POLICY "Authenticated users can view rarity stats" ON element_rarity_stats
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow anonymous users to see all element rarity stats (public game data)
CREATE POLICY "Anonymous users can view rarity stats" ON element_rarity_stats
  FOR SELECT USING (auth.role() = 'anon');

-- Alternative: If you want more restrictive access, you can create a function-based policy
-- CREATE POLICY "Public rarity stats access" ON element_rarity_stats
--   FOR SELECT USING (true); -- Anyone can view this data

-- 15. Create a more detailed user-specific discovery stats view
CREATE OR REPLACE VIEW user_discovery_details AS
SELECT 
  ud.user_id,
  ud.element_id,
  ud.discovered_at,
  e.name as element_name,
  e.emoji,
  e.rarity,
  e.discovery_count,
  up.display_name,
  up.username
FROM user_discoveries ud
JOIN elements e ON e.id = ud.element_id
LEFT JOIN user_profiles up ON up.id::text = ud.user_id
WHERE ud.user_id = auth.uid()::text OR ud.user_id LIKE 'anon_%';

-- 16. Enable RLS on the user discovery details view
ALTER VIEW user_discovery_details SET (security_invoker = true);

-- 17. Create additional RLS policies for elements table (if needed)
-- Elements table is generally public read-only, but let's be explicit

-- Allow everyone to read elements (public game data)
CREATE POLICY "Public can view elements" ON elements
  FOR SELECT USING (true);

-- Only service role can modify elements (through your app)
CREATE POLICY "Service role can modify elements" ON elements
  FOR ALL USING (auth.role() = 'service_role');

-- 18. Create a comprehensive stats view for admins/analytics
CREATE OR REPLACE VIEW admin_game_stats AS
SELECT 
  -- Overall stats
  (SELECT COUNT(*) FROM elements) as total_elements,
  (SELECT COUNT(*) FROM user_discoveries) as total_discoveries,
  (SELECT COUNT(DISTINCT user_id) FROM user_discoveries) as unique_users,
  
  -- Rarity distribution
  (SELECT COUNT(*) FROM elements WHERE rarity = 'common') as common_elements,
  (SELECT COUNT(*) FROM elements WHERE rarity = 'uncommon') as uncommon_elements,
  (SELECT COUNT(*) FROM elements WHERE rarity = 'rare') as rare_elements,
  (SELECT COUNT(*) FROM elements WHERE rarity = 'epic') as epic_elements,
  (SELECT COUNT(*) FROM elements WHERE rarity = 'legendary') as legendary_elements,
  
  -- Discovery stats
  (SELECT AVG(discovery_count) FROM elements) as avg_discoveries_per_element,
  (SELECT MAX(discovery_count) FROM elements) as max_discoveries,
  (SELECT MIN(discovery_count) FROM elements) as min_discoveries;

-- 19. Create user leaderboard view (public, anonymized)
CREATE OR REPLACE VIEW public_leaderboard AS
SELECT 
  CASE 
    WHEN up.display_name IS NOT NULL THEN up.display_name
    WHEN up.username IS NOT NULL THEN up.username
    ELSE CONCAT('Anonymous ', RIGHT(ud.user_id, 6))
  END as player_name,
  COUNT(*) as total_discoveries,
  COUNT(CASE WHEN e.rarity = 'legendary' THEN 1 END) as legendary_discoveries,
  COUNT(CASE WHEN e.rarity = 'epic' THEN 1 END) as epic_discoveries,
  COUNT(CASE WHEN e.rarity = 'rare' THEN 1 END) as rare_discoveries,
  MIN(ud.discovered_at) as first_discovery,
  MAX(ud.discovered_at) as last_discovery
FROM user_discoveries ud
JOIN elements e ON e.id = ud.element_id
LEFT JOIN user_profiles up ON up.id::text = ud.user_id
GROUP BY ud.user_id, up.display_name, up.username
ORDER BY total_discoveries DESC, legendary_discoveries DESC;

-- 20. Grant appropriate permissions
-- Grant public access to game data views
GRANT SELECT ON element_rarity_stats TO anon, authenticated;
GRANT SELECT ON public_leaderboard TO anon, authenticated;

-- Grant authenticated users access to their own discovery details
GRANT SELECT ON user_discovery_details TO authenticated;

-- Only service role can see admin stats
GRANT SELECT ON admin_game_stats TO service_role;

COMMENT ON TABLE user_discoveries IS 'Tracks which users have discovered which elements for dynamic rarity calculation';
COMMENT ON COLUMN elements.discovery_count IS 'Number of users who have discovered this element';
COMMENT ON FUNCTION update_element_rarity() IS 'Automatically updates element rarity based on discovery percentage when new discoveries are recorded';
COMMENT ON VIEW element_rarity_stats IS 'Public view of element rarity statistics - accessible to all users';
COMMENT ON VIEW user_discovery_details IS 'User-specific discovery history - only accessible to the user themselves';
COMMENT ON VIEW public_leaderboard IS 'Public leaderboard showing anonymized player statistics';
COMMENT ON VIEW admin_game_stats IS 'Admin-only comprehensive game statistics';

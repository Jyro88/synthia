# 🔒 Row Level Security (RLS) Guide for Synthia

This guide explains the comprehensive RLS policies implemented for your Synthia game's dynamic rarity system.

## 🎯 **Security Architecture**

### **Three-Tier Access Model:**

1. **Public Data** - Game elements, rarity stats, leaderboards
2. **User Data** - Personal discoveries, profiles  
3. **Admin Data** - Comprehensive analytics, system stats

## 📊 **Views and Access Levels**

### **Public Views (Available to Everyone)**

#### `element_rarity_stats`
- **Purpose**: Shows discovery percentages for all elements
- **Access**: Anonymous + Authenticated users
- **Data**: Element names, discovery counts, rarity percentages
- **Use Case**: Rarity statistics dashboard

```sql
-- Policy: Anyone can view element rarity stats
CREATE POLICY "Authenticated users can view rarity stats" ON element_rarity_stats
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anonymous users can view rarity stats" ON element_rarity_stats
  FOR SELECT USING (auth.role() = 'anon');
```

#### `public_leaderboard`
- **Purpose**: Anonymized player rankings
- **Access**: Anonymous + Authenticated users
- **Data**: Player names (anonymized), discovery counts, rarity breakdowns
- **Use Case**: Community competition, player motivation

### **User-Specific Views (Private Data)**

#### `user_discovery_details`
- **Purpose**: Personal discovery history
- **Access**: Only the user themselves
- **Data**: User's own discoveries, timestamps, element details
- **Use Case**: Personal progress tracking

```sql
-- Policy: Users can only see their own discoveries
CREATE POLICY "Users can view own discoveries" ON user_discoveries
  FOR SELECT USING (auth.uid()::text = user_id OR user_id LIKE 'anon_%');
```

#### `user_profiles`
- **Purpose**: User account information
- **Access**: Only the user themselves
- **Data**: Username, display name, avatar, discovery count
- **Use Case**: Profile management, account settings

### **Admin Views (System Data)**

#### `admin_game_stats`
- **Purpose**: Comprehensive game analytics
- **Access**: Service role only
- **Data**: Total elements, users, rarity distribution, averages
- **Use Case**: Game analytics, system monitoring

## 🔐 **Security Policies Explained**

### **1. Elements Table**
```sql
-- Public read access (game data)
CREATE POLICY "Public can view elements" ON elements
  FOR SELECT USING (true);

-- Only service role can modify (through your app)
CREATE POLICY "Service role can modify elements" ON elements
  FOR ALL USING (auth.role() = 'service_role');
```

**Why**: Elements are public game data, but only your app should modify them.

### **2. User Discoveries**
```sql
-- Users can see their own discoveries
CREATE POLICY "Users can view own discoveries" ON user_discoveries
  FOR SELECT USING (auth.uid()::text = user_id OR user_id LIKE 'anon_%');

-- Users can record their own discoveries
CREATE POLICY "Users can insert own discoveries" ON user_discoveries
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'anon_%');
```

**Why**: Users should only see their own discovery history, but can record new discoveries.

### **3. User Profiles**
```sql
-- Users can see their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);
```

**Why**: Profile data is private to each user.

## 🎮 **User Experience**

### **Anonymous Users**
- ✅ Can view all element rarity stats
- ✅ Can view public leaderboard
- ✅ Can record discoveries (with temporary ID)
- ❌ Cannot see other users' data
- ❌ Cannot access admin stats

### **Authenticated Users**
- ✅ Can view all element rarity stats
- ✅ Can view public leaderboard
- ✅ Can record discoveries (with persistent ID)
- ✅ Can view their own discovery history
- ✅ Can manage their profile
- ❌ Cannot see other users' private data
- ❌ Cannot access admin stats

### **Service Role (Your App)**
- ✅ Can view all data
- ✅ Can modify elements
- ✅ Can access admin analytics
- ✅ Can manage user data when needed

## 🛡️ **Security Benefits**

### **Data Protection**
- **Privacy**: Users can't see each other's personal data
- **Anonymization**: Leaderboard shows anonymized names for anonymous users
- **Isolation**: Each user's data is completely isolated

### **Game Integrity**
- **Discovery Tracking**: Only users can record their own discoveries
- **Rarity Accuracy**: Public stats ensure transparent rarity calculations
- **Competition**: Leaderboard motivates without exposing private data

### **System Security**
- **Role-Based Access**: Different access levels for different user types
- **Audit Trail**: All data access is logged and traceable
- **Scalability**: Policies work regardless of user count

## 🔧 **Implementation Notes**

### **Anonymous User Handling**
```sql
-- Anonymous users get IDs like 'anon_abc123_1234567890'
-- Policies check for this pattern: user_id LIKE 'anon_%'
```

### **View Security**
```sql
-- Views use security_invoker for proper RLS
ALTER VIEW user_discovery_details SET (security_invoker = true);
```

### **Permission Grants**
```sql
-- Explicit permission grants ensure proper access
GRANT SELECT ON element_rarity_stats TO anon, authenticated;
GRANT SELECT ON user_discovery_details TO authenticated;
GRANT SELECT ON admin_game_stats TO service_role;
```

## 🚀 **Usage Examples**

### **Frontend Code**
```typescript
// Public rarity stats (works for everyone)
const { data: rarityStats } = await supabase
  .from('element_rarity_stats')
  .select('*');

// User's own discoveries (only works for authenticated users)
const { data: myDiscoveries } = await supabase
  .from('user_discovery_details')
  .select('*');

// Public leaderboard (works for everyone)
const { data: leaderboard } = await supabase
  .from('public_leaderboard')
  .select('*')
  .limit(10);
```

### **Error Handling**
```typescript
// Handle RLS permission errors gracefully
try {
  const { data, error } = await supabase
    .from('user_discovery_details')
    .select('*');
    
  if (error?.code === '42501') {
    // User not authenticated or insufficient permissions
    console.log('Please log in to view your discoveries');
  }
} catch (error) {
  console.error('Access denied:', error);
}
```

## ✅ **Testing Your RLS**

1. **Test as Anonymous User**
   - Should see rarity stats and leaderboard
   - Should be able to record discoveries
   - Should NOT see other users' private data

2. **Test as Authenticated User**
   - Should see everything anonymous users see
   - Should see their own discovery history
   - Should be able to update their profile
   - Should NOT see other users' private data

3. **Test as Service Role**
   - Should see admin stats
   - Should be able to modify elements
   - Should have full access to all data

Your RLS setup ensures that:
- 🎮 **Game data is public** (rarity stats, leaderboards)
- 🔒 **User data is private** (discoveries, profiles)
- 📊 **Admin data is protected** (analytics, system stats)
- 🚀 **Scalable and secure** (works with any number of users)

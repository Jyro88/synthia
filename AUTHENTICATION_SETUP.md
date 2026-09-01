# 🔐 Authentication Setup Guide for Synthia

This guide will help you set up a robust authentication system for your Synthia game with dynamic rarity tracking.

## 🎯 **Recommended: Supabase Auth**

Since you're already using Supabase, this is the most seamless option with zero additional infrastructure.

### ✅ **Why Supabase Auth?**

- **Built-in**: Works with your existing Supabase database
- **Multiple Providers**: Email, Google, Discord, GitHub, etc.
- **Free Tier**: Generous limits for indie games
- **Row Level Security**: Automatic data protection
- **Real-time**: Instant auth state updates
- **Easy Setup**: Minimal configuration required

## 🚀 **Setup Steps**

### 1. **Enable Authentication in Supabase**

1. Go to your Supabase dashboard
2. Navigate to **Authentication** → **Settings**
3. Enable **Email** authentication
4. Configure **Site URL**: `http://localhost:5173` (development) or your production domain
5. Add **Redirect URLs**: `http://localhost:5173/auth/callback` (and production equivalent)

### 2. **Configure OAuth Providers (Optional)**

#### Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
6. Copy Client ID and Secret to Supabase Auth settings

#### Discord OAuth:
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create new application
3. Go to OAuth2 settings
4. Add redirect URI: `https://your-project.supabase.co/auth/v1/callback`
5. Copy Client ID and Secret to Supabase Auth settings

### 3. **Run Database Migration**

Execute the `database-migration.sql` script in your Supabase SQL editor. This creates:

- `user_profiles` table for user data
- `user_discoveries` table for tracking discoveries
- Automatic triggers for rarity updates
- Row Level Security policies
- Statistics views

### 4. **Update Your App**

The authentication system is already integrated! Just add the LoginModal to your App.tsx:

```typescript
import { LoginModal } from './components/LoginModal';

// In your App component:
const [showLogin, setShowLogin] = useState(false);
const [currentUser, setCurrentUser] = useState(null);

// Add login button to your navigation
<button onClick={() => setShowLogin(true)}>Login</button>

// Add the modal
<LoginModal
  isVisible={showLogin}
  onClose={() => setShowLogin(false)}
  onLogin={(user) => setCurrentUser(user)}
/>
```

## 🎮 **User Experience**

### **For Players:**
- **Anonymous Play**: Can play immediately without signing up
- **Account Benefits**: Progress saved across devices, discovery tracking
- **Social Login**: Quick signup with Google/Discord
- **Privacy**: Only their own data is visible to them

### **For You:**
- **Real Rarity Data**: Elements become more common as more players find them
- **User Analytics**: Track discovery patterns and player engagement
- **Community Features**: Leaderboards, achievements (future)
- **Data Protection**: RLS ensures users only see their own data

## 📊 **How Dynamic Rarity Works**

1. **Discovery Recording**: When a user discovers an element, it's recorded in `user_discoveries`
2. **Rarity Calculation**: Database trigger calculates discovery percentage
3. **Automatic Updates**: Element rarity updates based on thresholds:
   - **Legendary**: <1% of users discovered
   - **Epic**: 1-5% of users discovered
   - **Rare**: 5-15% of users discovered
   - **Uncommon**: 15-40% of users discovered
   - **Common**: 40%+ of users discovered

## 🔒 **Security Features**

- **Row Level Security**: Users can only access their own data
- **Anonymous Support**: Anonymous users get temporary IDs
- **Data Validation**: All inputs are validated and sanitized
- **Secure Sessions**: Supabase handles token management

## 🚀 **Alternative Options**

If you prefer other auth providers:

### **Firebase Auth**
- Similar features to Supabase
- Good for React apps
- Requires separate database setup

### **Auth0**
- Enterprise-grade authentication
- More complex setup
- Advanced features like MFA

### **Custom JWT**
- Full control over auth flow
- Requires backend development
- More maintenance overhead

## 🎯 **Recommendation**

**Stick with Supabase Auth** because:
- ✅ Already integrated with your database
- ✅ Zero additional setup cost
- ✅ Handles anonymous users gracefully
- ✅ Perfect for indie game development
- ✅ Scales automatically with your user base

## 🔧 **Testing**

1. **Anonymous Play**: Should work immediately
2. **Email Signup**: Create account with email/password
3. **OAuth Login**: Test Google/Discord login
4. **Discovery Tracking**: Verify discoveries are recorded
5. **Rarity Updates**: Check that rarity changes with discoveries

Your authentication system is now ready! Players can start discovering elements and contributing to the dynamic rarity system immediately. 🎉

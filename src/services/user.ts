import { getCurrentUser } from './auth';

/**
 * Get current user ID from Supabase Auth
 * Falls back to localStorage for anonymous users
 */
export const getUserId = async (): Promise<string> => {
  try {
    // Try to get authenticated user first
    const { user } = await getCurrentUser();
    if (user?.id) {
      return user.id;
    }
  } catch (error) {
    console.log('No authenticated user, using anonymous ID');
  }

  // Fallback to localStorage for anonymous users
  const USER_ID_KEY = 'synthia_anonymous_user_id';
  let userId = localStorage.getItem(USER_ID_KEY);
  
  if (!userId) {
    // Generate a simple UUID-like ID for anonymous users
    userId = 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  
  return userId;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const { user } = await getCurrentUser();
    return !!user?.id;
  } catch (error) {
    return false;
  }
};

/**
 * Get user display name (authenticated or anonymous)
 */
export const getUserDisplayName = async (): Promise<string> => {
  try {
    const { user } = await getCurrentUser();
    if (user?.id) {
      return user.user_metadata?.display_name || user.user_metadata?.username || user.email || 'Player';
    }
  } catch (error) {
    console.log('No authenticated user');
  }

  // Anonymous user
  const USER_ID_KEY = 'synthia_anonymous_user_id';
  const userId = localStorage.getItem(USER_ID_KEY);
  return userId ? `Anonymous ${userId.slice(-6)}` : 'Anonymous Player';
};

/**
 * Reset anonymous user ID (for testing)
 */
export const resetAnonymousUserId = (): void => {
  localStorage.removeItem('synthia_anonymous_user_id');
};

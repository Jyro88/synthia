import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  discoveries_count?: number;
  rarest_find?: string;
}

/**
 * Sign up with email and password
 */
export const signUp = async (email: string, password: string, username?: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
          display_name: username || email.split('@')[0]
        }
      }
    });

    if (error) throw error;

    // Create user profile
    if (data.user) {
      await createUserProfile(data.user.id, {
        username: username || email.split('@')[0],
        display_name: username || email.split('@')[0]
      });
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Sign up error:', error);
    return { user: null, error };
  }
};

/**
 * Sign in with email and password
 */
export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return { user: data.user, error };
  } catch (error) {
    console.error('Sign in error:', error);
    return { user: null, error };
  }
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    return { data, error };
  } catch (error) {
    console.error('Google sign in error:', error);
    return { data: null, error };
  }
};

/**
 * Sign in with Discord (great for gaming community)
 */
export const signInWithDiscord = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    return { data, error };
  } catch (error) {
    console.error('Discord sign in error:', error);
    return { data: null, error };
  }
};

/**
 * Sign out
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error };
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  } catch (error) {
    console.error('Get current user error:', error);
    return { user: null, error };
  }
};

/**
 * Create user profile in profiles table
 */
const createUserProfile = async (userId: string, profileData: Partial<UserProfile>) => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        ...profileData,
        discoveries_count: 0
      });

    if (error && !error.message.includes('duplicate')) {
      throw error;
    }
  } catch (error) {
    console.error('Create user profile error:', error);
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Get user profile error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Get user profile error:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Update user profile error:', error);
    return { data: null, error };
  }
};

/**
 * Get user's discovery statistics
 */
export const getUserDiscoveryStats = async (userId: string) => {
  try {
    // Get total discoveries
    const { count: totalDiscoveries, error: discoveriesError } = await supabase
      .from('user_discoveries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (discoveriesError) throw discoveriesError;

    // Get rarest discovery
    const { data: rarestDiscovery, error: rarestError } = await supabase
      .from('user_discoveries')
      .select(`
        element_id,
        discovered_at,
        elements!inner(name, emoji, rarity)
      `)
      .eq('user_id', userId)
      .order('elements.rarity', { ascending: true })
      .limit(1)
      .single();

    return {
      totalDiscoveries: totalDiscoveries || 0,
      rarestDiscovery: rarestDiscovery?.elements,
      error: rarestError
    };
  } catch (error) {
    console.error('Get user discovery stats error:', error);
    return {
      totalDiscoveries: 0,
      rarestDiscovery: null,
      error
    };
  }
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback: (user: any) => void) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
};

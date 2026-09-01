import { supabase } from '../lib/supabase';

export interface RarityThresholds {
  legendary: number; // 0-1% of users
  epic: number;      // 1-5% of users  
  rare: number;      // 5-15% of users
  uncommon: number;  // 15-40% of users
  common: number;    // 40%+ of users
}

export const DEFAULT_RARITY_THRESHOLDS: RarityThresholds = {
  legendary: 0.01,  // 1%
  epic: 0.05,       // 5%
  rare: 0.15,       // 15%
  uncommon: 0.40,   // 40%
  common: 1.0       // 100%
};

/**
 * Calculate rarity based on discovery percentage
 */
export const calculateRarityFromPercentage = (discoveryPercentage: number): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' => {
  if (discoveryPercentage <= DEFAULT_RARITY_THRESHOLDS.legendary) {
    return 'legendary';
  } else if (discoveryPercentage <= DEFAULT_RARITY_THRESHOLDS.epic) {
    return 'epic';
  } else if (discoveryPercentage <= DEFAULT_RARITY_THRESHOLDS.rare) {
    return 'rare';
  } else if (discoveryPercentage <= DEFAULT_RARITY_THRESHOLDS.uncommon) {
    return 'uncommon';
  } else {
    return 'common';
  }
};

/**
 * Get total number of users who have played the game
 */
export const getTotalUsers = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('user_discoveries')
      .select('user_id')
      .neq('user_id', null);

    if (error) {
      console.error('Error getting total users:', error);
      return 1; // Fallback to 1 to prevent division by zero
    }

    // Count unique users
    const uniqueUsers = new Set(data?.map(d => d.user_id) || []).size;
    return Math.max(uniqueUsers, 1); // Ensure at least 1 user
  } catch (error) {
    console.error('Error getting total users:', error);
    return 1;
  }
};

/**
 * Get discovery count for a specific element
 */
export const getElementDiscoveryCount = async (elementId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('user_discoveries')
      .select('*', { count: 'exact', head: true })
      .eq('element_id', elementId);

    if (error) {
      console.error('Error getting discovery count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting discovery count:', error);
    return 0;
  }
};

/**
 * Calculate discovery percentage for an element
 */
export const getDiscoveryPercentage = async (elementId: string): Promise<number> => {
  const [discoveryCount, totalUsers] = await Promise.all([
    getElementDiscoveryCount(elementId),
    getTotalUsers()
  ]);

  return discoveryCount / totalUsers;
};

/**
 * Calculate and update rarity for a specific element
 */
export const updateElementRarity = async (elementId: string): Promise<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'> => {
  try {
    const discoveryPercentage = await getDiscoveryPercentage(elementId);
    const newRarity = calculateRarityFromPercentage(discoveryPercentage);

    // Update the element's rarity and discovery count
    const { error } = await supabase
      .from('elements')
      .update({ 
        rarity: newRarity,
        discovery_count: await getElementDiscoveryCount(elementId)
      })
      .eq('id', elementId);

    if (error) {
      console.error('Error updating element rarity:', error);
    }

    return newRarity;
  } catch (error) {
    console.error('Error updating element rarity:', error);
    return 'common'; // Fallback
  }
};

/**
 * Record a user's discovery of an element
 */
export const recordUserDiscovery = async (elementId: string): Promise<boolean> => {
  try {
    // Get current user ID (handles both authenticated and anonymous users)
    const { getUserId } = await import('./user');
    const userId = await getUserId();
    
    // Check if user has already discovered this element
    const { data: existing, error: checkError } = await supabase
      .from('user_discoveries')
      .select('id')
      .eq('user_id', userId)
      .eq('element_id', elementId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking existing discovery:', checkError);
      return false;
    }

    // If already discovered, don't record again
    if (existing) {
      return true;
    }

    // Record the discovery
    const { error } = await supabase
      .from('user_discoveries')
      .insert({
        user_id: userId,
        element_id: elementId
      });

    if (error) {
      console.error('Error recording user discovery:', error);
      return false;
    }

    // Update the element's rarity based on new discovery count
    await updateElementRarity(elementId);

    return true;
  } catch (error) {
    console.error('Error recording user discovery:', error);
    return false;
  }
};

/**
 * Get rarity info for display
 */
export const getRarityInfo = (rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary') => {
  const info = {
    common: {
      color: 'text-stone-500',
      bgColor: 'from-stone-50 to-stone-100 border-stone-300',
      description: 'Discovered by 40%+ of players',
      threshold: '40%+'
    },
    uncommon: {
      color: 'text-emerald-600',
      bgColor: 'from-emerald-50 to-emerald-100 border-emerald-300',
      description: 'Discovered by 15-40% of players',
      threshold: '15-40%'
    },
    rare: {
      color: 'text-sky-600',
      bgColor: 'from-sky-50 to-sky-100 border-sky-300',
      description: 'Discovered by 5-15% of players',
      threshold: '5-15%'
    },
    epic: {
      color: 'text-violet-600',
      bgColor: 'from-violet-50 to-violet-100 border-violet-300',
      description: 'Discovered by 1-5% of players',
      threshold: '1-5%'
    },
    legendary: {
      color: 'text-amber-600',
      bgColor: 'from-amber-50 to-amber-100 border-amber-300',
      description: 'Discovered by <1% of players',
      threshold: '<1%'
    }
  };

  return info[rarity];
};

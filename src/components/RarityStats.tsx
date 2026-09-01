import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getRarityInfo } from '../services/rarity';

interface RarityStat {
  id: string;
  name: string;
  emoji: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  discovery_count: number;
  total_users: number;
  discovery_percentage: number;
}

interface RarityStatsProps {
  isVisible: boolean;
  onClose: () => void;
}

export const RarityStats: React.FC<RarityStatsProps> = ({ isVisible, onClose }) => {
  const [stats, setStats] = useState<RarityStat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      fetchRarityStats();
    }
  }, [isVisible]);

  const fetchRarityStats = async () => {
    setLoading(true);
    try {
      // Try to fetch from the public view first
      const { data, error } = await supabase
        .from('element_rarity_stats')
        .select('*')
        .order('discovery_percentage', { ascending: true });

      if (error) {
        console.error('Error fetching rarity stats:', error);
        
        // Fallback: fetch basic element data if stats view fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('elements')
          .select('id, name, emoji, rarity, discovery_count')
          .order('discovery_count', { ascending: true });

        if (fallbackError) {
          console.error('Fallback fetch also failed:', fallbackError);
          return;
        }

        // Convert to stats format with default values
        const fallbackStats = fallbackData?.map(el => ({
          id: el.id,
          name: el.name,
          emoji: el.emoji,
          rarity: el.rarity,
          discovery_count: el.discovery_count,
          total_users: 1, // Default fallback
          discovery_percentage: el.discovery_count * 100 // Rough percentage
        })) || [];

        setStats(fallbackStats);
        return;
      }

      setStats(data || []);
    } catch (error) {
      console.error('Error fetching rarity stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  const rarityCounts = stats.reduce((acc, stat) => {
    acc[stat.rarity] = (acc[stat.rarity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 bg-ink-800/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-cream-50 rounded-3xl border-2 border-cream-300 shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b-2 border-cream-300">
          <h3 className="text-2xl font-display font-bold text-ink-700">Rarity Statistics</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-cream-100 border-2 border-cream-300 text-ink-500 hover:bg-amber-100 hover:border-amber-400 hover:text-amber-700 transition-colors flex items-center justify-center text-lg"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {loading ? (
            <div className="text-center text-ink-400">Loading statistics...</div>
          ) : (
            <>
              {/* Rarity Summary */}
              <div className="grid grid-cols-5 gap-4 mb-6">
                {(['legendary', 'epic', 'rare', 'uncommon', 'common'] as const).map((rarity) => {
                  const count = rarityCounts[rarity] || 0;
                  const info = getRarityInfo(rarity);

                  return (
                    <div key={rarity} className={`bg-gradient-to-br ${info.bgColor} rounded-xl p-4 text-center border-2`}>
                      <div className={`text-2xl font-display font-bold ${info.color}`}>{count}</div>
                      <div className={`text-sm font-medium capitalize ${info.color}`}>{rarity}</div>
                      <div className={`text-xs ${info.color} opacity-75 mt-1`}>
                        {info.threshold}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Element Details */}
              <div className="space-y-2">
                <h4 className="text-lg font-display font-bold text-ink-700 mb-4">Element Discovery Rates</h4>
                {stats.map((stat) => {
                  const info = getRarityInfo(stat.rarity);

                  return (
                    <div key={stat.id} className="flex items-center gap-4 p-3 bg-cream-100 border border-cream-300 rounded-xl">
                      <div className="text-2xl">{stat.emoji}</div>
                      <div className="flex-1">
                        <div className="font-display font-semibold text-ink-700">{stat.name}</div>
                        <div className={`text-sm capitalize ${info.color}`}>
                          {stat.rarity} &middot; {stat.discovery_count} discoveries
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-display font-bold ${info.color}`}>
                          {stat.discovery_percentage.toFixed(2)}%
                        </div>
                        <div className="text-xs text-ink-400">
                          {stat.discovery_count}/{stat.total_users} users
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {stats.length === 0 && (
                <div className="text-center text-ink-400 py-8">
                  No elements found. Start discovering elements to see statistics.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

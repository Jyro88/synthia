import { supabase, type SkinRecord } from '../lib/supabase';
import { getUserId } from './user';
import type { Skin } from '../types';

// Every user owns this one implicitly -- never recorded in user_skins, and
// it's what an absent user_equipped_skin row means. See skins-migration.sql.
export const DEFAULT_SKIN_ID = 'classic';

const toSkin = (record: SkinRecord, ownedIds: Set<string>, equippedId: string): Skin => ({
  id: record.id,
  name: record.name,
  description: record.description,
  isPremium: record.is_premium,
  isOwned: record.id === DEFAULT_SKIN_ID || ownedIds.has(record.id),
  isEquipped: record.id === equippedId
});

// Full catalog for the current user, with ownership/equipped state resolved
// -- this is what the (stub) selector UI reads.
export const getSkinsForUser = async (): Promise<Skin[]> => {
  const userId = await getUserId();

  const [{ data: skinRecords, error: skinsError }, { data: ownedRecords, error: ownedError }, { data: equippedRecord, error: equippedError }] = await Promise.all([
    supabase.from('skins').select('*').order('created_at', { ascending: true }),
    supabase.from('user_skins').select('skin_id').eq('user_id', userId),
    supabase.from('user_equipped_skin').select('skin_id').eq('user_id', userId).maybeSingle()
  ]);

  if (skinsError) {
    console.error('Error fetching skins:', skinsError);
    return [];
  }
  if (ownedError) console.error('Error fetching owned skins:', ownedError);
  if (equippedError) console.error('Error fetching equipped skin:', equippedError);

  const ownedIds = new Set((ownedRecords ?? []).map(r => r.skin_id));
  const equippedId = equippedRecord?.skin_id ?? DEFAULT_SKIN_ID;

  return (skinRecords ?? []).map(record => toSkin(record, ownedIds, equippedId));
};

// Equips a skin the user already owns. Returns false (no-op) if they don't
// own it yet -- unlocking/purchasing is a separate, not-yet-built step.
export const equipSkin = async (skinId: string): Promise<boolean> => {
  const userId = await getUserId();

  if (skinId !== DEFAULT_SKIN_ID) {
    const { data: owned, error: ownedError } = await supabase
      .from('user_skins')
      .select('skin_id')
      .eq('user_id', userId)
      .eq('skin_id', skinId)
      .maybeSingle();

    if (ownedError) {
      console.error('Error checking skin ownership:', ownedError);
      return false;
    }
    if (!owned) return false;
  }

  const { error } = await supabase
    .from('user_equipped_skin')
    .upsert({ user_id: userId, skin_id: skinId, updated_at: new Date().toISOString() });

  if (error) {
    console.error('Error equipping skin:', error);
    return false;
  }

  return true;
};

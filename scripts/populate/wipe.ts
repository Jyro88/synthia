import { supabase } from './env';

const wipe = async () => {
  await supabase.from('recipe_ingredients').delete().neq('recipe_id', -1);
  await supabase.from('recipes').delete().neq('id', -1);
  await supabase.from('combination_attempts').delete().neq('id', -1);
  await supabase.from('user_discoveries').delete().neq('id', -1);
  await supabase.from('elements').delete().neq('id', '__none__');

  const { error } = await supabase.from('elements').insert([
    { id: 'fire', name: 'Fire', emoji: '🔥', rarity: 'common', discovery_count: 0 },
    { id: 'water', name: 'Water', emoji: '💧', rarity: 'common', discovery_count: 0 },
    { id: 'earth', name: 'Earth', emoji: '🌍', rarity: 'common', discovery_count: 0 },
    { id: 'air', name: 'Air', emoji: '💨', rarity: 'common', discovery_count: 0 }
  ]);
  if (error) throw new Error(`Failed to reseed base elements: ${error.message}`);

  console.log('Wiped and reseeded with base 4 elements.');
};

wipe().catch(error => {
  console.error('Wipe failed:', error);
  process.exit(1);
});

import { supabase, type ElementRecord } from '../lib/supabase'

// Get all elements from Supabase
export const getElements = async (): Promise<ElementRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('elements')
      .select('*')
      .order('rarity', { ascending: true })

    if (error) {
      console.error('Error fetching elements:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching elements:', error)
    return []
  }
}

// Get a specific element by ID
export const getElement = async (id: string): Promise<ElementRecord | null> => {
  try {
    const { data, error } = await supabase
      .from('elements')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching element:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching element:', error)
    return null
  }
}

// Add a new element
export const addElement = async (
  id: string,
  name: string,
  emoji: string,
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
): Promise<ElementRecord | null> => {
  try {
    const { data, error } = await supabase
      .from('elements')
      .insert({
        id,
        name,
        emoji,
        rarity
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding element:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error adding element:', error)
    return null
  }
}

// Update an existing element
export const updateElement = async (
  id: string,
  name: string,
  emoji: string,
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
): Promise<ElementRecord | null> => {
  try {
    const { data, error } = await supabase
      .from('elements')
      .update({
        name,
        emoji,
        rarity
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating element:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error updating element:', error)
    return null
  }
}

// Delete an element
export const deleteElement = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('elements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting element:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting element:', error)
    return false
  }
}

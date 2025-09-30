import { supabase, type CombinationRecord } from '../lib/supabase'

// Get all combinations from Supabase
export const getCombinations = async (): Promise<CombinationRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('combinations')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching combinations:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching combinations:', error)
    return []
  }
}

// Find a specific combination
export const findCombination = async (element1: string, element2: string): Promise<CombinationRecord | null> => {
  try {
    // Try both orders since combinations are bidirectional
    const { data, error } = await supabase
      .from('combinations')
      .select('*')
      .or(`and(element1.eq.${element1},element2.eq.${element2}),and(element1.eq.${element2},element2.eq.${element1})`)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error finding combination:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error finding combination:', error)
    return null
  }
}

// Add a new combination
export const addCombination = async (
  element1: string, 
  element2: string, 
  result: string
): Promise<CombinationRecord | null> => {
  try {
    // Ensure consistent ordering (alphabetically)
    const [first, second] = [element1, element2].sort()
    
    const { data, error } = await supabase
      .from('combinations')
      .insert({
        element1: first,
        element2: second,
        result: result
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding combination:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error adding combination:', error)
    return null
  }
}

// Delete a combination
export const deleteCombination = async (id: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('combinations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting combination:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting combination:', error)
    return false
  }
}

// Update an existing combination
export const updateCombination = async (
  id: number, 
  element1: string, 
  element2: string, 
  result: string
): Promise<CombinationRecord | null> => {
  try {
    const [first, second] = [element1, element2].sort()
    
    const { data, error } = await supabase
      .from('combinations')
      .update({
        element1: first,
        element2: second,
        result: result
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating combination:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error updating combination:', error)
    return null
  }
}

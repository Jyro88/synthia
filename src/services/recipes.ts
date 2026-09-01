import { supabase, type RecipeRecord } from '../lib/supabase'

// Sorted, '+'-joined element ids -- the same key format used by combination_attempts
// in the populate script, so lookups and dedup logic stay consistent everywhere.
const buildIngredientKey = (elementIds: string[]): string => {
  return [...elementIds].sort().join('+')
}

// Get all recipes from Supabase
export const getRecipes = async (): Promise<RecipeRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching recipes:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return []
  }
}

// Find the recipe for an exact set of ingredients (order doesn't matter)
export const findRecipe = async (elementIds: string[]): Promise<RecipeRecord | null> => {
  try {
    const ingredientKey = buildIngredientKey(elementIds)

    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('ingredient_key', ingredientKey)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error finding recipe:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error finding recipe:', error)
    return null
  }
}

// Add a new recipe for a set of ingredients (2 or more elements)
export const addRecipe = async (
  elementIds: string[],
  result: string,
  reasoning?: string,
  source: 'bot' | 'player_ai' = 'player_ai'
): Promise<RecipeRecord | null> => {
  try {
    const ingredientKey = buildIngredientKey(elementIds)

    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        ingredient_key: ingredientKey,
        result,
        reasoning: reasoning || null,
        source
      })
      .select()
      .single()

    if (recipeError || !recipe) {
      console.error('Error adding recipe:', recipeError)
      return null
    }

    const uniqueElementIds = [...new Set(elementIds)]
    const { error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .insert(uniqueElementIds.map(elementId => ({ recipe_id: recipe.id, element_id: elementId })))

    if (ingredientsError) {
      console.error('Error adding recipe ingredients:', ingredientsError)
      return null
    }

    return recipe
  } catch (error) {
    console.error('Error adding recipe:', error)
    return null
  }
}

export interface RecipeDetail {
  ingredients: { id: string; name: string; emoji: string }[]
  reasoning: string | null
}

interface RawRecipeIngredientRow {
  element_id: string
  elements: { id: string; name: string; emoji: string } | null
}

interface RawRecipeRow {
  reasoning: string | null
  recipe_ingredients: RawRecipeIngredientRow[] | null
}

// Get every known recipe that produces this element, with ingredient names/emoji
// resolved -- used by the element detail view so players can see how something
// is made without needing the ingredient ids.
export const getRecipesForResult = async (resultId: string): Promise<RecipeDetail[]> => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('reasoning, recipe_ingredients(element_id, elements(id, name, emoji))')
      .eq('result', resultId)
      .returns<RawRecipeRow[]>()

    if (error) {
      console.error('Error fetching recipes for result:', error)
      return []
    }

    return (data || []).map((recipe) => ({
      reasoning: recipe.reasoning,
      ingredients: (recipe.recipe_ingredients || []).map((ri) => ({
        id: ri.elements?.id ?? ri.element_id,
        name: ri.elements?.name ?? ri.element_id,
        emoji: ri.elements?.emoji ?? '❓'
      }))
    }))
  } catch (error) {
    console.error('Error fetching recipes for result:', error)
    return []
  }
}

// Delete a recipe
export const deleteRecipe = async (id: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting recipe:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting recipe:', error)
    return false
  }
}

import { supabase } from '../lib/supabase'
import { getUserId } from './user'

export interface LiveJudgeElement {
  id: string
  name: string
  emoji: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

export type LiveJudgeResult =
  | { approved: true; element: LiveJudgeElement; isNew: boolean }
  | { approved: false; reasoning?: string }

// Calls the judge-combination Edge Function for a 2-ingredient combination
// with no existing recipe. The function itself decides approve/reject using
// the same six-checkpoint Judge logic as the offline batch pipeline -- there
// is no manual approval step here, this always resolves automatically.
export const evaluateCombinationLive = async (elementIds: [string, string]): Promise<LiveJudgeResult> => {
  try {
    const userId = await getUserId()
    const { data, error } = await supabase.functions.invoke('judge-combination', {
      body: { elementIds, userId }
    })

    if (error) {
      console.error('Error invoking judge-combination:', error)
      return { approved: false }
    }

    return data as LiveJudgeResult
  } catch (error) {
    console.error('Error evaluating combination live:', error)
    return { approved: false }
  }
}

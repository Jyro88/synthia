import { callGemini } from './gemini';
import type { ElementRow } from './db';
import { buildPrompt, applyGuardrails, JUDGE_RESPONSE_SCHEMA, type JudgeVerdict, type RawJudgeResponse } from '../../shared/judge/core';

export type { JudgeVerdict };

export const evaluateCombination = async (
  ingredients: ElementRow[],
  knownElements: ElementRow[],
  resultUsageCounts: Map<string, number>,
  recipesByResultName: Map<string, string[]>
): Promise<JudgeVerdict | null> => {
  const response = await callGemini(
    buildPrompt(ingredients, knownElements, resultUsageCounts, recipesByResultName),
    JUDGE_RESPONSE_SCHEMA
  ) as RawJudgeResponse | null;

  return applyGuardrails(ingredients, response);
};

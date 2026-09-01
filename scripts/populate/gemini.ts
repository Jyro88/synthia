import { geminiApiKey } from './env';

// Pinned to specific models with known, workable free-tier quotas -- NOT the
// "-latest" aliases. Those silently float to whatever Google's newest flagship
// is, which gets a razor-thin free daily quota (gemini-3.6-flash: 20 requests/
// day, 5 RPM). gemini-3.5-flash-lite has 500 RPD / 15 RPM; gemini-2.5-flash is
// a distinct fallback bucket (20 RPD) for when the primary is exhausted.
// Check current numbers at https://aistudio.google.com/rate-limit before
// changing these.
const ENDPOINTS = [
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface GeminiApiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

// Global outbound-request pacer, shared across all concurrent workers. Reactive
// backoff (below) only kicks in after a 429; this prevents the burst in the first
// place by spacing every real network call at least this far apart, regardless of
// how many workers are running.
let minIntervalMs = 4500; // ~13.3 req/min, safely under gemini-3.5-flash-lite's 15 RPM cap
let nextAvailableAt = 0;

export const setMinIntervalMs = (ms: number): void => {
  minIntervalMs = ms;
};

const paceRequest = async (): Promise<void> => {
  const waitUntil = Math.max(Date.now(), nextAvailableAt);
  nextAvailableAt = waitUntil + minIntervalMs;
  const delay = waitUntil - Date.now();
  if (delay > 0) await sleep(delay);
};

// Standalone Node equivalent of src/services/aiGenerator.ts's callGeminiAPI --
// that module reads import.meta.env, which doesn't exist outside Vite, so this
// script needs its own fetch-based caller reading process.env instead.
//
// responseSchema is optional: when provided, it's passed as Gemini's structured-
// output config (responseMimeType + responseSchema) so the API itself enforces
// the response shape/field order/types instead of relying on the model to follow
// the example JSON in the prompt text. Same single call, no added cost.
export const callGemini = async (prompt: string, responseSchema?: object): Promise<unknown> => {
  for (const endpoint of ENDPOINTS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      let response: Response;
      try {
        await paceRequest();
        response = await fetch(`${endpoint}?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 8192,
              ...(responseSchema ? { responseMimeType: 'application/json', responseSchema } : {})
            }
          })
        });
      } catch (error) {
        console.error(`Gemini request failed (${endpoint}):`, error);
        break; // try the next endpoint
      }

      if (response.status === 429) {
        const backoffMs = 1000 * 2 ** attempt;
        console.warn(`Rate limited by ${endpoint}, retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
        continue;
      }

      if (!response.ok) {
        console.error(`Gemini endpoint failed (${endpoint}):`, response.status, await response.text());
        break; // try the next endpoint
      }

      const data = await response.json() as GeminiApiResponse;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.error('Gemini response missing text content:', JSON.stringify(data));
        return null;
      }

      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      try {
        return JSON.parse(jsonText.trim());
      } catch (error) {
        console.error('Failed to parse Gemini JSON response:', jsonText, error);
        return null;
      }
    }
  }

  console.error('All Gemini endpoints failed.');
  return null;
};

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const required = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VITE_GEMINI_API_KEY'] as const;

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key} (checked .env.local)`);
    process.exit(1);
  }
}

export const supabaseUrl = process.env.VITE_SUPABASE_URL!;
export const geminiApiKey = process.env.VITE_GEMINI_API_KEY!;

// Service-role client: bypasses RLS entirely, so it can write regardless of the
// public read/insert policies the live app's anon key is scoped to.
export const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

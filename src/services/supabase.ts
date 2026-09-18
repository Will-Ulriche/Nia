import { createClient } from '@supabase/supabase-js';

// Configuration Supabase récupérée via les variables d'environnement Vite
// (Safe to include publishable keys in client-side code)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL or Key is missing. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

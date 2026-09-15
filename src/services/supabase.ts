import { createClient } from '@supabase/supabase-js';

// Clés publiques Supabase (safe to include in client-side code)
// La "publishable key" est la nouvelle norme recommandée par Supabase
const supabaseUrl = 'https://wfjyyjmulzxlqkeoctlw.supabase.co';
const supabaseKey = 'sb_publishable_ddQ1aWQMxigxDvJa4lcGFQ_8ujwDbtf';

export const supabase = createClient(supabaseUrl, supabaseKey);

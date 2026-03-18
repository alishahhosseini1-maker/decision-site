import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  throw new Error('Supabase URL is missing or invalid');
}

if (!supabaseAnonKey) {
  throw new Error('Supabase anon key is missing');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
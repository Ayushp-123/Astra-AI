import { createClient } from '@supabase/supabase-js';

/**
 * ASTRA AI Supabase Client Initializer
 * 
 * Safely initializes Supabase Auth using public client environment variables.
 * Gracefully handles unconfigured or test environments without crashing.
 */

const getEnvVar = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = () => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (supabaseUrl === 'https://your-project.supabase.co') return false;
  if (supabaseAnonKey === 'your-supabase-anon-key-here') return false;
  try {
    new URL(supabaseUrl);
    return true;
  } catch {
    return false;
  }
};

let client = null;

if (isSupabaseConfigured()) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  } catch (err) {
    console.warn('[ASTRA Auth] Supabase client initialization failed:', err);
    client = null;
  }
}

export const supabase = client;

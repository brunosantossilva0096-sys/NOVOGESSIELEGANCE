import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate URL format to prevent new URL() errors in createClient
const isValidUrl = (url: string) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

if (!isValidUrl(supabaseUrl) || !supabaseAnonKey) {
    console.error('Supabase credentials missing or invalid. Check your VERCEL environment variables.');
}

// Initialize with fallback to empty strings if missing, but we've warned the user
export const supabase = createClient(
    isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder-url.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);

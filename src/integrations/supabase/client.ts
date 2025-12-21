import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://atwqneesdaeuhsylvsnr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0d3FuZWVzZGFldWhzeWx2c25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzc1MTksImV4cCI6MjA4MTg1MzUxOX0.6ZEONGUwSN0dYZtrMXMThaLpkIFD0L5PYX30upqLGl0";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
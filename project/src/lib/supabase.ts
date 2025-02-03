import { createClient } from '@supabase/supabase-js';
import { config } from './config';

if (!config.supabase.isConfigured) {
  throw new Error('Supabase is not configured');
}

export const supabase = createClient(config.supabase.url, config.supabase.anonKey);
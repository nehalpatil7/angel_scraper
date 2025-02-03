export const config = {
  serpApi: {
    key: import.meta.env.VITE_SERP_API_KEY,
    isConfigured: Boolean(import.meta.env.VITE_SERP_API_KEY)
  },
  apolloApi: {
    key: import.meta.env.VITE_APOLLO_API_KEY,
    isConfigured: Boolean(import.meta.env.VITE_APOLLO_API_KEY)
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    isConfigured: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
  }
};
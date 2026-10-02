import { createClient } from '@supabase/supabase-js'

// All jajanan app data lives in the 'jajanan' schema on the shared Supabase instance
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    db: { schema: 'jajanan' },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // PKCE returns ?code=... (query string) instead of #access_token=...
      // (hash fragment), so it doesn't collide with Vue Router's hash history.
      flowType: 'pkce',
    },
  }
)

// Emails allowed admin (CRUD) access to this app. Everyone else who signs
// in with Google is a regular member (read catalog, own favorites/orders).
export const ADMIN_EMAILS = ['ulfillah49@gmail.com', 'dhanifudin@gmail.com']

import { createBrowserClient } from '@supabase/ssr'

const PLACEHOLDER = ['your_supabase_project_url', 'your_supabase_anon_key', '', undefined]

export function isSupabaseConfigured(): boolean {
  return (
    !PLACEHOLDER.includes(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !PLACEHOLDER.includes(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

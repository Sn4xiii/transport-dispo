import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

declare global {
  var supabaseClient: ReturnType<typeof createBrowserClient> | undefined
}

export const supabase =
  globalThis.supabaseClient ??
  createBrowserClient(supabaseUrl, supabaseAnonKey)

if (typeof window !== "undefined") {
  globalThis.supabaseClient = supabase
}
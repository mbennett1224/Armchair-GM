import { createClient } from "@supabase/supabase-js";
import "cross-fetch/polyfill";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase env vars: REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY");
}

const boundFetch =
  typeof window !== "undefined" && window.fetch
    ? window.fetch.bind(window)
    : (...args) => fetch(...args);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: boundFetch },
  auth: {
    flowType: "implicit", // avoid flowType undefined bug
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export default supabase;

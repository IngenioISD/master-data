import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://odzmnfuatigntblqutvf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kem1uZnVhdGlnbnRibHF1dHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjQ5NzIsImV4cCI6MjA5MzgwMDk3Mn0.l3P3jtbKDcGEpQBlvDJI9k70fa8t2V4RhWF83L8-JAQ";

if (!SUPABASE_PUBLISHABLE_KEY && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn("[Datos Maestros] VITE_SUPABASE_PUBLISHABLE_KEY no está definida. Configúrala en .env.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "datos-maestros-auth",
  },
});

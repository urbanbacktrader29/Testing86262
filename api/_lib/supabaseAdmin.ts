import { createClient } from "@supabase/supabase-js";

/**
 * Service-Role-Client — läuft ausschließlich serverseitig (Vercel Functions).
 * Umgeht Row-Level-Security bewusst: Zugriff auf `document_analyses` ist
 * damit nur über diesen Server-Code möglich, nie direkt vom Browser aus.
 */
const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY sind auf dem Server nicht gesetzt.");
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});

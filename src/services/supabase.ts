import { createClient } from "@supabase/supabase-js";

/**
 * Bewusst im Client-Bundle: Supabase-Publishable-Keys sind für den Einsatz im
 * Browser gedacht (kein Geheimnis). Der eigentliche Zugriffsschutz läuft über
 * Row-Level-Security-Policies in der Datenbank, nicht über die Geheimhaltung
 * dieses Keys.
 */
const SUPABASE_URL = "https://ycedguriwlcardgyagxb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_u55uoM7yAb9OiMnYGQCw6w_OCi4FIwP";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

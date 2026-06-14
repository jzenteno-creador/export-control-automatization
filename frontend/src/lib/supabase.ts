const SUPABASE_URL = "https://cctuowthpnstvdgjuomq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjdHVvd3RocG5zdHZkZ2p1b21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MjkyNTUsImV4cCI6MjA5MjQwNTI1NX0.7a0cw6R1-FRVdlA5in-IVvUu2KBEM3_I7GRy_5hbGBQ";
const TABLE = "inbound_events";
const SOURCE = "sap-304-webhook";
const LIMIT = 200;

export interface InboundEvent {
  id: string;
  source: string;
  payload_hash: string;
  payload: Record<string, unknown>;
  payload_size_bytes: number;
  received_at: string;
}

export async function fetchEvents(): Promise<InboundEvent[]> {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?source=eq.${SOURCE}&order=received_at.desc&limit=${LIMIT}`;
  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status}: ${text || r.statusText}`);
  }
  return r.json();
}

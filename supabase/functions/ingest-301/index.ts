// supabase/functions/ingest-301/index.ts
//
// Walking Skeleton — receptor del JSON del 301 de Metric.
//
// Diseño espejo de ingest-304: source-agnostic, persist first, idempotente
// vía SHA-256 + UNIQUE (source, payload_hash). Único cambio sustantivo es
// el SOURCE y el secret consumido.
//
// Contrato:
//   POST /functions/v1/ingest-301
//   Header: X-Webhook-Secret: <shared secret específico de 301>
//   Body:   JSON crudo del 301
//
// Respuestas:
//   200 { event_id, duplicate: false }  → payload nuevo persistido
//   200 { event_id, duplicate: true  }  → payload ya visto (idempotencia)
//   400 { error: "invalid_json" }       → body no es JSON válido
//   400 { error: "body_read_failed" }   → lectura del body falló
//   401 { error: "unauthorized" }       → header X-Webhook-Secret ausente o inválido
//   405 { error: "method_not_allowed" } → método distinto a POST
//   500 { error: "internal" }           → error inesperado (DB, etc.)
//
// Principios (idénticos a ingest-304):
//   - Persist first, process after: payload guardado crudo en JSONB.
//   - Idempotencia POR FUENTE vía SHA-256 + UNIQUE (source, payload_hash).
//   - Sin acoplamiento al schema del 301 — cualquier JSON válido entra.
//   - Cada intento (exitoso o fallido) se bitacorea en inbound_log.
//
// Naming asimétrico aceptado: 304 usa WEBHOOK_SECRET, 301 usa WEBHOOK_SECRET_301.
// Ver docs/webhook-contract-301.md.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET_301 = Deno.env.get("WEBHOOK_SECRET_301")!;

const SOURCE = "metric-301-webhook";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type LogResult = "inserted" | "duplicate" | "auth_failed" | "bad_json" | "error";

async function sha256Hex(input: string): Promise<string> {
  const buffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function extractIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

async function logAttempt(params: {
  sourceIp: string | null;
  userAgent: string | null;
  payloadSize: number | null;
  payloadHash: string | null;
  result: LogResult;
  statusCode: number;
  errorMessage: string | null;
  eventId: string | null;
}): Promise<void> {
  const { error } = await supabase.from("inbound_log").insert({
    source_ip: params.sourceIp,
    user_agent: params.userAgent,
    payload_size_bytes: params.payloadSize,
    payload_hash: params.payloadHash,
    result: params.result,
    status_code: params.statusCode,
    error_message: params.errorMessage,
    event_id: params.eventId,
  });
  if (error) {
    console.error("inbound_log insert failed:", error.message);
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  const sourceIp = extractIp(req);
  const userAgent = req.headers.get("user-agent");

  if (req.method !== "POST") {
    await logAttempt({
      sourceIp,
      userAgent,
      payloadSize: null,
      payloadHash: null,
      result: "error",
      statusCode: 405,
      errorMessage: `Method ${req.method} not allowed`,
      eventId: null,
    });
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const presented = req.headers.get("x-webhook-secret");
  if (!presented || presented !== WEBHOOK_SECRET_301) {
    await logAttempt({
      sourceIp,
      userAgent,
      payloadSize: null,
      payloadHash: null,
      result: "auth_failed",
      statusCode: 401,
      errorMessage: "missing or invalid X-Webhook-Secret",
      eventId: null,
    });
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let bodyText: string;
  let payloadSize: number;
  try {
    bodyText = await req.text();
    payloadSize = new TextEncoder().encode(bodyText).length;
  } catch (err) {
    const message = (err as Error).message;
    await logAttempt({
      sourceIp,
      userAgent,
      payloadSize: null,
      payloadHash: null,
      result: "error",
      statusCode: 400,
      errorMessage: `body read failed: ${message}`,
      eventId: null,
    });
    return Response.json({ error: "body_read_failed" }, { status: 400 });
  }

  const payloadHash = await sha256Hex(bodyText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch (err) {
    await logAttempt({
      sourceIp,
      userAgent,
      payloadSize,
      payloadHash,
      result: "bad_json",
      statusCode: 400,
      errorMessage: `JSON parse failed: ${(err as Error).message}`,
      eventId: null,
    });
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const { data: inserted, error: insertError } = await supabase
      .from("inbound_events")
      .insert({
        source: SOURCE,
        payload_hash: payloadHash,
        payload: parsed,
        payload_size_bytes: payloadSize,
      })
      .select("id")
      .single();

    if (insertError) {
      // 23505 = unique_violation: (source, payload_hash) ya existe.
      if (insertError.code === "23505") {
        const { data: existing, error: selectError } = await supabase
          .from("inbound_events")
          .select("id")
          .eq("source", SOURCE)
          .eq("payload_hash", payloadHash)
          .single();

        if (selectError) throw selectError;

        await logAttempt({
          sourceIp,
          userAgent,
          payloadSize,
          payloadHash,
          result: "duplicate",
          statusCode: 200,
          errorMessage: null,
          eventId: existing.id,
        });
        return Response.json(
          { event_id: existing.id, duplicate: true },
          { status: 200 },
        );
      }
      throw insertError;
    }

    await logAttempt({
      sourceIp,
      userAgent,
      payloadSize,
      payloadHash,
      result: "inserted",
      statusCode: 200,
      errorMessage: null,
      eventId: inserted.id,
    });
    return Response.json(
      { event_id: inserted.id, duplicate: false },
      { status: 200 },
    );
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("ingest-301 error:", message);
    await logAttempt({
      sourceIp,
      userAgent,
      payloadSize,
      payloadHash,
      result: "error",
      statusCode: 500,
      errorMessage: message,
      eventId: null,
    });
    return Response.json({ error: "internal" }, { status: 500 });
  }
});

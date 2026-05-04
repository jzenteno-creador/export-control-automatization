# Webhook contract — `ingest-301`

> Contrato del endpoint que recibe el mensaje **301** de Metric.
> Espejo de [`webhook-contract-304.md`](./webhook-contract-304.md). Las únicas diferencias materiales son el nombre del secret y el `source` que se persiste.

**Estado**: ✅ desplegado — 2026-05-04.
**Versión**: 1.

---

## 1. Endpoint

```
POST https://cctuowthpnstvdgjuomq.supabase.co/functions/v1/ingest-301
Content-Type: application/json
X-Webhook-Secret: <shared secret>
```

- TLS 1.2+ obligatorio.
- Sin JWT (`verify_jwt = false`). La autenticación es por shared secret.
- Body: JSON crudo del 301. **No se valida el schema** — cualquier JSON pasa.

---

## 2. Autenticación

Header `X-Webhook-Secret` con el valor compartido. El secret vive en:

- **Servidor (runtime)**: Project Setting `WEBHOOK_SECRET_301` en Supabase Dashboard → Project Settings → Edge Functions → Secrets.
- **Cliente (Metric)**: copia entregada por canal privado tras rotación.

**Naming asimétrico aceptado** (decisión sesión 2026-05-04):

| Endpoint | Secret env var |
|---|---|
| `ingest-304` (SAP) | `WEBHOOK_SECRET` (sin sufijo, legacy) |
| `ingest-301` (Metric) | `WEBHOOK_SECRET_301` |

No se renombra el secret de 304 para no romper el deploy productivo del walking skeleton ya activo.

---

## 3. Respuestas

| Status | Body | Significado |
|---|---|---|
| 200 | `{"event_id": "<uuid>", "duplicate": false}` | Payload nuevo persistido |
| 200 | `{"event_id": "<uuid>", "duplicate": true}` | Mismo `(source, payload_hash)` ya existente |
| 400 | `{"error": "invalid_json"}` | Body no es JSON válido |
| 400 | `{"error": "body_read_failed"}` | Lectura del body falló |
| 401 | `{"error": "unauthorized"}` | Header ausente o inválido |
| 405 | `{"error": "method_not_allowed"}` | Método distinto a POST |
| 500 | `{"error": "internal"}` | Error inesperado (DB, etc.) |

El `event_id` permite a Metric correlacionar reintentos: si reenvía el mismo body byte-a-byte, recibe el mismo `event_id` con `duplicate: true`.

---

## 4. Idempotencia

**Por fuente.** El SHA-256 hex del body crudo se combina con `source = 'metric-301-webhook'` para deduplicar. Constraint: `UNIQUE (source, payload_hash)` en `public.inbound_events` (migration `sql/002_multi_source_support.sql`).

Implicación: el 301 y el 304 pueden, en teoría, ingresar el mismo `payload_hash` sin colisionar — quedan como dos filas separadas en `inbound_events`, una por fuente.

El hash se calcula sobre el body **crudo**, sin canonicalización. Si Metric serializa el mismo evento dos veces con whitespace distinto, son tratados como eventos diferentes.

---

## 5. Persistencia

Cada request se persiste en dos tablas:

- `public.inbound_events` — payload crudo, una fila por evento único `(source, payload_hash)`. Inmutable.
- `public.inbound_log` — bitácora de cada intento (incluye `auth_failed`, `bad_json`, etc.).

Schema completo: ver [`docs/walking-skeleton.md`](./walking-skeleton.md) §3.

`source` siempre se persiste como `'metric-301-webhook'`. **No** se infiere del payload ni del header.

---

## 6. Reintentos esperados desde Metric

- En cualquier error transitorio de red (timeout, 5xx), reintentar con backoff exponencial.
- En `200 duplicate: true`, **no** reintentar — el evento ya está persistido.
- En `401`/`400`, **no** reintentar automáticamente — escalar a equipo de integración.

---

## 7. Rotación del secret

1. Generar nuevo valor: `openssl rand -hex 24`.
2. Dashboard Supabase → Project Settings → Edge Functions → Secrets → editar `WEBHOOK_SECRET_301`.
3. Avisar a Metric por canal privado (no email, no chat público).
4. Supabase aplica el cambio sin redeploy explícito.

**Si el secret se filtra:** rotar inmediatamente y auditar `inbound_log` por `source_ip` anómalas.

---

## 8. No-goals (alineado con walking skeleton)

- **No HMAC todavía**. Solo shared secret. HMAC queda para producción cuando lo coordine Santiago.
- **No rate limiting**. Endpoint público protegido solo por secret.
- **No alertas**. Si el endpoint cae, nadie se entera hasta que alguien consulta `inbound_log`.
- **No parseo del 301**. Cualquier JSON válido entra.

---

## 9. Test rápido (debug local)

```bash
source .env.local

# Auth fail (sin header)
curl -i -X POST "$SUPABASE_URL/functions/v1/ingest-301" \
  -H "Content-Type: application/json" \
  --data '{}'
# → 401 unauthorized

# JSON inválido
curl -i -X POST "$SUPABASE_URL/functions/v1/ingest-301" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET_301" \
  --data 'not-json'
# → 400 invalid_json

# Payload nuevo
curl -i -X POST "$SUPABASE_URL/functions/v1/ingest-301" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET_301" \
  --data '{"po":"TEST-301","stage":"accepted"}'
# → 200 inserted

# Idempotencia (mismo body)
curl -i -X POST "$SUPABASE_URL/functions/v1/ingest-301" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET_301" \
  --data '{"po":"TEST-301","stage":"accepted"}'
# → 200 duplicate, mismo event_id
```

---

## 10. Cambios respecto al walking skeleton del 304

- `source = 'metric-301-webhook'` (no `'sap-304-webhook'`).
- Secret `WEBHOOK_SECRET_301` (no `WEBHOOK_SECRET`).
- Lookup del duplicate filtra por `(source, payload_hash)` (no solo `payload_hash`), correcto bajo composite UNIQUE.

Resto idéntico: lógica, respuestas, logging.

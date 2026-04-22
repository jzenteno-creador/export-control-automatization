# Walking Skeleton — Ingesta del 304

**Estado**: ✅ deployado y verificado.
**Versión**: 1 — 2026-04-22.

Primera versión end-to-end del dashboard. Recibe JSON crudo del 304 vía HTTP, lo persiste en Supabase con idempotencia, y loguea cada intento. Es un esqueleto que camina: sin parseo de campos, sin notificaciones, sin UI. La primera slice vertical que toca todos los componentes del stack.

---

## 1. Qué entra y qué sale

```
cliente HTTP (SAP / Brian / curl)
        │
        │ POST JSON + X-Webhook-Secret
        ▼
┌──────────────────────────────────┐
│ Supabase Edge Function ingest-304│
│   1. valida X-Webhook-Secret     │
│   2. lee body crudo              │
│   3. SHA-256 del body            │
│   4. parsea JSON                 │
│   5. INSERT idempotente          │
│   6. log del intento             │
└──────────────┬───────────────────┘
               ▼
         Postgres (Supabase)
         ├── inbound_events (payload crudo)
         └── inbound_log    (auditoría)
```

---

## 2. Dónde vive cada cosa

| Recurso | Ubicación |
|---|---|
| Proyecto Supabase | `ssb-export-dashboard` — ref `cctuowthpnstvdgjuomq` — región `sa-east-1` (São Paulo) — plan free |
| Endpoint público | `https://cctuowthpnstvdgjuomq.supabase.co/functions/v1/ingest-304` |
| Schema SQL | `sql/001_inbound_schema.sql` (fuente de verdad versionable) |
| Edge Function | `supabase/functions/ingest-304/index.ts` |
| Env locales | `.env.local` (gitignoreado) + `.env.local.example` (commiteable) |
| Secret en runtime | Project Secret `WEBHOOK_SECRET` seteado en el Dashboard → Settings → Edge Functions |
| JSONs de prueba | `samples/304/` (11 JSONs reales, gitignoreado) |

---

## 3. Schema

### `public.inbound_events`

Eventos entrantes crudos. Inmutable. Idempotencia vía `payload_hash` unique.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `source` | `text` NOT NULL | `'sap-304-webhook'` por ahora |
| `payload_hash` | `text` NOT NULL **UNIQUE** | SHA-256 hex del body crudo |
| `payload` | `jsonb` NOT NULL | JSON crudo parseado, sin normalizar |
| `payload_size_bytes` | `integer` NOT NULL | |
| `received_at` | `timestamptz` | `now()` |

RLS habilitado, **sin policies**. Solo `service_role` lee/escribe.

### `public.inbound_log`

Bitácora de cada intento, exitoso o no.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `received_at` | `timestamptz` | |
| `source_ip` | `inet` | |
| `user_agent` | `text` | |
| `payload_size_bytes` | `integer` | |
| `payload_hash` | `text` | |
| `result` | `text` CHECK | `inserted`, `duplicate`, `auth_failed`, `bad_json`, `error` |
| `status_code` | `smallint` | HTTP response code emitido |
| `error_message` | `text` | |
| `event_id` | `uuid` FK → `inbound_events.id` | `on delete set null` |

RLS habilitado, sin policies. Índices: `received_at DESC`, `result` parcial sobre errores, `event_id`.

---

## 4. Contrato del endpoint

Resumen. Para la versión formal que se entrega a un consumidor externo, ver `docs/webhook-contract-304.md`.

**Request**
```
POST /functions/v1/ingest-304
Host: cctuowthpnstvdgjuomq.supabase.co
Content-Type: application/json
X-Webhook-Secret: <shared secret>

<JSON body>
```

**Responses**
| Status | Body | Significado |
|---|---|---|
| 200 | `{ "event_id": "...", "duplicate": false }` | Payload nuevo persistido |
| 200 | `{ "event_id": "...", "duplicate": true }`  | Mismo hash ya existente — no se insertó |
| 400 | `{ "error": "invalid_json" }` | Body no es JSON válido |
| 400 | `{ "error": "body_read_failed" }` | Lectura del body falló |
| 401 | `{ "error": "unauthorized" }` | Header ausente o inválido |
| 405 | `{ "error": "method_not_allowed" }` | Método distinto a POST |
| 500 | `{ "error": "internal" }` | Error inesperado (DB, etc.) |

El valor actual del `WEBHOOK_SECRET` está en `.env.local` (no commiteado).

---

## 5. Cómo probarlo

### Desde la terminal

```bash
source .env.local

curl -s -X POST "$SUPABASE_URL/functions/v1/ingest-304" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
  --data-binary @samples/304/0118705352.json
```

Respuesta esperada primera vez:
```json
{"event_id":"<uuid>","duplicate":false}
```

Respuesta repitiendo el mismo payload:
```json
{"event_id":"<mismo uuid>","duplicate":true}
```

### Consultar los datos

Vía MCP de Supabase desde Claude Code:
```
execute_sql(project_id='cctuowthpnstvdgjuomq', query='
  select count(*), count(distinct payload_hash)
  from public.inbound_events;
')
```

O desde SQL editor del Dashboard:
```sql
-- Últimos 20 intentos
select received_at, result, status_code, payload_size_bytes, source_ip
from public.inbound_log
order by received_at desc
limit 20;

-- Último payload recibido
select id, source, received_at, payload
from public.inbound_events
order by received_at desc
limit 1;
```

---

## 6. Gestión del `WEBHOOK_SECRET`

### Rotación
1. Generar nuevo valor: `openssl rand -hex 24` (hex puro, sin `=/+/`).
2. Dashboard → Project Settings → Edge Functions → Secrets → editar `WEBHOOK_SECRET`.
3. Actualizar `.env.local` localmente.
4. Avisar a los consumidores por canal privado (no commit, no chat).

### Si el secret se filtra
Rotar inmediatamente siguiendo los pasos de arriba y auditar `inbound_log` por `source_ip` anómalas.

---

## 7. Qué NO hace este Walking Skeleton (no-goals)

- **No parsea el 304**. El JSON se guarda tal cual entra. Ninguna columna normalizada de `orders`/`shipments`/`entities`. Esto viene en iteraciones posteriores.
- **No valida schema del 304**. Cualquier JSON válido pasa. Si SAP cambia el formato, el endpoint sigue funcionando.
- **No notifica a nadie** cuando entra un evento. Sin webhook saliente, sin mail, sin n8n.
- **No implementa HMAC todavía**. Solo shared secret. HMAC queda para producción con Brian.
- **No tiene UI ni frontend.** Solo endpoint + DB.
- **No toca n8n, Netlify, ni el resto del stack.**

---

## 8. Limitaciones conocidas

- **Migration formal no capturada**: `supabase db pull` requiere `supabase link` que pide DB password (no expuesta vía MCP). El schema vive en `sql/001_inbound_schema.sql`. Cuando se necesite la migration oficial, resetear DB password en Dashboard → Settings → Database, correr `supabase link --project-ref cctuowthpnstvdgjuomq -p <password>` y después `supabase db pull seed_inbound_schema --local --yes`.
- **Idempotencia sin canonicalización**: el hash se calcula sobre el body crudo. Si SAP serializa el mismo 304 dos veces con whitespace distinto, son tratados como eventos diferentes. Aceptable para Walking Skeleton.
- **Sin rate limiting**. El endpoint es público (protegido solo por shared secret).
- **Sin alertas**. Si el endpoint se cae, nadie se entera hasta que alguien consulta `inbound_log`.
- **Sin retención**. `inbound_events` e `inbound_log` crecen indefinidamente. 200 órdenes/mes × ~10 KB payload ≈ 2 MB/mes — sin problema por años, pero sí queda pendiente definir política.

---

## 9. Próximos pasos sugeridos

Orden propuesto:

1. **HMAC** en lugar de shared secret puro (cuando coordinemos con Brian/SAP).
2. **Rate limiting** en la Edge Function (contador en Postgres + cooldown).
3. **Outbox + dispatcher** para notificar a n8n/otros consumidores cuando entra un evento.
4. **Tabla derivada `orders`** con columnas normalizadas extraídas del payload (PO, ShipmentID, MOT, Incoterm, etc.). Es el paso a fase 2 del research.
5. **Alertas**: edge function o pg_cron que notifique si no llega un evento en N horas o si el ratio de `auth_failed` sube.
6. **Retención**: política de archiving o purge para `inbound_events` e `inbound_log`.

---

## 10. Verificación al 2026-04-22

5 tests corridos contra el endpoint desplegado con 3 JSONs distintos de `samples/304/` (2 Trade + 1 STO) + 1 test de idempotencia + 1 test sin auth. Resultado:

| Test | Input | Esperado | Obtenido | ✓ |
|---|---|---|---|---|
| 1A | Trade `0118705352.json` | 200 inserted | 200 inserted, event_id `6368d0cf...` | ✓ |
| 1B | Trade `0118711888.json` | 200 inserted | 200 inserted, event_id `0d5ec8af...` | ✓ |
| 1C | STO `4010470219.json` | 200 inserted | 200 inserted, event_id `2e93fa98...` | ✓ |
| 2 | repite `0118705352.json` | 200 duplicate + mismo event_id que 1A | 200 duplicate + `6368d0cf...` | ✓ |
| 3 | POST sin `X-Webhook-Secret` | 401 unauthorized | 401 unauthorized | ✓ |

Estado final:
- `inbound_events`: 3 filas (count distinct `payload_hash` = 3, sin duplicados).
- `inbound_log`: 10 filas — `inserted: 3`, `duplicate: 1`, `auth_failed: 6` (incluye 5 tests previos con secret rotado).

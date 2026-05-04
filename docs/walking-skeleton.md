# Walking Skeleton — Ingesta del 304 + 301

**Estado**: ✅ deployado y verificado (dos endpoints simétricos).
**Versión**: 2 — 2026-05-04.

Primera versión end-to-end del dashboard. Recibe JSON crudo del 304 (SAP) y del 301 (Metric) vía HTTP, lo persiste en Supabase con idempotencia por fuente, y loguea cada intento. Es un esqueleto que camina: sin parseo de campos, sin notificaciones, sin UI. La primera slice vertical que toca todos los componentes del stack.

---

## 1. Qué entra y qué sale

Dos endpoints simétricos. Mismo contrato técnico, mismo schema, mismo flujo de validación. Cambian SOURCE y secret consumido.

```
SAP / Brian / curl                       Metric / Santiago / curl
        │                                          │
        │ POST JSON                                │ POST JSON
        │ X-Webhook-Secret: $WEBHOOK_SECRET        │ X-Webhook-Secret: $WEBHOOK_SECRET_301
        ▼                                          ▼
┌──────────────────────────────────┐    ┌──────────────────────────────────┐
│ Edge Function ingest-304         │    │ Edge Function ingest-301         │
│   SOURCE = 'sap-304-webhook'     │    │   SOURCE = 'metric-301-webhook'  │
│                                  │    │                                  │
│   1. valida X-Webhook-Secret     │    │   1. valida X-Webhook-Secret     │
│   2. lee body crudo              │    │   2. lee body crudo              │
│   3. SHA-256 del body            │    │   3. SHA-256 del body            │
│   4. parsea JSON                 │    │   4. parsea JSON                 │
│   5. INSERT idempotente          │    │   5. INSERT idempotente          │
│      por (source, payload_hash)  │    │      por (source, payload_hash)  │
│   6. log del intento             │    │   6. log del intento             │
└──────────────┬───────────────────┘    └──────────────┬───────────────────┘
               │                                       │
               └───────────────┬───────────────────────┘
                               ▼
                         Postgres (Supabase)
                         ├── inbound_events (payload crudo, source-tagged)
                         └── inbound_log    (auditoría source-agnostic)
```

Idempotencia bajo composite UNIQUE `(source, payload_hash)`: un mismo body crudo recibido por ambos endpoints persiste como dos filas distintas en `inbound_events` (una por fuente).

---

## 2. Dónde vive cada cosa

| Recurso | Ubicación |
|---|---|
| Proyecto Supabase | `ssb-export-dashboard` — ref `cctuowthpnstvdgjuomq` — región `sa-east-1` (São Paulo) — plan free |
| Endpoint 304 | `https://cctuowthpnstvdgjuomq.supabase.co/functions/v1/ingest-304` |
| Endpoint 301 | `https://cctuowthpnstvdgjuomq.supabase.co/functions/v1/ingest-301` |
| Schema SQL — base | `sql/001_inbound_schema.sql` (fuente de verdad versionable) |
| Schema SQL — multi-source | `sql/002_multi_source_support.sql` (composite UNIQUE, aplicado 04/05) |
| Edge Function 304 | `supabase/functions/ingest-304/index.ts` |
| Edge Function 301 | `supabase/functions/ingest-301/index.ts` |
| Env locales | `.env.local` (gitignoreado) + `.env.local.example` (commiteable) |
| Secret 304 en runtime | Project Secret `WEBHOOK_SECRET` (Dashboard → Settings → Edge Functions → Secrets) |
| Secret 301 en runtime | Project Secret `WEBHOOK_SECRET_301` (Dashboard → Settings → Edge Functions → Secrets) |
| JSONs de prueba 304 | `samples/304/` (gitignoreado, 116 reales descargados al 29/04) |

---

## 3. Schema

### `public.inbound_events`

Eventos entrantes crudos. Inmutable. Idempotencia **por fuente** vía composite UNIQUE `(source, payload_hash)` (migration 002, 04/05).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `source` | `text` NOT NULL | `'sap-304-webhook'` o `'metric-301-webhook'`. Otras fuentes futuras (315, etc.) usan etiqueta propia. |
| `payload_hash` | `text` NOT NULL | SHA-256 hex del body crudo. Parte de UNIQUE composite `(source, payload_hash)` vía migration 002. |
| `payload` | `jsonb` NOT NULL | JSON crudo parseado, sin normalizar |
| `payload_size_bytes` | `integer` NOT NULL | |
| `received_at` | `timestamptz` | `now()` |

RLS habilitado, **sin policies**. Solo `service_role` lee/escribe.

Cambio respecto a la versión 1 del schema (sql/001): el UNIQUE simple sobre `payload_hash` fue reemplazado por composite `(source, payload_hash)` para permitir que dos fuentes distintas ingresen el mismo hash sin colisionar. Los 116 eventos pre-existentes (todos `sap-304-webhook`) satisfacen la nueva constraint.

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

Resumen. Para las versiones formales que se entregan a consumidores externos, ver `docs/webhook-contract-304.md` (304) y `docs/webhook-contract-301.md` (301).

**Request** (mismo formato para ambos endpoints, cambia path y secret)
```
POST /functions/v1/ingest-304   # o /ingest-301
Host: cctuowthpnstvdgjuomq.supabase.co
Content-Type: application/json
X-Webhook-Secret: <shared secret específico del endpoint>

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

## 6. Gestión de secrets por endpoint

Naming asimétrico aceptado: el secret del 304 quedó sin sufijo por motivos históricos (era el único endpoint cuando se desplegó). El secret del 301 sigue la convención sufijada. Normalizar ambos a la misma convención requeriría coordinar rotación con Brian — no se hace por ahora.

| Endpoint | Variable de entorno | Consumidor externo |
|---|---|---|
| `ingest-304` | `WEBHOOK_SECRET` | Brian (Importer Codego) |
| `ingest-301` | `WEBHOOK_SECRET_301` | Santiago (Metric) |

### Rotación (procedimiento idéntico para ambos)
1. Generar nuevo valor: `openssl rand -hex 24` (hex puro, sin `=/+/`).
2. Dashboard → Project Settings → Edge Functions → Secrets → editar la variable correspondiente.
3. Actualizar `.env.local` localmente.
4. Avisar al consumidor del endpoint afectado por canal privado (no commit, no chat). Solo afecta al endpoint cuyo secret se rotó.

### Si un secret se filtra
Rotar inmediatamente el secret del endpoint afectado siguiendo los pasos de arriba. Auditar `inbound_log` por `source_ip` anómalas en la ventana de exposición.

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

## 10. Verificación

### 10.1 Inicial — 2026-04-22 (ingest-304 v1)

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

### 10.2 Multi-source + fix duplicate path — 2026-05-04

Despliegue de `ingest-301 v1` y redeploy de `ingest-304 v5` post migration 002. Ambos verificados por smoke + regresión.

#### Smoke `ingest-301` (4 curls)

| Test | Input | Esperado | Obtenido | ✓ |
|---|---|---|---|---|
| A | POST sin `X-Webhook-Secret` | 401 unauthorized | 401 `{"error":"unauthorized"}` | ✓ |
| B | POST con secret + body `not-json{` | 400 invalid_json | 400 `{"error":"invalid_json"}` | ✓ |
| C | POST con secret + JSON nuevo | 200 inserted, event_id | 200 inserted, event_id `76ee17fc-ddcb-44c8-b27c-dd9f6cb8fc91` | ✓ |
| D | POST repitiendo body de C | 200 duplicate, mismo event_id | 200 duplicate, `76ee17fc...` | ✓ |

#### Regresión `ingest-304` v5 (post-fix duplicate path) — 2 curls

Fix: el SELECT del path de duplicate ahora filtra por `source` además de `payload_hash`, consistente con la composite UNIQUE de la migration 002.

| Test | Input | Esperado | Obtenido | ✓ |
|---|---|---|---|---|
| R1 | `samples/304/0118705352.json` (existe en DB desde 22/04) | 200 duplicate + `6368d0cf...` | 200 duplicate + `6368d0cf-5a11-43b9-9d4b-1c5880e29e72` | ✓ |
| R2 | JSON sintético nuevo | 200 inserted, event_id nuevo | 200 inserted, event_id `58c65cfb-5e7e-484d-88a4-63573d3fdd3e` | ✓ |

Estado final al cierre del 04/05:
- `inbound_events`: 118 filas — `sap-304-webhook` 117 (116 al 29/04 + 1 del test R2) + `metric-301-webhook` 1 (test C/D del smoke).
- Constraint activa: `inbound_events_source_payload_hash_key UNIQUE (source, payload_hash)`. UNIQUE simple sobre `payload_hash` ya no existe.
- `inbound_log` últimos 5 min del cierre: 4 entries del smoke 301 (`auth_failed`, `bad_json`, `inserted`, `duplicate`) + 2 entries de la regresión 304 (`duplicate`, `inserted`). Bitácora limpia y categorizada.

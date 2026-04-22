# Plan de acción — SSB Export Dashboard

**Proyecto**: SSB-IT-RESEARCH
**Última actualización**: 22/04/2026
**Fase actual**: Walking Skeleton desplegado. Endpoint receptor del 304 funcionando. Esperando integración desde Importer (Brian). Aún sin schema normalizado ni MVP.

---

## 1. Stack decidido

- **Supabase** — Postgres + Auth + Realtime + Edge Functions (Deno/TS) + Storage.
- **n8n Cloud** — orquestación de workflows (webhooks, HITL, reintentos).
- **Netlify** — frontend hosting.
- **Claude API** — IA para control documental en fase 2 (vision + OCR para BLs).
- **Resend** — email transaccional (pendiente de configurar dominio).
- **GitHub** — repo privado: `jzenteno-creador/export-control-automatization`.

**Regla de oro**: n8n orquesta, Postgres decide, Claude asiste.

Corolario: lógica de negocio crítica nunca vive dentro de nodos n8n. Va en funciones SQL o Edge Functions testeables. n8n solo invoca.

---

## 2. Criterios no negociables (impuestos por IT de SSB)

1. Logging completo: inputs, outputs, timestamps, estados por cada paso.
2. Idempotencia: mismo mensaje reenviado no duplica efectos.
3. Sin acoplamiento a estructuras internas de Metric/Importer. Solo APIs estables.
4. Validar con Brian/Santiago antes de apoyarse en comportamiento específico del código legacy.
5. Persistir primero, procesar después (el 304 crudo se guarda antes de procesarse).

---

## 3. Arquitectura target (alto nivel)

```
SAP ──304──▶ Importer ──(mecanismo a definir)──▶ dashboard
                                                     │
                                                     ▼
                                      Edge Function: ingest
                                      persiste 304 crudo
                                      + idempotency constraint
                                                     │
                                                     ▼
                                            Postgres (Supabase)
                                            ├── inbound_events
                                            ├── orders
                                            ├── outbox
                                            └── workflow_log
                                                     │
                                                     ▼
                                               n8n workflows
                                                     │
                                                     ▼
                                   Acciones: BL draft, mailing, tracking
```

### 3.1 Patrones críticos (obligatorios)

| Patrón | Qué resuelve | Implementación |
|--------|--------------|----------------|
| **Idempotency** | 304 reenviado no duplica | `INSERT ... ON CONFLICT DO NOTHING` sobre `(source, message_type, external_id)` + hash del payload |
| **Outbox** | Entrega garantizada al consumidor (n8n) sin Kafka/RabbitMQ | Escritura transaccional + dispatcher via `pg_cron` cada 10–30s |
| **Workflow log** | Trazabilidad y REDO | Tabla append-only particionada por mes, JSONB con `jsonb_path_ops` |
| **Saga ligera** | Workflow de 10 etapas con HITL | n8n orquesta, cada etapa chequea precondición. Sin compensaciones automáticas |

### 3.2 Tablas mínimas (propuesta)

- `inbound_events` — qué entró de afuera, inmutable.
- `orders` — estado derivado actual de cada orden.
- `outbox` — mensajes pendientes de despachar a n8n o terceros.
- `workflow_log` — qué hizo el sistema, append-only (particionable por mes).

Schema detallado pendiente de armar. Base de partida: sección 7 de `research.md` (estructura real del JSON del 304) + `business-context.md` (identificadores operativos).

### 3.3 Herramientas externas decididas

| Función | Herramienta | Razón |
|---------|-------------|-------|
| Control documental BL (fase 2) | **Claude Sonnet con vision + OCR complementario** | BLs sin layout fijo. Custom extractors no amortizan a 200 docs/mes. Costo ~USD 12-20/mes |
| Email transaccional | **Resend** | Free tier 3000 emails/mes permanente. SDK Deno/Node directo a Edge Functions |
| Storage de documentos | **Supabase Storage** | RLS directo, signed URLs, CDN integrado. 100 GB incluidos en Pro (USD 25/mes) |

---

## 4. Claude — skills y MCP servers

### 4.1 Skills a activar

- `pdf` + `docx`/`xlsx` (pre-built) — generación de invoices, packing lists, drafts de BL, certificados de origen.
- `mcp-builder` — si se expone Supabase/Laravel como MCP propio.
- `skill-creator` — para crear `ssb-export-docs` con templates, reglas de Incoterms 2020, formato de BL por carrier.

### 4.2 MCP servers a conectar (en orden de prioridad)

1. **GitLab MCP oficial** — acceso a Importer/Metric. Self-hosted de SSB.
2. **Context7** — docs version-specific de Laravel 8 para evitar que Claude alucine APIs modernas.
3. **Serena** — semantic code retrieval sobre PHP. Más eficiente que grep+read en un Laravel grande.
4. **Playwright MCP** — scraping de portales navieras, AFIP/ARCA, tracking.
5. **Exa MCP** — research de normativa aduanera, códigos HS, reglas de origen Mercosur.

**Ya conectados**: Gmail, Google Drive, n8n, Supabase.

### 4.3 MCP a evitar explícitamente

- Postgres MCP oficial (archivado + CVE de SQL injection).
- Slack MCP reference (deprecado).
- Filesystem MCP (redundante con Claude Code nativo).
- Memory servers (over-engineering a escala actual).

---

## 5. Estado actual del repo

- **Repo local**: `~/projects/export-control-automatization/`
- **Repo remoto**: `github.com/jzenteno-creador/export-control-automatization` (privado, sincronizado al 22/04).
- **Commits recientes**:
  - `9529b5b` (21/04): cleanup del validador viejo + rescope del proyecto.
  - `4aedd4a` (22/04): Walking Skeleton del receptor del 304 (schema + Edge Function + .gitignore extendido).
  - `7078467` (22/04): docs del Walking Skeleton (runbook + contrato técnico).
- **Estructura actual**:
  ```
  .claude/skills/supabase/
  .claude/skills/supabase-postgres-best-practices/
  docs/                              (archivos vivos del proyecto + walking-skeleton.md + webhook-contract-304.md)
  samples/304/                       (11 JSONs reales, gitignoreado)
  sql/001_inbound_schema.sql         (schema Supabase versionado)
  supabase/config.toml
  supabase/functions/ingest-304/     (Edge Function desplegada)
  .env.local.example                 (commiteable)
  .env.local                         (gitignoreado, con credenciales)
  .mcp.json                          (gitignoreado)
  CLAUDE.md
  skills-lock.json
  .gitattributes / .gitignore
  ```
- **Proyecto Supabase**: `ssb-export-dashboard` — ref `cctuowthpnstvdgjuomq` — región `sa-east-1` (São Paulo) — plan free.
- **Endpoint productivo**: `https://cctuowthpnstvdgjuomq.supabase.co/functions/v1/ingest-304`.

---

## 6. Documentos vivos del proyecto

| Archivo | Rol | Ubicación |
|---|---|---|
| `research.md` | Descubrimientos sobre Importer, Metric, schema del 304 | Proyecto Claude.ai + `docs/` local |
| `plan.md` | Este archivo — stack, arquitectura, decisiones, backlog | Proyecto Claude.ai + `docs/` local |
| `preguntas.md` | Preguntas abiertas priorizadas por impacto | Proyecto Claude.ai + `docs/` local |
| `business-context.md` | Contexto de negocio SSB × Dow, Ubiquitous Language | Proyecto Claude.ai + `docs/` local |
| `disciplina-operativa.md` | Skill metodológica — cómo trabaja Claude con Jona | Proyecto Claude.ai |
| `walking-skeleton.md` | Runbook interno del primer Walking Skeleton (endpoint receptor del 304) | Proyecto Claude.ai + `docs/` local (desde 22/04) |
| `webhook-contract-304.md` | Contrato técnico para consumidores externos (Brian/SAP) | `docs/` local únicamente (no va al proyecto Claude.ai) |

---

## 7. Decisiones tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 21/04 | No leer lógica interna del Importer. Consumir solo contratos públicos (Scribe + API REST). | Recomendación de Julio. Evita acoplamiento. |
| 21/04 | Arrancar por el 304 (Importer). Dejar 301 y 315 (Metric) para fase posterior. | Foco en el punto de entrada. |
| 21/04 | Control de BL con IA fuera del MVP. | Alto riesgo documental. Requiere histórico como ground truth. |
| 21/04 | Stack: Supabase + n8n + Netlify + Claude API + GitHub. No migrar a Temporal/Inngest/Trigger.dev. | Escala actual (150-200 órdenes/mes) no lo justifica. |
| 21/04 | Research y build en proyectos separados en Claude.ai. | Higiene de contexto. |
| 21/04 | Reutilizar el repo existente `export-control-automatization` como base. | Ya existía, nombre funcional. |
| 21/04 | Cleanup total del código del validador viejo (Python + Google Drive). | Alcance cambió sustancialmente. Git conserva el histórico. |
| 21/04 | Commit del cleanup sin push a GitHub. | Push pendiente. |
| 22/04 | Adoptar `disciplina-operativa.md` como skill metodológica del proyecto. | Evitar over-engineering, adelantos sin datos, option-dumps, sycophancy. |
| 22/04 | Formato del JSON del 304 estable por parte de Dow. No se planea modificar. | Dow lo confirmó operativamente. Schema documentado en `research.md` sección 7. |
| 22/04 | Persistir el 304 crudo completo + columnas normalizadas para campos categoría A. | Fidelidad del input + velocidad de query sin sacrificar trazabilidad. |
| 22/04 | `business-context.md` como 5° archivo vivo del proyecto. | Ubiquitous Language (DDD). Fuente única de nombres de dominio para código, prompts, conversaciones. |
| 22/04 | Q15 cerrada — PO `0118...` = Trade, `4010...` = STO intercompany. | Confirmado operativamente por Jona. Detalle en `business-context.md` 4.3. |
| 22/04 | Metric investigado. Descartado como fuente para el dashboard. | Flask+MySQL, no persiste crudo, no idempotente, sin webhooks salientes, repo legacy. Ver `research.md` sección 4. |
| 22/04 | **Opción B elegida** — consumir el 304 vía webhook desde el Importer Laravel. | Importer sí persiste crudo (Logs de JSON), Brian dev interno accesible, respeta criterios no-negociables #2 (idempotencia) y #5 (persistir crudo). Descartadas A (SAP no lo hace), C (pull tiene latencia), D (Metric no sirve). |
| 22/04 | Proyecto Supabase `ssb-export-dashboard` creado de cero en `sa-east-1`. | Proyecto master del dashboard. Separado del validador-aduanal. Plan free inicial. |
| 22/04 | Walking Skeleton del receptor del 304 desplegado y verificado. | Endpoint funcional con idempotencia + auditoría. Validado con 5 tests contra JSONs reales. Base para que Brian integre desde Importer. |
| 22/04 | Auth del Walking Skeleton por shared secret (header `X-Webhook-Secret`). HMAC queda para producción real. | Simplicidad en primera iteración. HMAC está registrado como deuda técnica. |
| 22/04 | Mail a Brian enviado solicitando replicación del 304 al endpoint desde Importer. | Pedido formal con OK de Mariano. Esperando respuesta de viabilidad técnica. |

---

## 8. Backlog (fase de investigación + Walking Skeleton)

Estado de tareas:

1. ✅ **Descargar JSONs reales del 304** del módulo Logs de JSON del Importer. **Cerrada 22/04** — 11 JSONs en `samples/304/`.
2. ✅ **Documentar schema del 304** por inferencia de JSONs reales. **Cerrada 22/04** — `research.md` sección 7.
3. ✅ **Investigar repo de Metric** (`sosab-api`) buscando APIs públicas y mecanismo de ingreso del 304. **Cerrada 22/04** — `research.md` sección 4. Conclusión: Metric no sirve como fuente.
4. ✅ **Decisión arquitectónica del mecanismo de ingesta**. **Cerrada 22/04** — Opción B (webhook desde Importer Laravel).
5. ✅ **Walking Skeleton del endpoint receptor del 304**. **Cerrada 22/04** — desplegado en Supabase, verificado con 5 tests.
6. ✅ **Mail a Brian solicitando replicación del 304**. **Cerrada 22/04** — enviado con URL, headers, contrato mínimo.
7. ⏳ **Respuesta de Brian sobre viabilidad técnica** y cronograma para implementar el webhook desde Importer.
8. ⏳ **Resolver preguntas Q16-Q19, Q21-Q23** con Brian cuando haya reunión técnica.
9. ⏳ **Mapear flujo de exportación as-is** con el equipo de documentación. Parcialmente cubierto en `business-context.md` sección 7. Falta validar con documentales.
10. ⏳ **Cargar los 11 JSONs de `samples/304/`** al endpoint manualmente para tener data de prueba real en `inbound_events`.
11. ⏳ **Primer draft de schema normalizado** (`orders`, `shipments`, `entities`, `outbox`, `workflow_log`). **Prerequisitos duros**: Brian confirma e implementa el webhook; primeros 20-30 eventos reales en `inbound_events`; goals/non-goals del MVP escritos; C4 L1 dibujado; pre-mortem del MVP.
12. ⏳ **Manual de configuración de VS Code** (pendiente, no urgente).

---

## 9. Próximos pasos concretos

Orden sugerido para la próxima sesión:

1. **Jona**: verificar si Brian respondió. Si sí, ajustar según su feedback técnico.
2. **Jona**: cargar los 11 JSONs de `samples/304/` al endpoint manualmente (con `curl` o script simple) para tener datos reales en `inbound_events`. Esto destraba el análisis de los payloads desde SQL.
3. **Claude + Jona**: con eventos reales cargados, revisar contenidos vía SQL en el Dashboard y detectar si hay algún patrón no contemplado en `research.md` sección 7.
4. **Claude + Jona**: armar goals/non-goals del MVP (prerequisito para el schema normalizado).
5. **Claude + Jona**: C4 L1 — diagrama de contexto de sistemas.
6. **Claude + Jona**: pre-mortem del MVP.
7. **Claude + Jona**: cuando Brian confirme integración + haya ~20 eventos reales, arrancar primer draft del schema normalizado.

---

## 10. Estado del Walking Skeleton al 22/04

**Desplegado y verificado.**

- Proyecto Supabase: `ssb-export-dashboard` (ref `cctuowthpnstvdgjuomq`, São Paulo, free).
- Endpoint: `POST https://cctuowthpnstvdgjuomq.supabase.co/functions/v1/ingest-304`.
- Auth: shared secret via header `X-Webhook-Secret` (guardado en `.env.local` del repo + Project Secrets de Supabase).
- Idempotencia: SHA-256 del body crudo + UNIQUE constraint en `inbound_events.payload_hash`.
- Auditoría: cada intento queda en `inbound_log` con IP, user-agent, resultado, status code.
- Verificación: 5 tests contra 3 JSONs distintos (2 Trade + 1 STO) + 1 duplicate + 1 sin auth. Todos pasaron.
- Detalles completos: `docs/walking-skeleton.md`.
- Contrato para Brian: `docs/webhook-contract-304.md`.

---

## 11. Proyectos existentes adyacentes

A considerar en fases posteriores, **no arrastrar por defecto**:

- `validador-aduanal` — web app Netlify + Supabase. Puede aportar patrones de validación.
- `tarifa-schedule` — en pausa. Puede aportar modelo de tarifas/fletes.
- `ssb-inbox-triage` — en desarrollo activo. Puede aportar patrones de clasificación IA de correos (útil para etapa 7 de envío al cliente).

La integración o inspiración se evalúa cuando cada etapa del dashboard lo requiera, no antes.

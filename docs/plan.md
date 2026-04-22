# Plan de acción — SSB Export Dashboard

**Proyecto**: SSB-IT-RESEARCH
**Última actualización**: 22/04/2026 (cierre tarde)
**Fase actual**: Walking Skeleton desplegado + 11 JSONs reales cargados y analizados. Endpoint receptor del 304 funcionando con datos verificados. Esperando integración desde Importer (Brian responde mañana 23/04). Aún sin schema normalizado ni MVP.

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
SAP ──304──▶ Importer ──webhook──▶ dashboard
                                      │
                                      ▼
                        Edge Function: ingest
                        persiste 304 crudo
                        + idempotency constraint
                                      │
                                      ▼
                             Postgres (Supabase)
                             ├── inbound_events (Walking Skeleton)
                             ├── inbound_log (Walking Skeleton)
                             ├── orders (pendiente)
                             ├── shipments (pendiente)
                             ├── entities (pendiente)
                             ├── outbox (pendiente)
                             └── workflow_log (pendiente)
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
| **Idempotency** | 304 reenviado no duplica | Implementado en Walking Skeleton: SHA-256 del body crudo + UNIQUE constraint en `inbound_events.payload_hash`. |
| **Outbox** | Entrega garantizada al consumidor (n8n) sin Kafka/RabbitMQ | Escritura transaccional + dispatcher via `pg_cron` cada 10–30s. Pendiente. |
| **Workflow log** | Trazabilidad y REDO | Tabla append-only particionada por mes, JSONB con `jsonb_path_ops`. Pendiente. |
| **Saga ligera** | Workflow de 10 etapas con HITL | n8n orquesta, cada etapa chequea precondición. Sin compensaciones automáticas. Pendiente. |

### 3.2 Tablas mínimas

Ya desplegadas (Walking Skeleton):
- `inbound_events` — payload crudo del 304 con idempotencia vía `payload_hash` UNIQUE.
- `inbound_log` — auditoría de cada intento (IP, user-agent, resultado, status code).

Pendientes de diseñar (schema normalizado):
- `orders` — estado derivado actual de cada orden.
- `shipments` — embarques dentro de cada orden.
- `entities` — actores del embarque (EX, ST, N1, etc.).
- `outbox` — mensajes pendientes de despachar a n8n o terceros.
- `workflow_log` — qué hizo el sistema, append-only (particionable por mes).

Schema detallado pendiente de armar. Base de partida: sección 7 de `research.md` (estructura real del JSON del 304) + sección 7.13 (validación empírica) + `business-context.md` (identificadores operativos).

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

**Ya conectados**: Gmail, Google Drive, n8n, Supabase, **Filesystem** (desde 22/04 tarde — escribe `.md` del proyecto directo a WSL sin copy/paste manual).

### 4.3 MCP a evitar explícitamente

- Postgres MCP oficial (archivado + CVE de SQL injection).
- Slack MCP reference (deprecado).
- Filesystem MCP (redundante con Claude Code nativo).
- Memory servers (over-engineering a escala actual).

---

## 5. Estado actual del repo

- **Repo local**: `~/projects/export-control-automatization/`
- **Repo remoto**: `github.com/jzenteno-creador/export-control-automatization` (privado, sincronizado al 22/04 tarde).
- **Rama activa**: `master`.
- **Commits recientes**:
  - `9529b5b` (21/04): cleanup del validador viejo + rescope del proyecto.
  - `4aedd4a` (22/04): Walking Skeleton del receptor del 304 (schema + Edge Function + .gitignore extendido).
  - `7078467` (22/04): docs del Walking Skeleton (runbook + contrato técnico).
  - `33168a2` (22/04 tarde): agregar archivos vivos del proyecto post Walking Skeleton (5 `.md` en `docs/` + `.gitignore` con SESSION_HANDOFF).
  - `292cfca` (22/04 tarde): normalización permisos de .md a 100644.
- **Estructura actual**:
  ```
  .claude/skills/supabase/
  .claude/skills/supabase-postgres-best-practices/
  docs/                              (7 archivos vivos del proyecto + walking-skeleton.md + webhook-contract-304.md)
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
- **Tabla `inbound_events`** (al 22/04 tarde): 11 filas reales cargadas + 0 filas de tests iniciales del WS (3 preexistentes de tests previos + 8 nuevos = 11 totales). Ver sección 10.

---

## 6. Documentos vivos del proyecto (7 archivos)

| # | Archivo | Rol | Proyecto Claude.ai | Repo WSL (`docs/`) |
|---|---|---|---|---|
| 1 | `disciplina-operativa.md` | Metodologías, reglas, detección de fase, anti-patterns, escenarios. Guía comportamiento de Claude. | ✅ | ✅ |
| 2 | `business-context.md` | Contexto del negocio SSB × Dow, Ubiquitous Language, glosario operativo. | ✅ | ✅ |
| 3 | `research.md` | Descubrimientos sobre Importer, Metric, schema del 304, validación empírica. | ✅ | ✅ |
| 4 | `plan.md` | Este archivo — stack, arquitectura, decisiones, backlog. | ✅ | ✅ |
| 5 | `preguntas.md` | Preguntas abiertas priorizadas (Q1-Q29, D1-D7). | ✅ | ✅ |
| 6 | `walking-skeleton.md` | Runbook interno del endpoint receptor del 304. | ✅ | ✅ |
| 7 | `sesion-actual.md` | **Handoff efímero** (nuevo 22/04 tarde). Estado al cierre de la última sesión, pendientes, bloqueos. Se regenera completo cada cierre. | ✅ | ❌ (no va al repo) |

Archivo adicional solo en WSL (no va al proyecto Claude.ai): `webhook-contract-304.md` (contrato técnico para Brian).

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
| 22/04 | Mail a Brian enviado solicitando replicación del 304 al endpoint desde Importer. | Pedido formal con OK de Mariano. Responde mañana 23/04 a las 9 AM. |
| 22/04 tarde | 11 JSONs reales cargados al endpoint del Walking Skeleton vía `curl` y analizados con SQL en Supabase. | Validación empírica del schema documentado en `research.md` sección 7. Hallazgos netos en sección 7.13. |
| 22/04 tarde | **Corrección crítica**: `DeliveryLocation` NO es destino físico final. Es lugar asociado al Incoterm. Destino físico sale de entidad `ST`. | Validado empíricamente: las 2 órdenes FCA tienen `DeliveryLocation` en origen (Abbott, Bahía Blanca) pero la mercadería va a Rio Grande/Londrina. Las 9 CPT/CFR tienen `DeliveryLocation` en puerto, pero el Ship To está tierra adentro. Schema normalizado necesita **2 campos**, no uno. |
| 22/04 tarde | Regla del mailing al cliente confirmada empíricamente: **95%+ electrónico, físico solo para COO físico**. Destinatario sale de `BusinessInstructions...` (primario) + `N1` (fallback universal, 11/11 en la muestra). | Info operativa aportada por Jona + validación SQL. Documentado en `business-context.md` sección 7bis. |
| 22/04 tarde | Requerimiento confirmado: overrides de mailing por cliente (agregar/excluir destinatarios del 304) con audit trail. Fuera del MVP, fase 2/3. | Aportado por Jona. Documentado en `business-context.md` 7bis.4. |
| 22/04 tarde | Filesystem MCP adoptado como canal oficial para escribir `.md` del proyecto directo al repo WSL. | Elimina paso manual de descargar + copiar. Claude pregunta por cada escritura (setting configurado en MCP). Nombre real en WSL (reemplaza); versionado `-vN` en proyecto Claude.ai (para subir/borrar anterior). |
| 22/04 tarde | `sesion-actual.md` agregado como 7° archivo vivo (handoff efímero). Vive solo en proyecto Claude.ai, no en repo. | Permite retomar sesiones sin pegar handoff manual. Claude lo lee automáticamente al inicio de cada chat. Project Instructions actualizadas en consecuencia. |

---

## 8. Backlog (fase de investigación + Walking Skeleton)

Estado de tareas:

1. ✅ **Descargar JSONs reales del 304** del módulo Logs de JSON del Importer. **Cerrada 22/04** — 11 JSONs en `samples/304/`.
2. ✅ **Documentar schema del 304** por inferencia de JSONs reales. **Cerrada 22/04** — `research.md` sección 7.
3. ✅ **Investigar repo de Metric** (`sosab-api`) buscando APIs públicas y mecanismo de ingreso del 304. **Cerrada 22/04** — `research.md` sección 4. Conclusión: Metric no sirve como fuente.
4. ✅ **Decisión arquitectónica del mecanismo de ingesta**. **Cerrada 22/04** — Opción B (webhook desde Importer Laravel).
5. ✅ **Walking Skeleton del endpoint receptor del 304**. **Cerrada 22/04** — desplegado en Supabase, verificado con 5 tests.
6. ✅ **Mail a Brian solicitando replicación del 304**. **Cerrada 22/04** — enviado con URL, headers, contrato mínimo.
7. ✅ **Cargar los 11 JSONs de `samples/304/` al endpoint manualmente**. **Cerrada 22/04 tarde** — 11/11 con status 200, 3 duplicados esperados (pruebas previas del WS), 0 errores. Total en `inbound_events`: 11 filas.
8. ✅ **Análisis SQL de los 11 eventos cargados**. **Cerrada 22/04 tarde** — 5 consultas corridas: distribución Trade/STO, marítimo/terrestre, destinos declarados, cruce Incoterm + Ship To, notify mail + tamaño campo instrucciones. Hallazgos en `research.md` sección 7.13.
9. ⏳ **Respuesta de Brian sobre viabilidad técnica** y cronograma para implementar el webhook desde Importer. **Responde mañana 23/04 a las 9 AM.**
10. ⏳ **Alinear `.env.local.example`**: renombrar `SUPABASE_WEBHOOK_SECRET` → `WEBHOOK_SECRET`. Tarea de 2 min (D7 en `preguntas.md`).
11. ⏳ **Resolver preguntas Q16-Q19, Q21-Q23** con Brian cuando haya reunión técnica.
12. ⏳ **Resolver Q28 (COO físico) y Q29 (tabla maestra STO)** con el equipo documental.
13. ⏳ **Mapear flujo de exportación as-is** con el equipo de documentación. Parcialmente cubierto en `business-context.md` sección 7. Falta validar con documentales.
14. ⏳ **Primer draft de schema normalizado** (`orders`, `shipments`, `entities`, `outbox`, `workflow_log`). **Prerequisitos duros** (ver `disciplina-operativa.md` sección 4): (a) Ubiquitous Language ✅, (b) 1 entrevista/observación documentada ❌ (falta validar con documentales), (c) Muestra de datos reales ✅ (11 JSONs cargados), (d) C4 Context L1 ❌, (e) Goals + Non-goals del MVP ❌, (f) Pre-mortem del MVP ❌. **Faltan 3 de 6**.
15. ⏳ **Goals/Non-goals del MVP escritos** — prerequisito #5.
16. ⏳ **C4 Context L1 dibujado** — prerequisito #4.
17. ⏳ **Pre-mortem del MVP** — prerequisito #6.
18. ⏳ **Manual de configuración de VS Code** (pendiente, no urgente).

---

## 9. Próximos pasos concretos

Orden sugerido para la próxima sesión (23/04):

1. **Chequear respuesta de Brian** (mañana 9 AM). Si respondió, ajustar según feedback técnico.
2. **Si Brian respondió OK**: coordinar cronograma de integración. Si respondió con objeciones/cambios: evaluar y responder.
3. **Alinear `.env.local.example`** (D7, 2 min).
4. **Decidir orden de los siguientes tres prerequisitos metodológicos** (Goals/Non-goals, C4 L1, Pre-mortem). La recomendación previa de Claude era arrancar por Goals/Non-goals del MVP — decisión diferida al 23/04.
5. Según avance: comenzar entrevistas o observación con documentales (prerequisito #2 para schema normalizado).
6. Cuando estén los 6 prerequisitos + Brian confirmó integración + ~20 eventos reales: arrancar primer draft del schema normalizado.

---

## 10. Estado del Walking Skeleton al cierre del 22/04

**Desplegado, verificado y con data real cargada.**

- Proyecto Supabase: `ssb-export-dashboard` (ref `cctuowthpnstvdgjuomq`, São Paulo, free).
- Endpoint: `POST https://cctuowthpnstvdgjuomq.supabase.co/functions/v1/ingest-304`.
- Auth: shared secret via header `X-Webhook-Secret` (guardado en `.env.local` del repo + Project Secrets de Supabase).
- Idempotencia: SHA-256 del body crudo + UNIQUE constraint en `inbound_events.payload_hash`.
- Auditoría: cada intento queda en `inbound_log` con IP, user-agent, resultado, status code.
- Verificación inicial: 5 tests contra 3 JSONs distintos (2 Trade + 1 STO) + 1 duplicate + 1 sin auth. Todos pasaron.
- **Data real cargada (22/04 tarde)**: 11 JSONs de `samples/304/` cargados vía `curl` en serie. 8 insertados nuevos + 3 ya existentes de tests previos detectados correctamente como duplicados. Total en `inbound_events`: **11 filas reales**.
- Análisis SQL validado: 6 Trade + 5 STO, 8 marítimos + 3 terrestres, 8 destinos distintos (con casing inconsistente entre 2), 11/11 N1 con mail, tamaño campo instrucciones 44-3027 chars con plantillas repetidas.
- Detalles completos: `docs/walking-skeleton.md`.
- Contrato para Brian: `docs/webhook-contract-304.md`.

---

## 11. Proyectos existentes adyacentes

A considerar en fases posteriores, **no arrastrar por defecto**:

- `validador-aduanal` — web app Netlify + Supabase. Puede aportar patrones de validación.
- `tarifa-schedule` — en pausa. Puede aportar modelo de tarifas/fletes.
- `ssb-inbox-triage` — en desarrollo activo. Puede aportar patrones de clasificación IA de correos (útil para etapa 7 de envío al cliente).

La integración o inspiración se evalúa cuando cada etapa del dashboard lo requiera, no antes.

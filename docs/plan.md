# Plan de acción — SSB Export Dashboard

**Proyecto**: SSB-IT-RESEARCH
**Última actualización**: 23/04/2026
**Fase actual**: Alcance del MVP cerrado. Goals/Non-goals (v5) + Plan de Releases (R1-R4) listos como base estable. C4 Context L1 en primer draft. Pendientes: validación del C4 L1 con Jona, Pre-mortem del MVP, respuesta de Brian para siguiente milestone de integración.

---

## 1. Stack decidido

- **Supabase** — Postgres + Auth + Realtime + Edge Functions (Deno/TS) + Storage.
- **n8n Cloud** — orquestación de workflows (webhooks, HITL, reintentos).
- **Netlify** — frontend hosting.
- **Claude API** — IA para 3 usos en el MVP: parseo del TXT 107, control del BL draft, template del mail al cliente.
- **Resend** — email transaccional (pendiente de configurar dominio).
- **GitHub** — repo privado: `jzenteno-creador/export-control-automatization`.

**Regla de oro**: n8n orquesta, Postgres decide, Claude asiste.

Corolario: lógica de negocio crítica nunca vive dentro de nodos n8n. Va en funciones SQL o Edge Functions testeables. n8n solo invoca.

---

## 2. Criterios no negociables (impuestos por IT de SSB)

1. Logging completo: inputs, outputs, timestamps, estados por cada paso.
2. Idempotencia: mismo mensaje reenviado no duplica efectos.
3. Sin acoplamiento a estructuras internas de Metric/Importer. Solo APIs estables o contratos push confirmados.
4. Validar con Brian/Santiago antes de apoyarse en comportamiento específico del código legacy.
5. Persistir primero, procesar después (el 304 crudo se guarda antes de procesarse).

---

## 3. Alcance del MVP (v5 — cerrado 23/04)

### 3.1 Goals del MVP

El MVP cubre **exportación marítima** (MOT=O) punta a punta. Cada Goal es verificable: podés marcarlo sí/no una vez entregado.

- **G1** — Ingesta del 304 marítimo con idempotencia (ya resuelto por Walking Skeleton, 22/04).
- **G2** — Estado `Aceptado y Documentado` se dispara por:
  - **Vía A** — llamada a la API de Interlog (cuando esté productiva).
  - **Vía B (plan B)** — el operador marca en el dashboard "instrucción enviada a Interlog por mail" y carga el número de permiso cuando lo reciba. Logueado quién/cuándo.
- **G3** — El operador sube la planilla de aduana al dashboard. Parseo con lógica importada del Validador Aduanal. Extrae: permiso de exportación, precinto, DDT, buque, contenedores, peso, etc. Dispara checkpoint `planilla_cargada`.
- **G4** — Control del permiso de exportación (extraído de la planilla) contra **reporte de Interlog** descargado periódicamente (método actual del equipo). API Interlog de consulta queda para fase 2. Dispara `permiso_controlado`.
- **G5** — **Panel Declaración Lista**: consolida 304 + planilla + factura (del Drive) + **TXT 107 parseado con IA**. Incluye precinto como campo obligatorio. Flags de divergencia entre fuentes.
- **G6** — Parseo IA del **TXT 107** (`BusinessInstructionsReferenceNumberNotes`). Extrae: destinatarios del mailing, requisitos del BL (consignee, notify, NCM, freight terms), requisitos especiales (direct collect, ISPM 15, CNPJ Brasil). Alimenta G5, G7 y G8.
- **G7** — Control del BL draft: **determinístico en campos estructurados** (peso, contenedor, permiso, precinto, NCM, CUIT/CNPJ) + **IA en texto libre** (consignee, notify, instrucciones específicas). Contra 4 fuentes: 304, planilla, factura, TXT 107 parseado. Aprobación humana con comentarios. Dispara `bl_aprobado`.
- **G8** — Mailing **por documento** (no por orden). Cada documento (BL, factura, packing list, COO, certificado de seguro, CRT) se puede enviar apenas esté disponible y aprobado. Template generado con IA desde TXT 107, adjuntos traídos automáticamente del Drive por naming convention. Aprobación humana explícita previa al envío.
- **G9** — COO digital: el operador sube el ZIP que descarga de la Cámara → el sistema descomprime, guarda XML + PDF, re-comprime XML para envío seguro, adjunta al mail de G8.
- **G10** — COO físico + otros documentos escaneados (firmas físicas, originales regulatorios): canal de ingesta por mail dedicado (escáner → mail → dashboard). El sistema asocia al número de orden por metadata del asunto/cuerpo.
- **G11** — Certificado de Seguro para órdenes CIF: el operador lo guarda en el Drive → el dashboard lo adjunta al mail cuando aplica.
- **G12** — Tracking pasivo con 4 estados primarios + alertas proactivas (ver §3.3).
- **G13** — Logging completo (criterio IT #1).
- **G14** — Seguimiento consultable del mailing por orden/cliente/documento: qué se envió, cuándo, a quién, aprobado por quién, con qué adjuntos, qué falta enviar.
- **G15** — El flujo sostiene **150-200 órdenes marítimas/mes con 1 persona documental** (vs las 2 actuales).

### 3.2 Non-goals del MVP (lo sacado a propósito)

- **NG1** — Modalidad terrestre (MOT=M). Fase 2.
- **NG2** — Envío de mail automático sin aprobación humana.
- **NG3** — Automatización del trámite de COO en la web de Cámara Argentina de Comercio. Sigue 100% manual; el dashboard solo distribuye post-aprobación.
- **NG4** — Automatización del ingreso de declaración en los portales de las navieras (Log-In, Maersk, Hapag-Lloyd). La persona sigue cargando manualmente; el dashboard le deja la data lista y controlada.
- **NG5** — Escribir a Metric o a Importer. Solo lectura en el MVP.
- **NG6** — Gestión del flujo Metric → Interlog (Instrucción de Exportación, trámite de Permiso). Sigue en Metric. El dashboard solo consume el número de permiso.
- **NG7** — Integración automática con terminales portuarias para VGM.
- **NG8** — COO físico firmado por la Cámara (firma física). El MVP solo lo marca como "físico".
- **NG9** — Multi-tenant. Solo SSB × PBB Polisur.
- **NG10** — Reemplazo de tareas no-304 del equipo documental (facturación SSB propia, cobros, administración).
- **NG11** — Gestión financiera (pagos, retenciones, cobranzas).
- **NG12** — APIs de tracking de carriers (Log-In, Maersk, Hapag-Lloyd). El tracking del MVP se alimenta de los 315 que emite Metric. Fase 2 condicional a existencia de APIs.
- **NG13** — Integración con ssb-inbox-triage. Evaluable para fase 2.
- **NG14** — El dashboard no tramita el permiso de exportación. Sigue en Interlog.
- **NG15** — El dashboard no reemplaza el bot de Metric que sube documentos desde el Drive. Ese bot lo mantienen los coordinadores. El dashboard lee del Drive en paralelo, sin tocar el flujo actual.
- **NG16** — Validador Aduanal standalone se discontinúa al migrarse al dashboard. El código se copia (única fuente de verdad de la lógica de parseo). La URL standalone se baja.

### 3.3 Máquina de estados operativa

4 estados **primarios** + checkpoints internos **paralelos** dentro del estado 2.

| Estado | Disparador | Checkpoints internos (paralelos, no secuenciales) |
|---|---|---|
| **1. New Offer** | 304 recibido (Walking Skeleton) | — |
| **2. Aceptado y Documentado** | Instrucción enviada a Interlog (API o mail plan B) | `planilla_cargada`, `permiso_controlado`, `declaracion_lista`, `bl_aprobado`, `mail_{doc}_enviado` (uno por cada documento enviado) |
| **3. En Tránsito** | 315 de zarpe replicado desde Metric | Alertas de "próximo arribo" N días antes |
| **4. Arribado** | 315 de arribo replicado desde Metric | — |

**Nota importante**: el estado 3 arranca con el 315 de zarpe **independientemente** de si todavía faltan documentos por enviar. Si falta algún mail al cliente, el dashboard sigue alertándolo hasta que se complete.

### 3.4 Canales de ingesta de documentos

| Canal | Método | Estado al 23/04 |
|---|---|---|
| 304 (oferta) | Webhook Importer → endpoint Supabase | ✅ desplegado (Walking Skeleton) |
| 301 (aceptación Metric) | Push de Metric al dashboard (a solicitar a Santiago) | 🟡 a coordinar |
| 315 (tracking Metric) | Push de Metric al dashboard (mismo canal que 301) | 🟡 a coordinar |
| API Interlog | Llamada desde el dashboard | 🟡 en testeo final por Interlog |
| Planilla de aduana | Operador sube manual al dashboard | 🟡 MVP |
| Reporte de permisos Interlog | Descarga periódica + upload al dashboard | 🟡 MVP |
| Factura | n8n (ya funcionando) → Drive → dashboard lee | ✅ n8n activo |
| Packing List | n8n → Drive → dashboard lee | ✅ n8n activo |
| Booking Advice | n8n → Drive → dashboard lee | ✅ n8n activo |
| BL draft | Operador descarga del portal y sube al dashboard | 🟡 MVP |
| COO digital (ZIP Cámara) | Operador sube → sistema descomprime | 🟡 MVP |
| COO físico / escaneados | Escáner → mail dedicado → dashboard lee | 🟡 MVP |
| Certificado de Seguro (CIF) | Operador guarda en Drive → dashboard lee | 🟡 MVP |
| Reporte VGM (Bahía Blanca) | Reporte recibido por mail → operador sube al dashboard | 🟡 MVP |
| Permiso de Exportación | Viene dentro de la planilla de aduana | 🟡 MVP |

### 3.5 Plan de Releases

Fraccionamiento del MVP en 4 entregas incrementales. Cada release genera valor usable por sí solo; las dependencias se eligieron para que ningún release quede "colgado" esperando otro.

| Release | Contenido | Entregable verificable |
|---|---|---|
| **R1 — Declaración + Control BL** | Validador Aduanal integrado + control permiso vs reporte Interlog (G3, G4) + parseo IA del TXT 107 (G6) + Panel Declaración Lista (G5) + Control BL determinístico + IA (G7) + aprobación humana | La persona declara con data confiable y aprueba el BL. El mailing sigue manual. |
| **R2 — Mailing + Documentación** | Pre-armado mail con template IA + adjuntos del Drive (G8) + seguimiento por doc/cliente (G14) + COO digital (G9) + COO físico escaneado (G10) + certificado de seguro CIF (G11) | Comunicación con el cliente automatizada con aprobación humana. |
| **R3 — VGM** | Ingesta reporte Bahía Blanca + limpieza + selección de última pesada + cruce con planilla/factura/304 + generación Excel Log-In / Maersk + correo asistido | VGM deja de ser workflow manual separado. |
| **R4 — Tracking + Metric push** | 301 push desde Metric (dispara estado `Aceptado y Documentado`) + 315 push (dispara `En Tránsito`, `Próximo Arribo`, `Arribado`) + alertas proactivas (G12) | Seguimiento automático del ciclo de vida. |

**Justificación del orden**:
- R1 primero: el trigger ya existe (la planilla dispara todo), y el dolor P2 del `business-context.md` (Control del BL) es el más crítico operativamente.
- R2 cierra el loop del BL aprobado de R1.
- R3 antes de R4: sin VGM no zarpa el contenedor — es operativo crítico. Tracking es informativo.
- R4 último: mientras tanto, el **plan B manual** (operador marca "instrucción enviada") sostiene el flujo.

Los Non-goals valen para todos los releases igual. Fraccionar no cambia qué está afuera.

---

## 4. Arquitectura target (alto nivel)

```
SAP ──304──▶ Importer ──webhook 304──▶ dashboard
                                          │
                                          ▼
                            Edge Function: ingest
                            persiste 304 crudo + idempotency
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
                          Acciones: BL draft, mailing, tracking, VGM
```

### 4.1 Patrones críticos (obligatorios)

| Patrón | Qué resuelve | Implementación |
|--------|--------------|----------------|
| **Idempotency** | 304 reenviado no duplica | `INSERT ... ON CONFLICT DO NOTHING` sobre `(source, message_type, external_id)` + hash del payload |
| **Outbox** | Entrega garantizada a n8n/terceros sin Kafka | Escritura transaccional + dispatcher vía `pg_cron` cada 10–30s |
| **Workflow log** | Trazabilidad y REDO | Tabla append-only particionada por mes, JSONB con `jsonb_path_ops` |
| **Saga ligera** | Workflow con HITL | n8n orquesta, cada etapa chequea precondición. Sin compensaciones automáticas |

### 4.2 Tablas mínimas (propuesta)

- `inbound_events` — qué entró de afuera, inmutable.
- `orders` — estado derivado actual de cada orden.
- `outbox` — mensajes pendientes de despachar a n8n o terceros.
- `workflow_log` — qué hizo el sistema, append-only (particionable por mes).

Schema detallado pendiente de armar. Base de partida: `research.md` §7 (estructura real del JSON del 304) + `business-context.md` §9 (identificadores operativos) + Goals/Non-goals v5 (alcance real).

### 4.3 Herramientas externas decididas

| Función | Herramienta | Razón |
|---------|-------------|-------|
| Parseo TXT 107 + control BL texto libre + template mail | **Claude Sonnet** | Texto semi-estructurado con alta variación. Custom extractors no amortizan a 200 docs/mes. |
| Email transaccional | **Resend** | Free tier 3000 emails/mes permanente. SDK Deno/Node directo a Edge Functions. |
| Storage de documentos | **Supabase Storage** | RLS directo, signed URLs, CDN integrado. 100 GB incluidos en Pro (USD 25/mes). |

---

## 5. C4 Context L1 — draft (23/04)

**Estado**: primer borrador. Pendiente de validación con Jona. Formato Mermaid para versionar en Git y renderizar en VS Code o GitHub.

### 5.1 Diagrama

```mermaid
graph TB
    %% ======== Actores humanos ========
    OP[Operador Documental<br/>SSB]
    SUP[Supervisor Jona<br/>admin + consulta]
    PLANTA[Equipo Planta<br/>Bahía Blanca]
    DESP[Interlog<br/>despachante]
    CAM[Cámara Argentina<br/>de Comercio]
    CLI[Cliente Final<br/>exportador / forwarder]

    %% ======== Sistema target ========
    DASH[["SSB Export Dashboard<br/>Supabase + n8n + Netlify<br/>(MVP)"]]

    %% ======== Sistemas internos SSB ========
    IMP[Importer Codego<br/>Laravel 8 + AWS S3]
    MET[Metric sosab-api<br/>Flask + MySQL]
    DRIVE[Google Drive<br/>Team Exportación]
    GMAIL[Gmail<br/>expo.rpbb@scbint.com]
    N8N[n8n Cloud<br/>workflows existentes<br/>mail → Drive]

    %% ======== Sistemas externos ========
    SAP[SAP Dow]
    INTER[API Interlog<br/>en testeo final]
    LOGIN[Portal Log-In<br/>marítimo]
    MAERSK[Portal Maersk<br/>marítimo]
    HAPAG[Portal Hapag-Lloyd<br/>marítimo]

    %% ======== Flujos 304 / aceptación / tracking ========
    SAP -.304 en paralelo.-> IMP
    SAP -.304 en paralelo.-> MET
    IMP -->|webhook 304 push<br/>Q25 abierta| DASH
    MET -->|301 push aceptación<br/>a solicitar Santiago| DASH
    MET -->|315 push tracking<br/>a solicitar Santiago| DASH

    %% ======== Flujos Interlog ========
    DASH -->|llamada API plan A| INTER
    OP -->|mail instrucción plan B| INTER
    DESP -->|reporte periódico<br/>de permisos| OP
    OP -->|upload reporte| DASH

    %% ======== Flujos planilla + VGM ========
    PLANTA -->|mail planilla aduana| OP
    PLANTA -->|mail reporte VGM| OP
    OP -->|upload planilla + VGM| DASH

    %% ======== Flujos documentos ========
    N8N -->|captura mails:<br/>factura, PL, booking| DRIVE
    DRIVE -->|lectura por naming| DASH

    %% ======== Flujos COO ========
    OP -.solicitud COO manual.-> CAM
    CAM -.ZIP con XML + PDF.-> OP
    OP -->|upload ZIP COO| DASH

    %% ======== Flujos operador ↔ dashboard ========
    OP <-->|revisa, aprueba,<br/>carga, consulta| DASH
    SUP <-->|consulta + admin| DASH

    %% ======== Outputs a clientes y navieras ========
    DASH -->|mail pre-armado<br/>+ adjuntos| OP
    OP -->|envía mail aprobado| CLI
    DASH -->|Excel VGM| OP
    OP -->|envía VGM| LOGIN
    OP -->|envía VGM| MAERSK
    OP -->|carga BL manual| LOGIN
    OP -->|carga BL manual| MAERSK
    OP -->|carga BL manual| HAPAG

    %% ======== Estilos ========
    classDef target fill:#2d3e50,color:#fff,stroke:#1a2530,stroke-width:3px
    classDef internal fill:#4a6fa5,color:#fff,stroke:#2d3e50
    classDef external fill:#8b6f47,color:#fff,stroke:#5d4a2e
    classDef human fill:#5a8f5a,color:#fff,stroke:#3d6b3d
    class DASH target
    class IMP,MET,DRIVE,GMAIL,N8N internal
    class SAP,INTER,LOGIN,MAERSK,HAPAG external
    class OP,SUP,PLANTA,DESP,CAM,CLI human
```

### 5.2 Lo que NO aparece en el diagrama, y por qué

- **SAP directo ↔ Dashboard** — no hay flecha. SAP llega al dashboard siempre vía Importer (304) o vía Metric (301, 315). Confirma NG5 + NG6.
- **Bot de Metric que sube documentos** — no aparece. Lo mantienen los coordinadores, el dashboard lee Drives en paralelo sin tocarlo. Confirma NG15.
- **Validador Aduanal standalone** — no aparece. Se discontinúa; el código se absorbe dentro del dashboard. Confirma NG16.
- **ssb-inbox-triage** — no aparece. Fuera del MVP. Confirma NG13.
- **Escáner físico** — no aparece como sistema. Es un canal de ingesta que llega al mail → dashboard, no un sistema autónomo.
- **Portales de navieras recibiendo BL automáticamente** — no hay flecha `DASH → portales`. La persona sigue cargando manual. Confirma NG4.
- **Cámara Arg. de Comercio recibiendo solicitud automática** — flecha punteada OP → CAM (manual). Confirma NG3.

### 5.3 Flechas con contrato pendiente (riesgos documentados)

| Flecha | Estado | Bloqueante para |
|---|---|---|
| `Importer → Dashboard (webhook 304)` | Q25 abierta. Brian aún no respondió. | Integración con tráfico real. Hoy el WS recibe pruebas manuales. |
| `Metric → Dashboard (301 push)` | A coordinar con Santiago. Acepta hacerlo como endpoint de consulta o replicar evento. | R4 (estado `Aceptado y Documentado` automatizado). Plan B manual mientras tanto. |
| `Metric → Dashboard (315 push)` | Mismo canal que 301. | R4 (estados 3 y 4 de la máquina). |
| `Dashboard → API Interlog` | En testeo final por Interlog. Fecha de producción no confirmada. | R1 (G2 Vía A). Plan B mail Interlog mientras tanto. |

### 5.4 Flechas con contrato operativo

| Flecha | Estado |
|---|---|
| `n8n → Drive` (factura, PL, Booking) | Ya funcionando. Input vivo del dashboard. |
| `Operador ↔ Dashboard` | A construir como parte del MVP (UI en Netlify). |
| `Planta → Operador` (mail planilla, mail VGM) | Canal operativo existente. El operador sube al dashboard. |
| `Interlog → Operador` (reporte permisos) | Canal operativo existente. El operador sube al dashboard. |
| `Operador → Cliente` (mail con docs) | Canal operativo existente. El dashboard asiste pre-armando. |

---

## 6. Estado actual del repo

- **Repo local**: `~/projects/export-control-automatization/`
- **Repo remoto**: `github.com/jzenteno-creador/export-control-automatization` (privado, sincronizado).
- **HEAD actual**: `6b05fd1` (22/04 tarde) — `docs: actualizar 5 archivos vivos con hallazgos empíricos 22/04 tarde`.
- **Commits recientes**:
  - `9529b5b` (21/04): cleanup del validador viejo + rescope del proyecto.
  - `4aedd4a` (22/04): Walking Skeleton del receptor del 304 (schema + Edge Function + .gitignore extendido).
  - `7078467` (22/04): docs del Walking Skeleton (runbook + contrato técnico).
  - `33168a2` (22/04): agregado de 5 `.md` vivos a `docs/`.
  - `292cfca` (22/04): normalización de permisos 100755 → 100644.
  - `6b05fd1` (22/04 tarde, HEAD actual): actualización de los 5 archivos vivos con hallazgos empíricos + D7 resuelta.
- **Proyecto Supabase**: `ssb-export-dashboard` — ref `cctuowthpnstvdgjuomq` — región `sa-east-1` (São Paulo) — plan free.
- **Endpoint productivo**: `https://cctuowthpnstvdgjuomq.supabase.co/functions/v1/ingest-304`.

---

## 7. Documentos vivos del proyecto

| Archivo | Rol | Ubicación |
|---|---|---|
| `research.md` | Descubrimientos sobre Importer, Metric, schema del 304 | Proyecto Claude.ai + `docs/` local |
| `plan.md` | Este archivo — stack, arquitectura, decisiones, backlog | Proyecto Claude.ai + `docs/` local |
| `preguntas.md` | Preguntas abiertas priorizadas por impacto | Proyecto Claude.ai + `docs/` local |
| `business-context.md` | Contexto de negocio SSB × Dow, Ubiquitous Language | Proyecto Claude.ai + `docs/` local |
| `disciplina-operativa.md` | Skill metodológica — cómo trabaja Claude con Jona | Proyecto Claude.ai + `docs/` local |
| `walking-skeleton.md` | Runbook interno del Walking Skeleton del endpoint receptor del 304 | Proyecto Claude.ai + `docs/` local |
| `sesion-actual.md` | Handoff efímero del cierre de sesión. Se regenera cada cierre. | Proyecto Claude.ai únicamente |
| `webhook-contract-304.md` | Contrato técnico para consumidores externos (Brian/SAP) | `docs/` local únicamente |

---

## 8. Decisiones tomadas

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 21/04 | No leer lógica interna del Importer. Consumir solo contratos públicos. | Recomendación de Julio. Evita acoplamiento. |
| 21/04 | Arrancar por el 304 (Importer). Dejar 301 y 315 (Metric) para fase posterior. | Foco en el punto de entrada. |
| 21/04 | Stack: Supabase + n8n + Netlify + Claude API + GitHub. | Escala actual no justifica Temporal/Inngest/Trigger.dev. |
| 21/04 | Reutilizar el repo existente `export-control-automatization`. | Ya existía, nombre funcional. |
| 21/04 | Cleanup total del código del validador viejo (Python + Google Drive). | Alcance cambió sustancialmente. |
| 22/04 | Adoptar `disciplina-operativa.md` como skill metodológica del proyecto. | Evitar over-engineering, option-dumps, sycophancy. |
| 22/04 | Formato del JSON del 304 estable por parte de Dow. | Confirmado operativamente. Schema documentado. |
| 22/04 | Persistir el 304 crudo completo + columnas normalizadas para campos categoría A. | Fidelidad del input + velocidad de query. |
| 22/04 | `business-context.md` como archivo vivo del proyecto. | Ubiquitous Language (DDD). |
| 22/04 | Q15 cerrada — PO `0118...` = Trade, `4010...` = STO. | Confirmado por Jona. |
| 22/04 | Metric descartado como fuente para el dashboard. | No persiste crudo, no idempotente, sin webhooks salientes. |
| 22/04 | Opción B elegida — consumir el 304 vía webhook desde el Importer Laravel. | Importer sí persiste crudo, Brian accesible, cumple criterios. |
| 22/04 | Walking Skeleton del receptor del 304 desplegado. | Endpoint funcional con idempotencia + auditoría. |
| 22/04 | Auth del WS por shared secret (header `X-Webhook-Secret`). HMAC queda para producción. | Simplicidad en primera iteración. |
| 22/04 | Mail a Brian solicitando replicación del 304. | Pedido formal con OK de Mariano. |
| 22/04 | Filesystem MCP adoptado como canal oficial para escribir .md al repo WSL. | Reduce fricción operativa entre chat y repo. |
| 22/04 | `sesion-actual.md` como 7° archivo vivo (handoff efímero). | Continuidad entre sesiones. |
| 22/04 | Protocolo de entrega de .md formalizado en `disciplina-operativa.md` §5.5. | Manejo de timeouts observados con archivos grandes. |
| 23/04 | **Goals/Non-goals del MVP cerrados en v5.** 15 Goals + 16 Non-goals. | Prerequisito metodológico #1 del schema normalizado, completado. |
| 23/04 | **Plan de 4 releases (R1-R4).** Orden: Declaración + Control BL → Mailing + Doc → VGM → Tracking + Metric. | Fraccionamiento del MVP para entregas incrementales con valor usable. |
| 23/04 | **Validador Aduanal se copia al dashboard y se discontinúa la standalone.** Fuente única de lógica de parseo de planillas. | Evita duplicación de código y desincronización. |
| 23/04 | **Bot de Metric que sube documentos desde Drive no se toca.** El dashboard lee del Drive en paralelo. | Respeta criterio no-negociable #3 (sin acoplamiento). |
| 23/04 | **API Interlog con plan B manual.** Operador marca "instrucción enviada" + carga número de permiso cuando llega. | Destraba R1 sin depender de fecha de Interlog. |
| 23/04 | **Metric emite 301 y 315 al dashboard (push).** Simétrico al webhook del Importer. A solicitar a Santiago. | Evita polling. Mismo patrón operativo que el 304. |
| 23/04 | **Control del permiso de la planilla contra reporte descargado de Interlog** (método actual del equipo). API Interlog de consulta queda para fase 2. | Usa canal ya conocido. No introduce dependencia nueva. |
| 23/04 | **VGM (v chica, no BGM) entra al MVP como release R3.** | Operativo crítico: sin VGM no zarpa el contenedor. |
| 23/04 | **Envío de VGM a Log-In y Maersk por Excel + correo asistido.** No hay API de ninguna naviera hoy. | APIs de navieras como item de investigación en backlog. |
| 23/04 | **COO digital + COO físico escaneado + certificado de seguro CIF entran al MVP (R2).** | Cierran el loop de distribución documental al cliente. |
| 23/04 | **TXT 107 adoptado como alias SSB de `BusinessInstructionsReferenceNumberNotes`.** | Cómo lo nombra el operador en SAP. Agregado al Ubiquitous Language. |
| 23/04 | **Estado operativo "Aceptado y Documentado" consolidado** (no split). 4 estados primarios + checkpoints paralelos. | Refleja cómo piensa el operador, no cómo se modela el backend. |
| 23/04 | **IA entra al MVP en 3 lugares**: parseo del TXT 107 (G6), control del BL en campos de texto libre (G7), template del mail al cliente (G8). | Valor alto y contexto acotado; no requiere ML custom. |
| 23/04 | **Mailing deja de ser un único checkpoint.** Es un log de envíos por documento: cada doc se puede enviar apenas esté listo. | Operativo: el equipo adelanta docs al cliente a medida que están disponibles. |
| 23/04 | **D7 resuelta** por commit `6b05fd1` (22/04 tarde, antes del handoff). `.env.local.example` ya usa `WEBHOOK_SECRET`. | Descubierto en análisis previo de Claude Code esta sesión. |

---

## 9. Backlog

Estado de tareas:

1. ✅ **Descargar 11 JSONs reales del 304**. Cerrada 22/04.
2. ✅ **Documentar schema del 304**. Cerrada 22/04 — `research.md` §7.
3. ✅ **Investigar repo de Metric**. Cerrada 22/04 — `research.md` §4.
4. ✅ **Decisión arquitectónica del mecanismo de ingesta**. Cerrada 22/04 — Opción B.
5. ✅ **Walking Skeleton del endpoint receptor**. Cerrada 22/04.
6. ✅ **Mail a Brian solicitando replicación del 304**. Cerrada 22/04.
7. ✅ **Cargar 11 JSONs al endpoint del WS** para tener data real en `inbound_events`. Cerrada 22/04 tarde (11/11 éxito).
8. ✅ **Goals/Non-goals del MVP (prerequisito metodológico #1)**. Cerrada 23/04 — v5 consolidada en §3.
9. ✅ **Alinear `.env.local.example`** (D7). Cerrada 22/04 por commit `6b05fd1`.
10. ⏳ **C4 Context L1** (prerequisito metodológico #2). Draft en §5, pendiente de revisión con Jona.
11. ⏳ **Pre-mortem del MVP** (prerequisito metodológico #3). Sin arrancar.
12. ⏳ **Respuesta de Brian sobre viabilidad del webhook** (Q25). Bloquea tráfico productivo.
13. ⏳ **Resolver Q16-Q24** con Brian cuando haya reunión técnica.
14. ⏳ **Mapear flujo as-is completo con documentales** (Q12, Q13, Q14).
15. ⏳ **Santiago — solicitar endpoints de consulta + push de 301/315** desde Metric al dashboard.
16. ⏳ **API Interlog — fecha de puesta en producción**. A pedir a Interlog.
17. ⏳ **Primer draft de schema normalizado** (`orders`, `shipments`, `entities`, `outbox`, `workflow_log`). **Prerequisitos duros**: C4 L1 cerrado, Pre-mortem hecho, primeros 20-30 eventos reales en `inbound_events` (✅ ya hay 11), Brian confirma webhook (⏳).
18. ⏳ **Investigar APIs de VGM en navieras** (Log-In, Maersk, Hapag-Lloyd). No existen hoy. Consulta proactiva para evaluar futura automatización online.
19. ⏳ **Renombrar `openssl rand -base64 32` → `-hex 24`** en `.env.local.example` línea 21 (observación colateral de Claude Code). Trivial, próxima sesión de coding. (D8)
20. ⏳ **Manual de configuración de VS Code** (no urgente).

---

## 10. Próximos pasos concretos

Orden sugerido para la próxima sesión:

1. Revisar el draft del C4 Context L1 (§5). Iterar hasta cerrarlo.
2. Arrancar Pre-mortem del MVP (prerequisito metodológico #3).
3. Chequear respuesta de Brian (Q25) si ya llegó.
4. Solicitar a Santiago los endpoints de consulta + push de 301/315 desde Metric.
5. D8 (rename de `openssl rand` en `.env.local.example`). 2 minutos en Claude Code.
6. Cuando C4 L1 y Pre-mortem estén cerrados + Brian confirme webhook: arrancar primer draft del schema normalizado.

---

## 11. Estado del Walking Skeleton

**Desplegado y verificado.** Última prueba: 22/04 tarde, 11 JSONs reales cargados con éxito (8 nuevos + 3 idempotencia detectada).

- Proyecto Supabase: `ssb-export-dashboard` (ref `cctuowthpnstvdgjuomq`, São Paulo, free).
- Endpoint: `POST https://cctuowthpnstvdgjuomq.supabase.co/functions/v1/ingest-304`.
- Auth: shared secret via header `X-Webhook-Secret` (`.env.local` y Project Secrets de Supabase).
- Idempotencia: SHA-256 del body crudo + UNIQUE constraint en `inbound_events.payload_hash`.
- Auditoría: cada intento queda en `inbound_log` con IP, user-agent, resultado, status.
- Total eventos en `inbound_events` al cierre: **11 reales**.
- Detalles completos: `walking-skeleton.md`.
- Contrato para Brian: `webhook-contract-304.md`.

---

## 12. Proyectos existentes adyacentes

A considerar en fases posteriores, **no arrastrar por defecto**:

- `validador-aduanal` — **NG16 del MVP**: se copia al dashboard, standalone se discontinúa. Fuente única de lógica de parseo.
- `tarifa-schedule` — en pausa. Puede aportar modelo de tarifas/fletes si aparece el caso de uso.
- `ssb-inbox-triage` — en desarrollo activo. Fuera del MVP (NG13). Evaluable para fase 2 si aporta patrones de clasificación de correos útiles para G8.

---

# CLAUDE.md

> Contexto global en `~/.claude/CLAUDE.md`
> Skills del proyecto en `.claude/skills/`
> Proyecto en Claude.ai: **SSB-IT-RESEARCH**

Este archivo guía a Claude Code al trabajar en este repositorio.

---

## Proyecto

**export-control-automatization** — dashboard operacional para el equipo de documentación de exportación de SSB International.

**Objetivo:** reducir el equipo documental de 2 a 1 persona manteniendo 150–200 órdenes/mes, automatizando tareas que hoy corren por fuera de los sistemas core de SSB (Metric e Importer).

**Estado actual:** fase de **investigación**. No hay código productivo. El repo está limpio, preparado para la construcción del sistema nuevo.

---

## Contexto operativo

SSB International opera comercio exterior (exportación e importación) para clientes industriales. El flujo operativo arranca con un mensaje `304` de SAP (oferta de orden) que entra al sistema Importer — **único input SAP que consume el dashboard en la fase actual**. El nuevo sistema a construir cubrirá 10 etapas operacionales:

1. Ingesta de ofrecimiento (304 desde SAP).
2. Detección de despacho.
3. Recolección de info para declaración de embarque.
4. Generación/ingreso de declaración de embarque.
5. Obtención y descarga del BL draft.
6. Control documental del BL draft (con IA — fase posterior).
7. Evaluación y envío de documentación al cliente.
8. Control de mailing.
9. Tracking: avisos de embarque, próximo arribo, arribo.
10. (Escalamiento futuro).

### Mensajes SAP del ecosistema

El ambiente SSB intercambia tres tipos de mensaje SAP. Solo uno se consume hoy:

- **`304` — SAP → Importer** (consumido hoy). Oferta de orden. Input del dashboard, alimenta la etapa 1.
- **`301` — Metric → SAP** (a evaluar). Aceptación de orden: Metric lo emite cuando la orden ya está coordinada y lista para despacho. Potencial input para marcar estado "confirmada" en el dashboard (fases posteriores).
- **`315` — Metric → SAP** (a evaluar). Updates individuales de eventos operativos (sailing date, arrival at destination, etc.). Potencial fuente para alimentar la etapa 9 (tracking), complementaria o alternativa a APIs de carriers (fases posteriores).

Los `301`/`315` son salidas de Metric, no inputs del dashboard en el diseño actual. La integración se evalúa en fases posteriores según costo/beneficio.

**Foco inicial:** declaración de embarque + control de BL, modalidad marítima.

---

## Cómo trabajamos (3 capas)

- **Claude.ai (proyecto SSB-IT-RESEARCH)**: Jona discute arquitectura, decisiones, research con Claude. Genera los `.md` del proyecto.
- **Claude Code (este entorno, VS Code)**: ejecuta el coding real — SQL de Supabase, Edge Functions, workflows n8n, frontend, tests. Lee este `CLAUDE.md`.
- **Jona**: operador entre ambas capas. Toma decisiones. Lleva contexto entre herramientas.

Regla: Claude Code **no** toma decisiones de arquitectura por sí solo. Las decisiones surgen de Claude.ai + Jona, y bajan acá como prompts concretos a ejecutar.

---

## Stack decidido

- **Supabase** — Postgres + Auth + Realtime + Edge Functions (Deno/TS) + Storage.
- **n8n Cloud** — orquestación de workflows (webhooks SAP/Importer/Metric, humano-en-el-loop, reintentos).
- **Netlify** — frontend hosting.
- **Claude API** — IA para control documental en fase 2 (vision + OCR para BLs).
- **GitHub** — repo remoto: `jzenteno-creador/export-control-automatization` (privado).
- **Resend** — email transaccional (pendiente de configurar).

**Regla de oro:** n8n orquesta, Postgres decide, Claude asiste.

Corolario: lógica de negocio crítica nunca vive dentro de nodos n8n. Va en funciones SQL o Edge Functions testeables. n8n solo invoca.

---

## Arquitectura target (alto nivel)

```
SAP ──304──▶ Importer ──(hipótesis)──▶ Metric ──301/315──▶ SAP
                │                              (no consumidos hoy)
                └── (mecanismo a definir: webhook / pull / replicación)
                        │
                        ▼
              ┌──────────────────────────┐
              │  Edge Function ingest    │
              │  (Supabase, Deno)        │
              │  persiste 304 crudo      │
              │  + idempotency constraint│
              └────────────┬─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Postgres   │
                    │             │
                    │ inbound_    │
                    │   events    │
                    │ orders      │
                    │ outbox      │
                    │ workflow_   │
                    │    log      │
                    └──────┬──────┘
                           │
                           ▼
                     ┌──────────┐
                     │   n8n    │
                     │workflows │
                     └──────────┘
                           │
                           ▼
              Acciones: BL draft, mailing, tracking
```

**Patrones críticos:**
- **Idempotency**: `INSERT ... ON CONFLICT DO NOTHING` sobre `(source, message_type, external_id)` + hash del payload.
- **Outbox pattern**: escritura transaccional + dispatcher vía `pg_cron` cada 10–30s.
- **Workflow log**: tabla `append-only` particionada por mes, JSONB con `jsonb_path_ops` para inputs/outputs.
- **REDO**: cualquier orden debe poder reprocesarse desde `inbound_events` y dar el mismo estado derivado.

---

## Criterios no negociables (impuestos por IT de SSB)

1. **Logging completo**: inputs, outputs, timestamps, estados por cada paso.
2. **Idempotencia**: mismo mensaje reenviado no duplica efectos.
3. **Sin acoplamiento** a estructuras internas de Metric/Importer. Solo APIs públicas estables.
4. **Validar con Brian/Santiago** antes de apoyarse en comportamiento específico del código legacy.
5. **Persistir primero, procesar después**: el 304 crudo se guarda antes de disparar cualquier lógica.

Estos criterios no se negocian en implementación. Si un prompt sugiere violarlos, frená y consultá a Jona.

---

## Repos de referencia (solo lectura — NO modificar)

- **Importer** (Laravel 8 + PHP): `~/projects/importer`
- **Metric / sosab-api**: `~/projects/metric-api`

Se consumen sus APIs públicas (Scribe en `https://importer.ssbplatform.com/docs`). No se replica lógica interna. No se hacen PRs a estos repos.

---

## Estructura del repo (actual — post cleanup)

```
.
├── .claude/
│   └── skills/
│       ├── supabase/                    # Skill oficial, instalada por lock
│       └── supabase-postgres-best-practices/
├── .git/
├── .venv/                               # virtualenv Python (puede reusarse o eliminarse)
├── CLAUDE.md                            # este archivo
├── docs/                                # destino de docs del research (research.md, plan.md, preguntas.md) + manual de entorno
├── requirements.txt                     # vacío — pendiente de definir si el stack requiere Python
├── skills-lock.json                     # lockfile de skills versionadas
├── .gitattributes
└── .gitignore
```

**Nada más existe todavía.** La estructura del código productivo se define cuando arranque el build.

---

## Skills disponibles

En `.claude/skills/`:
- `supabase/` — patrones oficiales de Supabase (RLS, auth, CLI).
- `supabase-postgres-best-practices/` — reglas de performance y seguridad de Postgres.

Instaladas y versionadas vía `skills-lock.json`. No modificar manualmente.

Skills propias del proyecto (ej: `ssb-export-docs` con templates de BL, reglas de Incoterms 2020, formato por carrier) se crearán más adelante dentro de `.claude/skills/`.

---

## Convenciones de código

**A definir cuando arranque el build.** Cuando se escriba la primera Edge Function, el primer workflow de n8n o el primer componente de frontend, Claude Code propone convenciones basadas en el stack y Jona las valida. Acá se documentan.

Temas pendientes a resolver en ese momento:
- Nomenclatura de tablas (snake_case, plurales).
- Estructura de Edge Functions (por dominio vs por evento).
- Formato de nodos n8n y naming de workflows.
- Lenguaje de comentarios y docs (español).
- Política de tests.

---

## Reglas de interacción con Jona

### Antes de responder
- Aplicar **autocrítica interna**. Verificar que la respuesta sea correcta, completa, no asumida. **No narrar la autocrítica.**
- Si hay ambigüedad: **preguntar, no asumir**.

### Formato
- Respuestas concisas. Cero relleno.
- No repetir información (no mostrar la misma tabla/cuadro dos veces).
- Paths absolutos y comandos exactos.

### Cuando Claude Code da opciones
- Marcar **"(mi recomendación)"** al lado de la opción preferida, con justificación breve.
- No dar 5 opciones sin opinión.

### Cuando Claude Code espera respuesta
- No dar el próximo paso hasta que Jona responda.
- Preguntas al final de la respuesta, no diseminadas.

### Acciones destructivas o de cambio relevante
Antes de ejecutar borrados, reescrituras, modificaciones de schema, operaciones irreversibles o cambios de configuración:
1. Reportar el análisis previo: dependencias, efectos colaterales, dudas.
2. Esperar OK explícito de Jona.
3. No hacer commit salvo instrucción explícita.
4. Al terminar, reportar resultado (git status, tests, logs).

### Idioma
Español rioplatense, voseo. Inglés para código, herramientas, docs técnicas.

---

## Fase actual

**Investigación.** Objetivo inmediato:
- Consolidar `research.md`, `plan.md`, `preguntas.md` en el proyecto Claude.ai.
- Obtener schema del mensaje 304 con payloads reales del módulo "Logs de JSON" del Importer.
- Resolver preguntas críticas con Brian/Santiago (mecanismo de trigger, flujo Importer↔Metric).

**No arrancar coding hasta tener:**
- Schema del 304 documentado.
- Mecanismo de ingestión decidido (webhook vs pull vs replicación).
- Schema de base de datos propuesto y revisado.

---

*Última actualización: abril 2026 — post cleanup del validador viejo.*

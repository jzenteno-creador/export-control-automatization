-- Walking Skeleton — Schema inicial para ingesta de eventos externos
--
-- Dos tablas en schema public:
--   inbound_events: payload crudo, inmutable, idempotente vía hash.
--   inbound_log:    bitácora de cada intento de recepción (exitoso o no).
--
-- RLS habilitado en ambas. SIN policies.
-- Solo service_role (usado por la Edge Function ingest-304) puede leer/escribir.
--
-- Primer consumidor: 304 de SAP (Dow → webhook nuestro).
-- Diseño source-agnostic para futuras fuentes (301, 315, otros).

-- ─── inbound_events ─────────────────────────────────────────────────
create table public.inbound_events (
  id                  uuid        primary key default gen_random_uuid(),
  source              text        not null,
  payload_hash        text        not null unique,
  payload             jsonb       not null,
  payload_size_bytes  integer     not null,
  received_at         timestamptz not null default now()
);

alter table public.inbound_events enable row level security;

comment on table  public.inbound_events is
  'Eventos entrantes crudos. Inmutable. Idempotencia vía payload_hash unique.';
comment on column public.inbound_events.source is
  'Identificador de la fuente. Walking Skeleton: ''sap-304-webhook''. Futuro: ''sap-301'', ''metric-315'', etc.';
comment on column public.inbound_events.payload_hash is
  'SHA-256 hex (64 chars) del body crudo tal como se recibió. Base de la deduplicación.';
comment on column public.inbound_events.payload is
  'JSON crudo parseado. Campos no validados. No normalizado.';

-- ─── inbound_log ────────────────────────────────────────────────────
create table public.inbound_log (
  id                  uuid        primary key default gen_random_uuid(),
  received_at         timestamptz not null default now(),
  source_ip           inet,
  user_agent          text,
  payload_size_bytes  integer,
  payload_hash        text,
  result              text        not null
    check (result in ('inserted', 'duplicate', 'auth_failed', 'bad_json', 'error')),
  status_code         smallint    not null,
  error_message       text,
  event_id            uuid        references public.inbound_events(id) on delete set null
);

alter table public.inbound_log enable row level security;

create index inbound_log_received_at_idx on public.inbound_log (received_at desc);
create index inbound_log_result_errors_idx
  on public.inbound_log (result)
  where result <> 'inserted';
-- Índice cubriente para la FK event_id (accionable del performance advisor).
create index inbound_log_event_id_idx on public.inbound_log (event_id);

comment on table  public.inbound_log is
  'Bitácora de cada intento de recepción. Cubre inserts, duplicados, auth fallida, JSON inválido, errores.';
comment on column public.inbound_log.event_id is
  'FK a inbound_events cuando result in (''inserted'',''duplicate''). Null cuando auth/bad_json/error.';

-- Multi-source support — habilitar segunda fuente (Metric 301) sin colisión con 304.
--
-- Decisión (sesión 2026-05-04):
--   El UNIQUE simple en payload_hash (sql/001) impide que dos fuentes distintas
--   ingresen, en teoría, payloads con el mismo hash. La probabilidad práctica es
--   baja (SHA-256 + payloads heterogéneos), pero el invariante correcto del
--   diseño source-agnostic es que la idempotencia sea POR fuente, no global.
--
-- Cambio:
--   DROP UNIQUE (payload_hash)
--   ADD  UNIQUE (source, payload_hash)
--
-- Compatibilidad: las 116 filas existentes (todas source='sap-304-webhook',
-- payload_hash únicos dentro de esa fuente) satisfacen la nueva constraint.
--
-- Ver también: docs/webhook-contract-301.md, sql/001_inbound_schema.sql.

alter table public.inbound_events
  drop constraint inbound_events_payload_hash_key;

alter table public.inbound_events
  add constraint inbound_events_source_payload_hash_key
  unique (source, payload_hash);

comment on constraint inbound_events_source_payload_hash_key
  on public.inbound_events is
  'Idempotencia por fuente. Mismo payload_hash puede coexistir si el source difiere.';

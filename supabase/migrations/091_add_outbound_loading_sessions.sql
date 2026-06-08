-- 091_add_outbound_loading_sessions.sql
CREATE TABLE IF NOT EXISTS wh_loading_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id     UUID NOT NULL REFERENCES wh_outbound_shipments(id) ON DELETE CASCADE,
  session_number  INT NOT NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ,
  pause_reason    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_loading_sessions_shipment_session 
ON wh_loading_sessions(shipment_id, session_number);

-- Update the check constraint for wh_outbound_shipments status
ALTER TABLE wh_outbound_shipments DROP CONSTRAINT IF EXISTS wh_outbound_shipments_status_check;

ALTER TABLE wh_outbound_shipments ADD CONSTRAINT wh_outbound_shipments_status_check 
CHECK (status IN (
  'PLANNED', 'PENDING', 'ASSIGNED', 'PICKING', 'STAGING',
  'READY_FOR_CHECKING', 'CHECKING', 'READY_FOR_LOADING',
  'TRUCK_ARRIVED', 'LOADING', 'READY_FOR_DOCUMENTS', 'COMPLETED', 'DISPATCHED', 'CANCELLED'
));

-- Add total loading minutes to shipment table
ALTER TABLE wh_outbound_shipments ADD COLUMN IF NOT EXISTS total_loading_minutes NUMERIC(10,2);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

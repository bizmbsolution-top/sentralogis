-- Migration 20260828_017: Server-side defaults for job_orders tracking tokens
--
-- U-10 E-class fix: Move tracking_token and driver_link_token generation
-- from client-side crypto.randomUUID()/Math.random() to database-level defaults.
-- This ensures authoritative token generation stays at the server boundary.

-- Add server-side defaults for tracking_token (UUID format)
ALTER TABLE job_orders
  ALTER COLUMN tracking_token SET DEFAULT gen_random_uuid()::text;

-- Add server-side defaults for driver_link_token (short alphanumeric)
ALTER TABLE job_orders
  ALTER COLUMN driver_link_token SET DEFAULT substring(gen_random_uuid()::text, 1, 13);

-- Add server-side default for wa_token (same format as tracking_token)
ALTER TABLE job_orders
  ALTER COLUMN wa_token SET DEFAULT gen_random_uuid()::text;

COMMENT ON COLUMN job_orders.tracking_token IS 'Server-generated UUID for driver portal access (/jo/[token]). Default: gen_random_uuid().';
COMMENT ON COLUMN job_orders.driver_link_token IS 'Server-generated short token for driver link. Default: substring of UUID.';
COMMENT ON COLUMN job_orders.wa_token IS 'Server-generated UUID for WhatsApp token. Default: gen_random_uuid().';

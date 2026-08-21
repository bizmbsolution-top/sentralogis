-- Enforce API-driven Identity Writes
-- Revoke direct insert, update, delete from public authenticated clients on md_drivers
-- Read access (SELECT) remains untouched for UI components

BEGIN;

REVOKE INSERT, UPDATE, DELETE ON public.md_drivers FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.md_drivers FROM anon;

-- Ensure service_role can still do everything
GRANT ALL ON public.md_drivers TO service_role;

COMMIT;

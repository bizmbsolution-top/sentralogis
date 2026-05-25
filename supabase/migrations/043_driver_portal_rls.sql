-- Migration 043: Allow anonymous driver portal to read job orders
-- Eksekusi di Supabase SQL Editor

CREATE POLICY "driver_portal_jo_select" ON public.job_orders
FOR SELECT USING (
  auth.role() = 'anon'
);

CREATE POLICY "driver_portal_routes_select" ON public.job_routes
FOR SELECT USING (
  auth.role() = 'anon'
);

CREATE POLICY "driver_portal_wo_items_select" ON public.wo_items
FOR SELECT USING (
  auth.role() = 'anon'
);



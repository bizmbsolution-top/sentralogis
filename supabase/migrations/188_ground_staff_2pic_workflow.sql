-- Migration 188: Ground Staff 2-PIC Workflow
-- Adds verification columns to ground_events
-- Adds new columns to existing ground_documents (from migration 187)
-- Creates ground_assignment_pics table

-- 1. Add columns to ground_events
ALTER TABLE public.ground_events ADD COLUMN IF NOT EXISTS verification_type TEXT;
ALTER TABLE public.ground_events ADD COLUMN IF NOT EXISTS verified_against TEXT;
ALTER TABLE public.ground_events ADD COLUMN IF NOT EXISTS verified_match BOOLEAN;
ALTER TABLE public.ground_events ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ground_staff';

-- 2. Add new columns to existing ground_documents table (created in migration 187)
ALTER TABLE public.ground_documents ADD COLUMN IF NOT EXISTS job_order_id UUID REFERENCES public.job_orders(id) ON DELETE CASCADE;
ALTER TABLE public.ground_documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.ground_documents ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Create ground_assignment_pics table
CREATE TABLE IF NOT EXISTS public.ground_assignment_pics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id UUID NOT NULL REFERENCES public.job_orders(id) ON DELETE CASCADE,
  pic1_staff_id UUID REFERENCES public.ground_staff_profiles(id) ON DELETE SET NULL,
  pic2_staff_id UUID REFERENCES public.ground_staff_profiles(id) ON DELETE SET NULL,
  assigned_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_order_id)
);

-- 4. Enable RLS
ALTER TABLE public.ground_assignment_pics ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for ground_assignment_pics
DROP POLICY IF EXISTS "ground_staff_read_assignment" ON public.ground_assignment_pics;
CREATE POLICY "ground_staff_read_assignment" ON public.ground_assignment_pics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ground_staff_profiles gsp
      WHERE gsp.user_id = auth.uid() AND gsp.is_active = true
    )
  );

DROP POLICY IF EXISTS "admin_all_access_assignment" ON public.ground_assignment_pics;
CREATE POLICY "admin_all_access_assignment" ON public.ground_assignment_pics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users au WHERE au.id = auth.uid()
    )
  );

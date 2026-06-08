ALTER TABLE public.job_tracking ADD COLUMN IF NOT EXISTS job_route_id UUID REFERENCES public.job_routes(id) ON DELETE CASCADE;
ALTER TABLE public.job_tracking ADD COLUMN IF NOT EXISTS photo_url TEXT;

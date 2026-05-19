-- 1. Add tax_id to job_orders
ALTER TABLE public.job_orders ADD COLUMN IF NOT EXISTS tax_id uuid REFERENCES public.md_taxes(id);

-- 2. Add tax_id to extra_costs (add_costs)
ALTER TABLE public.extra_costs ADD COLUMN IF NOT EXISTS tax_id uuid REFERENCES public.md_taxes(id);

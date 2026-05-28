-- Migration 046: Customer invoice line items (per-row COA + manual/extra costs)

-- Ensure invoices table exists with columns used by the app
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
  invoice_number TEXT,
  total_billing NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  tax_percentage NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  invoice_date DATE,
  due_date DATE,
  sent_at TIMESTAMPTZ,
  customer_accepted_invoice_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  co_revenue_account_id UUID REFERENCES public.finance_coa(id) ON DELETE SET NULL,
  tax_id UUID REFERENCES public.md_taxes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_percentage NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS co_revenue_account_id UUID REFERENCES public.finance_coa(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_id UUID REFERENCES public.md_taxes(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_accepted_invoice_at TIMESTAMPTZ;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_invoices_wo ON public.invoices(wo_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- Per-line invoice items
CREATE TABLE IF NOT EXISTS public.invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  tenant_id UUID,
  line_type TEXT NOT NULL DEFAULT 'ritase',
  job_order_id UUID REFERENCES public.job_orders(id) ON DELETE SET NULL,
  extra_cost_id UUID REFERENCES public.extra_costs(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  coa_id UUID REFERENCES public.finance_coa(id) ON DELETE SET NULL,
  charge_type TEXT NOT NULL DEFAULT 'ritase',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_amount NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON public.invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_jo ON public.invoice_lines(job_order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_extra_cost ON public.invoice_lines(extra_cost_id);

ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoice_lines_all ON public.invoice_lines;
CREATE POLICY invoice_lines_all ON public.invoice_lines
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoices_all ON public.invoices;
CREATE POLICY invoices_all ON public.invoices
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

SELECT '046_invoice_lines OK' AS result;

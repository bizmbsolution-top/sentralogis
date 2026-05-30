-- Migration 049: Add COA accounts for costing/payment flow
-- Enables full double-entry for driver payments, vendor AP, and vendor costs.

-- Kas/Bank (Asset)
INSERT INTO public.finance_coa (account_number, account_name, category)
VALUES ('1-11010', 'Kas Bank', 'Asset')
ON CONFLICT (account_number) DO NOTHING;

-- Hutang Usaha Vendor / AP (Liability)
INSERT INTO public.finance_coa (account_number, account_name, category)
VALUES ('2-20100', 'Hutang Usaha Vendor', 'Liability')
ON CONFLICT (account_number) DO NOTHING;

-- HPP Jasa Vendor (Expense)
INSERT INTO public.finance_coa (account_number, account_name, category)
VALUES ('5-50020', 'HPP Jasa Vendor', 'Expense')
ON CONFLICT (account_number) DO NOTHING;

-- HPP Extra Cost / Biaya Operasional (Expense)
INSERT INTO public.finance_coa (account_number, account_name, category)
VALUES ('5-50030', 'HPP Biaya Operasional', 'Expense')
ON CONFLICT (account_number) DO NOTHING;

-- Add wo_id column to finance_journals for WO-level P&L aggregation
ALTER TABLE public.finance_journals ADD COLUMN IF NOT EXISTS wo_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_finance_journals_wo ON public.finance_journals(wo_id);

SELECT '049_add_costing_coa_accounts OK' AS result;

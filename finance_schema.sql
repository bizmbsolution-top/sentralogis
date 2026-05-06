-- ==========================================
-- PHASE 1: FINANCE MODULE SCHEMA
-- ==========================================

-- 1. Create finance_coa (Chart of Account)
CREATE TABLE IF NOT EXISTS public.finance_coa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number varchar(20) NOT NULL UNIQUE,
  account_name varchar(100) NOT NULL,
  category varchar(50) NOT NULL,
  parent_id uuid REFERENCES public.finance_coa(id),
  is_header boolean DEFAULT false,
  description text,
  starting_balance numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Update job_orders to support base deal and driver share
ALTER TABLE public.job_orders ADD COLUMN IF NOT EXISTS base_price numeric DEFAULT 0;
ALTER TABLE public.job_orders ADD COLUMN IF NOT EXISTS driver_share_percentage numeric DEFAULT 40.0;

-- 3. Create add_costs (formerly extra_costs)
CREATE TABLE IF NOT EXISTS public.add_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid REFERENCES public.job_orders(id) ON DELETE CASCADE,
  cost_type varchar(50) NOT NULL, -- unloading, port_ticket, overnight, waiting, other
  charge_type varchar(50) DEFAULT 'reimbursement', -- surcharge, reimbursement
  amount numeric NOT NULL DEFAULT 0,
  description text,
  is_billable boolean DEFAULT true,
  status varchar(20) DEFAULT 'draft', -- draft, need_approval, approved, rejected
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.add_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to add_costs for authenticated users" ON public.add_costs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Create finance_journals
CREATE TABLE IF NOT EXISTS public.finance_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid REFERENCES public.job_orders(id) ON DELETE SET NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_no varchar(50),
  description text,
  total_amount numeric DEFAULT 0,
  source_type varchar(50),
  status varchar(20) DEFAULT 'draft',
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Create finance_journal_entries
CREATE TABLE IF NOT EXISTS public.finance_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid REFERENCES public.finance_journals(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.finance_coa(id),
  description text,
  debit numeric DEFAULT 0,
  credit numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- 6. Insert Default Chart of Accounts (Sesuai Mekari Jurnal)
INSERT INTO public.finance_coa (account_number, account_name, category)
VALUES
  ('1-10100', 'Piutang Usaha', 'Asset'),
  ('1-10120', 'Piutang Reimbursement', 'Asset'),
  ('2-20110', 'Hutang Bagi Hasil Driver', 'Liability'),
  ('2-20120', 'Hutang Titipan Reimbursement', 'Liability'),
  ('4-40010', 'Pendapatan Jasa Trucking', 'Revenue'),
  ('4-40020', 'Pendapatan Surcharge', 'Revenue'),
  ('5-50010', 'HPP Bagi Hasil Driver', 'Expense')
ON CONFLICT (account_number) DO NOTHING;

-- 7. RLS Policies (Enable RLS for finance tables)
ALTER TABLE public.finance_coa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_journal_entries ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write for now (can be restricted to finance roles later)
CREATE POLICY "Allow full access to finance tables for authenticated users" ON public.finance_coa FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to finance journals for authenticated users" ON public.finance_journals FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 8. Update drivers for Bank Accounts
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS bank_name varchar(50);
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS bank_account_number varchar(30);
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS bank_account_name varchar(100);

-- 9. Update cash_advances for Payment Tracking
ALTER TABLE public.cash_advances ADD COLUMN IF NOT EXISTS transfer_proof_url text;
ALTER TABLE public.cash_advances ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;
-- 10. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role varchar(50), -- role tujuan (misal: sbu_fin_tr)
  title varchar(100) NOT NULL,
  message text NOT NULL,
  link varchar(255),
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to read their own notifications or by role" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id OR role = (SELECT role FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Allow system to insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const s = createClient(url, key);

async function runPhase1() {
  const sql = `
-- Create finance_coa
CREATE TABLE IF NOT EXISTS finance_coa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number varchar(20) NOT NULL UNIQUE,
  account_name varchar(100) NOT NULL,
  category varchar(50) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Update job_orders
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS base_price numeric DEFAULT 0;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS driver_share_percentage numeric DEFAULT 40.0;

-- Update extra_costs
ALTER TABLE extra_costs ADD COLUMN IF NOT EXISTS charge_type varchar(50) DEFAULT 'reimbursement';

-- Create finance_journals
CREATE TABLE IF NOT EXISTS finance_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id uuid REFERENCES job_orders(id) ON DELETE SET NULL,
  journal_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_no varchar(50),
  description text,
  status varchar(20) DEFAULT 'draft',
  created_at timestamp with time zone DEFAULT now()
);

-- Create finance_journal_entries
CREATE TABLE IF NOT EXISTS finance_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid REFERENCES finance_journals(id) ON DELETE CASCADE,
  account_id uuid REFERENCES finance_coa(id),
  description text,
  debit numeric DEFAULT 0,
  credit numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Insert Default CoA
INSERT INTO finance_coa (account_number, account_name, category)
VALUES
  ('1-10100', 'Piutang Usaha', 'Asset'),
  ('1-10120', 'Piutang Reimbursement', 'Asset'),
  ('2-20110', 'Hutang Bagi Hasil Driver', 'Liability'),
  ('2-20120', 'Hutang Titipan Reimbursement', 'Liability'),
  ('4-40010', 'Pendapatan Jasa Trucking', 'Revenue'),
  ('4-40020', 'Pendapatan Surcharge', 'Revenue'),
  ('5-50010', 'HPP Bagi Hasil Mitra', 'Expense')
ON CONFLICT (account_number) DO NOTHING;
`;

  const { data, error } = await s.rpc('exec_sql_manual', { sql_query: sql });
  console.log('Result:', data);
  if (error) console.error('Error:', error);
}

runPhase1();

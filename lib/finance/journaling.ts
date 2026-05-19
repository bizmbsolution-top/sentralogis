import { supabase } from '@/lib/supabaseClient';

export type JournalSource = 'surcharge' | 'reimbursement' | 'job_order_revenue' | 'cogs_adjustment';

interface JournalParams {
  jobOrderId: string;
  amount: number;
  description: string;
  sourceType: JournalSource;
  metadata?: Record<string, unknown>;
}

export async function createJournalEntry({
  jobOrderId,
  amount,
  description,
  sourceType,
  metadata
}: JournalParams) {
  try {
    // 1. Get CoA Mappings (In production, these should be configurable)
    // For now we query by category/name from finance_coa
    const { data: coa } = await supabase.from('finance_coa').select('*');
    if (!coa) throw new Error('Chart of Accounts not found');

    const getAccount = (code: string) => coa.find(a => a.account_number === code);

    // Mappings based on finance_schema.sql
    const accPiutang = getAccount('1-10100'); // Piutang Usaha
    const accPendapatan = getAccount('4-40010'); // Pendapatan Jasa Trucking
    const accHutangDriver = getAccount('2-20110'); // Hutang Bagi Hasil Driver
    const accBebanBagiHasil = getAccount('5-50010'); // HPP Bagi Hasil Driver

    if (!accPiutang || !accPendapatan || !accHutangDriver) {
      throw new Error('Required CoA mappings (1-10100, 4-40010, 2-20110) not found');
    }

    // 2. Create Header
    const { data: journal, error: jError } = await supabase
      .from('finance_journals')
      .insert({
        job_order_id: jobOrderId,
        journal_date: new Date().toISOString().split('T')[0],
        description: description,
        status: 'draft'
      })
      .select()
      .single();

    if (jError) throw jError;

    const entries = [];

    if (sourceType === 'surcharge') {
      const driverSharePct = metadata?.driver_share_percentage || 40;
      const driverAmount = (amount * driverSharePct) / 100;

      // (D) Piutang Usaha
      entries.push({
        journal_id: journal.id,
        account_id: accPiutang.id,
        debit: amount,
        credit: 0
      });
      // (K) Pendapatan
      entries.push({
        journal_id: journal.id,
        account_id: accPendapatan.id,
        debit: 0,
        credit: amount
      });
      // (D) Beban Bagi Hasil
      entries.push({
        journal_id: journal.id,
        account_id: accBebanBagiHasil?.id || accPendapatan.id,
        debit: driverAmount,
        credit: 0
      });
      // (K) Hutang Driver
      entries.push({
        journal_id: journal.id,
        account_id: accHutangDriver.id,
        debit: 0,
        credit: driverAmount
      });
    } else if (sourceType === 'reimbursement') {
      // (D) Piutang Usaha
      entries.push({
        journal_id: journal.id,
        account_id: accPiutang.id,
        debit: amount,
        credit: 0
      });
      // (K) Hutang Driver (Pass-through)
      entries.push({
        journal_id: journal.id,
        account_id: accHutangDriver.id,
        debit: 0,
        credit: amount
      });
    } else if (sourceType === 'job_order_revenue') {
      const driverSharePct = metadata?.driver_share_percentage || 40;
      const driverAmount = (amount * driverSharePct) / 100;

      // (D) Piutang Usaha
      entries.push({
        journal_id: journal.id,
        account_id: accPiutang.id,
        debit: amount,
        credit: 0
      });
      // (K) Pendapatan Angkutan
      entries.push({
        journal_id: journal.id,
        account_id: accPendapatan.id,
        debit: 0,
        credit: amount
      });
      // (D) Beban Bagi Hasil
      entries.push({
        journal_id: journal.id,
        account_id: accBebanBagiHasil?.id || accPendapatan.id,
        debit: driverAmount,
        credit: 0
      });
      // (K) Hutang Driver
      entries.push({
        journal_id: journal.id,
        account_id: accHutangDriver.id,
        debit: 0,
        credit: driverAmount
      });
    } else if (sourceType === 'cogs_adjustment') {
      // (D) Beban / HPP (Adjustment)
      entries.push({
        journal_id: journal.id,
        account_id: accBebanBagiHasil?.id || accPendapatan.id,
        debit: amount,
        credit: 0
      });
      // (K) Hutang Driver / Kas
      entries.push({
        journal_id: journal.id,
        account_id: accHutangDriver.id,
        debit: 0,
        credit: amount
      });
    }

    if (entries.length > 0) {
      const { error: eError } = await supabase.from('finance_journal_entries').insert(entries);
      if (eError) throw eError;
    }

    return { success: true, journalId: journal.id };
  } catch (error) {
    console.error('Journaling Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

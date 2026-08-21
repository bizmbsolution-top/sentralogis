import { supabase } from '@/lib/supabaseClient';

export type JournalSource =
  | 'surcharge'
  | 'reimbursement'
  | 'job_order_revenue'
  | 'cogs_adjustment'
  | 'vendor_cost'
  | 'driver_payment'
  | 'vendor_payment';

interface JournalParams {
  jobOrderId?: string;
  woId?: string;
  amount: number;
  description: string;
  sourceType: JournalSource;
  metadata?: Record<string, unknown>;
}

async function getCoaByCode(code: string) {
  const { data } = await supabase
    .from('finance_coa')
    .select('id, account_number, account_name')
    .eq('account_number', code)
    .maybeSingle();
  return data;
}

export async function createJournalEntry({
  jobOrderId,
  woId,
  amount,
  description,
  sourceType,
  metadata
}: JournalParams) {
  try {
    const { data: coaData } = await supabase.from('finance_coa').select('*');
    if (!coaData) throw new Error('Chart of Accounts not found');
    const coa = coaData as any[];

    const getAccount = (code: string) => coa.find((a: any) => a.account_number === code);

    const accPiutang = getAccount('1-10100');
    const accPendapatan = getAccount('4-40010');
    const accHutangDriver = getAccount('2-20110');
    const accBebanBagiHasil = getAccount('5-50010');
    const accKasBank = getAccount('1-11010');
    const accHutangVendor = getAccount('2-20100');
    const accHppVendor = getAccount('5-50020');
    const accHppOperasional = getAccount('5-50030');

    const journalData: Record<string, unknown> = {
      journal_date: new Date().toISOString().split('T')[0],
      description,
      status: 'posted'
    };
    if (jobOrderId) journalData.job_order_id = jobOrderId;
    if (woId) journalData.wo_id = woId;

    const { data: journalDataRes, error: jError } = await supabase
      .from('finance_journals')
      .insert(journalData)
      .select()
      .single();

    if (jError) throw jError;
    const journal = journalDataRes as any;

    const entries: Array<{
      journal_id: string;
      account_id: string;
      description?: string;
      debit: number;
      credit: number;
    }> = [];

    if (sourceType === 'surcharge') {
      const driverSharePct = Number(metadata?.driver_share_percentage ?? 0);
      const driverAmount = (amount * driverSharePct) / 100;

      if (accPiutang && accPendapatan) {
        entries.push({ journal_id: journal.id, account_id: accPiutang.id, debit: amount, credit: 0 });
        entries.push({ journal_id: journal.id, account_id: accPendapatan.id, debit: 0, credit: amount });
      }
      if (driverAmount > 0) {
        const driverDebitAccount = metadata?.costAccountId
          ? coa.find(a => a.id === metadata.costAccountId) || accBebanBagiHasil
          : accBebanBagiHasil;
        if (driverDebitAccount && accHutangDriver) {
          entries.push({ journal_id: journal.id, account_id: driverDebitAccount.id, debit: driverAmount, credit: 0 });
          entries.push({ journal_id: journal.id, account_id: accHutangDriver.id, debit: 0, credit: driverAmount });
        }
      }
    } else if (sourceType === 'reimbursement') {
      if (accPiutang && accHutangDriver) {
        entries.push({ journal_id: journal.id, account_id: accPiutang.id, debit: amount, credit: 0 });
        entries.push({ journal_id: journal.id, account_id: accHutangDriver.id, debit: 0, credit: amount });
      }
    } else if (sourceType === 'job_order_revenue') {
      const driverSharePct = Number(metadata?.driver_share_percentage ?? 0);
      const driverAmount = (amount * driverSharePct) / 100;

      if (accPiutang && accPendapatan) {
        entries.push({ journal_id: journal.id, account_id: accPiutang.id, debit: amount, credit: 0 });
        entries.push({ journal_id: journal.id, account_id: accPendapatan.id, debit: 0, credit: amount });
      }
      if (driverAmount > 0) {
        const driverDebitAccount = metadata?.costAccountId
          ? coa.find(a => a.id === metadata.costAccountId) || accBebanBagiHasil
          : accBebanBagiHasil;
        if (driverDebitAccount && accHutangDriver) {
          entries.push({ journal_id: journal.id, account_id: driverDebitAccount.id, debit: driverAmount, credit: 0 });
          entries.push({ journal_id: journal.id, account_id: accHutangDriver.id, debit: 0, credit: driverAmount });
        }
      }
    } else if (sourceType === 'cogs_adjustment') {
      const targetAccount = accBebanBagiHasil || accPendapatan;
      if (targetAccount && accHutangDriver) {
        entries.push({ journal_id: journal.id, account_id: targetAccount.id, debit: amount, credit: 0 });
        entries.push({ journal_id: journal.id, account_id: accHutangDriver.id, debit: 0, credit: amount });
      }
    } else if (sourceType === 'vendor_cost') {
      // (D) HPP Jasa Vendor (or custom costAccountId) / (K) Hutang Usaha Vendor
      const vendorDebitAccount = metadata?.costAccountId
        ? coa.find(a => a.id === metadata.costAccountId) || accHppVendor
        : accHppVendor;
      if (vendorDebitAccount && accHutangVendor) {
        entries.push({ journal_id: journal.id, account_id: vendorDebitAccount.id, debit: amount, credit: 0 });
        entries.push({ journal_id: journal.id, account_id: accHutangVendor.id, debit: 0, credit: amount });
      }
    } else if (sourceType === 'driver_payment') {
      // (D) Hutang Bagi Hasil Driver / (K) Kas Bank
      if (accHutangDriver && accKasBank) {
        entries.push({ journal_id: journal.id, account_id: accHutangDriver.id, debit: amount, credit: 0 });
        entries.push({ journal_id: journal.id, account_id: accKasBank.id, debit: 0, credit: amount });
      }
    } else if (sourceType === 'vendor_payment') {
      // (D) Hutang Usaha Vendor / (K) Kas Bank
      if (accHutangVendor && accKasBank) {
        entries.push({ journal_id: journal.id, account_id: accHutangVendor.id, debit: amount, credit: 0 });
        entries.push({ journal_id: journal.id, account_id: accKasBank.id, debit: 0, credit: amount });
      }
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

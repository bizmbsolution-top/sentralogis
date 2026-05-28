import puppeteer, { type PDFOptions } from 'puppeteer'
import { createClient } from '@/lib/supabase/server'
import { calculateInvoiceTotals, type InvoiceLineRow } from '@/lib/domain/invoice/lines'

export type PdfResult = {
  buffer: Buffer
  filename: string
}

type PdfInvoiceData = {
  invoice: {
    id: string
    invoice_number: string | null
    invoice_date: string | null
    due_date: string | null
    status: string
    wo_id: string | null
    tax_percentage: number | null
  }
  tenant: {
    name: string
    logo_url: string | null
  } | null
  workOrder: {
    wo_number: string | null
    customer: {
      name: string
      legal_name: string | null
      address: string | null
      company_address: string | null
      tax_id: string | null
      npwp: string | null
    } | null
  } | null
  lines: InvoiceLineRow[]
  totals: {
    dpp: number
    reimbursement: number
    surcharge: number
    taxAmount: number
    grandTotal: number
  }
  taxRate: number
  coaList: { id: string; account_number: string; account_name: string }[]
}

async function fetchInvoiceData(invoiceId: string): Promise<PdfInvoiceData> {
  const supabase = await createClient()

  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single()

  if (invError || !invoice) {
    throw new Error(invError?.message || 'Invoice not found')
  }

  const tenantIdRes = await supabase
    .from('invoice_lines')
    .select('tenant_id')
    .eq('invoice_id', invoice.id)
    .limit(1)
    .maybeSingle()

  let tenantId: string | null = null
  if (tenantIdRes.data?.tenant_id) {
    tenantId = tenantIdRes.data.tenant_id
  } else {
    const { data: authUser } = await supabase.auth.getUser().catch(() => ({ data: null }))
    if (authUser?.user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', authUser.user.id)
        .maybeSingle()
      if (profile?.tenant_id) tenantId = profile.tenant_id
    }
  }

  const [{ data: wo }, { data: tenantData }] = await Promise.all([
    invoice.wo_id
      ? supabase
          .from('work_orders')
          .select('wo_number, customer:md_entities!customer_id(name, legal_name, address, company_address, tax_id, npwp)')
          .eq('id', invoice.wo_id)
          .single()
      : { data: null },
    tenantId
      ? supabase
          .from('tenants')
          .select('name, logo_url')
          .eq('id', tenantId)
          .maybeSingle()
      : { data: null },
  ])

  if (!tenantData) {
    throw new Error('Tenant not found for this invoice')
  }

  const { data: dbLines } = await supabase
    .from('invoice_lines')
    .select('*')
    .eq('invoice_id', invoice.id)
    .order('sort_order')

  const { data: coaData } = await supabase
    .from('finance_coa')
    .select('id, account_number, account_name')
    .order('account_number')

  const coaList = coaData || []

  let lines: InvoiceLineRow[] = []
  if (dbLines && dbLines.length > 0) {
    lines = dbLines.map((row: any) => ({
      id: row.id,
      dbId: row.id,
      line_type: row.line_type || 'manual',
      job_order_id: row.job_order_id,
      extra_cost_id: row.extra_cost_id,
      description: row.description || '',
      coa_id: row.coa_id,
      charge_type: row.charge_type || 'ritase',
      quantity: Number(row.quantity) || 0,
      unit_amount: Number(row.unit_amount) || 0,
      amount: Number(row.amount) || 0,
      sort_order: row.sort_order || 0,
      jo_number: (row as any).jo_number,
      fleet_plate: (row as any).fleet_plate,
      driver_name: (row as any).driver_name,
      route: (row as any).route,
    }))
  }

  const taxRate = Number(invoice.tax_percentage) || 0
  const totals = calculateInvoiceTotals(lines, taxRate)

  const rawWo = wo as any
  let customer = null
  if (rawWo?.customer) {
    const c = Array.isArray(rawWo.customer) ? rawWo.customer[0] : rawWo.customer
    customer = c
      ? {
          name: c.legal_name || c.name || '',
          legal_name: c.legal_name || null,
          address: c.address || null,
          company_address: c.company_address || null,
          tax_id: c.tax_id || null,
          npwp: c.npwp || null,
        }
      : null
  }

  return {
    invoice: {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      status: invoice.status || 'draft',
      wo_id: invoice.wo_id,
      tax_percentage: invoice.tax_percentage,
    },
    tenant: tenantData,
    workOrder: rawWo
      ? {
          wo_number: rawWo.wo_number || null,
          customer,
        }
      : null,
    lines,
    totals,
    taxRate,
    coaList,
  }
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const CHARGE_LABELS: Record<string, string> = {
  ritase: 'RITASE',
  surcharge: 'SURCHARGE',
  reimbursement: 'REIMBURSEMENT',
}

function renderInvoiceHtml(data: PdfInvoiceData): string {
  const {
    invoice,
    tenant,
    workOrder,
    lines,
    totals,
    taxRate,
    coaList,
  } = data

  const customerName =
    workOrder?.customer?.name || '-'
  const customerAddress =
    workOrder?.customer?.address ||
    workOrder?.customer?.company_address ||
    null
  const customerTaxId =
    workOrder?.customer?.tax_id ||
    workOrder?.customer?.npwp ||
    null

  const lineRows = lines
    .map(
      (line, idx) => `
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 2.5mm 2mm; vertical-align: top;">
        <div style="font-weight: 500; margin-bottom: 1mm;">${escHtml(line.description || '-')}</div>
        <div style="font-size: 8px; color: #666;">
          ${CHARGE_LABELS[line.charge_type] || line.charge_type}
          ${line.jo_number ? ` • ${escHtml(line.jo_number)}` : ''}
          ${line.fleet_plate ? ` • ${escHtml(line.fleet_plate)}` : ''}
        </div>
      </td>
      <td style="padding: 2.5mm 2mm; text-align: right; white-space: nowrap;">${line.quantity}</td>
      <td style="padding: 2.5mm 2mm; text-align: right; white-space: nowrap;">${formatRupiah(line.unit_amount)}</td>
      <td style="padding: 2.5mm 2mm; text-align: right; white-space: nowrap; font-weight: 500;">${formatRupiah(line.amount)}</td>
    </tr>`,
    )
    .join('')

  const lineRowsDetail = lines
    .map(
      (line, idx) => `
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 2mm; vertical-align: top;">
        <div style="font-weight: 500;">${escHtml(line.description)}</div>
        ${line.jo_number ? `<div style="font-size: 7.5px; color: #666; margin-top: 0.5mm;">JO: ${escHtml(line.jo_number)}</div>` : ''}
        ${line.driver_name ? `<div style="font-size: 7.5px; color: #666;">Driver: ${escHtml(line.driver_name)}</div>` : ''}
      </td>
      <td style="padding: 2mm; font-size: 8px;">${CHARGE_LABELS[line.charge_type] || line.charge_type}</td>
      <td style="padding: 2mm; text-align: center;">${line.quantity}</td>
      <td style="padding: 2mm; text-align: right;">${formatRupiah(line.unit_amount)}</td>
      <td style="padding: 2mm; text-align: right; font-weight: 500;">${formatRupiah(line.amount)}</td>
      <td style="padding: 2mm; font-size: 7.5px; color: #666;">
        ${(coaList.find((c) => c.id === line.coa_id)?.account_number) || '-'}
      </td>
    </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: white; color: #000; font-family: Arial, sans-serif; }
  @page { size: A4; margin: 0; }
  .page { width: 210mm; min-height: 297mm; padding: 15mm; box-sizing: border-box; display: flex; flex-direction: column; }
  .page-break { page-break-after: always; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12mm; padding-bottom: 8mm; border-bottom: 2px solid #000; }
  .header-left { display: flex; align-items: center; gap: 8mm; }
  .logo { height: 20mm; width: auto; }
  .tenant-name { font-size: 16px; font-weight: bold; letter-spacing: 0.5px; }
  .tax-label { font-size: 9px; color: #333; margin-top: 2mm; }
  .invoice-title { font-size: 11px; font-weight: bold; margin-bottom: 2mm; }
  .invoice-number { font-size: 13px; font-weight: bold; font-family: monospace; }
  .info-grid { margin-bottom: 10mm; display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
  .info-label { font-size: 8px; font-weight: bold; color: #333; margin-bottom: 1mm; }
  .info-value { font-size: 10px; font-weight: 500; }
  .section-divider { margin-bottom: 10mm; padding-bottom: 8mm; border-bottom: 1px solid #999; display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; }
  .section-title { font-size: 8px; font-weight: bold; color: #333; margin-bottom: 2mm; }
  .customer-name { font-size: 10px; line-height: 1.4; font-weight: bold; margin-bottom: 1mm; }
  .customer-detail { font-size: 9px; color: #555; margin-bottom: 1mm; white-space: pre-wrap; }
  .table { width: 100%; border-collapse: collapse; font-size: 9px; }
  .table thead tr { border-bottom: 2px solid #000; border-top: 2px solid #000; }
  .table th { text-align: left; padding: 3mm 2mm; font-weight: bold; }
  .table th.right { text-align: right; }
  .table th.center { text-align: center; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 8mm; }
  .totals-inner { width: 100mm; }
  .totals-row { display: flex; justify-content: space-between; padding: 1.5mm 0; font-size: 9px; border-bottom: 1px solid #999; }
  .totals-grand { display: flex; justify-content: space-between; padding: 2mm 0; font-size: 11px; font-weight: bold; border-top: 2px solid #000; margin-top: 1mm; }
  .signature { display: flex; justify-content: space-between; padding-top: 8mm; font-size: 9px; }
  .signature-col { text-align: center; }
  .signature-space { margin-bottom: 16mm; }
  .signature-line { border-top: 1px solid #000; padding-top: 2mm; width: 40mm; }
  .detail-header { margin-bottom: 10mm; padding-bottom: 6mm; border-bottom: 1px solid #999; }
  .detail-title { font-size: 12px; font-weight: bold; }
  .detail-subtitle { font-size: 9px; color: #666; margin-top: 1mm; }
  .footer { margin-top: auto; padding-top: 10mm; border-top: 1px solid #ddd; font-size: 7px; color: #999; text-align: center; }
</style>
</head>
<body>

<!-- PAGE 1 -->
<div class="page page-break">
  <div class="header">
    <div class="header-left">
      ${tenant?.logo_url ? `<img src="${escHtml(tenant.logo_url)}" alt="Logo" class="logo" />` : ''}
      <div>
        <div class="tenant-name">${escHtml(tenant?.name || 'SENTRALOGIS')}</div>
        <div class="tax-label">FAKTUR PAJAK</div>
      </div>
    </div>
    <div style="text-align: right;">
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-number">${escHtml(invoice.invoice_number || '-')}</div>
    </div>
  </div>

  <div class="info-grid">
    <div>
      <div class="info-label">TANGGAL INVOICE</div>
      <div class="info-value">${formatDate(invoice.invoice_date)}</div>
    </div>
    <div>
      <div class="info-label">JATUH TEMPO</div>
      <div class="info-value">${formatDate(invoice.due_date)}</div>
    </div>
    <div>
      <div class="info-label">WORK ORDER</div>
      <div class="info-value" style="font-family: monospace;">${escHtml(workOrder?.wo_number || '-')}</div>
    </div>
    <div>
      <div class="info-label">STATUS</div>
      <div class="info-value">${escHtml(invoice.status.toUpperCase())}</div>
    </div>
  </div>

  <div class="section-divider">
    <div>
      <div class="section-title">DITAGIHKAN KEPADA</div>
      <div class="customer-name">${escHtml(customerName)}</div>
      ${customerAddress ? `<div class="customer-detail">${escHtml(customerAddress)}</div>` : ''}
      ${customerTaxId ? `<div class="customer-detail" style="margin-top: 0.5mm;">NPWP: ${escHtml(customerTaxId)}</div>` : ''}
    </div>
    <div>
      <div class="section-title">INFORMASI PAJAK</div>
      <div style="font-size: 10px;">
        <div style="font-weight: bold;">PPN: ${taxRate}%</div>
      </div>
    </div>
  </div>

  <div style="margin-bottom: 8mm; flex: 1;">
    <table class="table">
      <thead>
        <tr>
          <th style="width: 42%;">DESKRIPSI</th>
          <th class="right" style="width: 12mm;">QTY</th>
          <th class="right" style="width: 20mm;">HARGA</th>
          <th class="right" style="width: 25mm;">JUMLAH</th>
        </tr>
      </thead>
      <tbody>
        ${lineRows || '<tr><td colspan="4" style="padding: 4mm; text-align: center; color: #999; font-size: 9px;">No items</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="totals">
    <div class="totals-inner">
      <div class="totals-row">
        <span>DPP</span>
        <span>${formatRupiah(totals.dpp)}</span>
      </div>
      <div class="totals-row">
        <span>PPN (${taxRate}%)</span>
        <span>${formatRupiah(totals.taxAmount)}</span>
      </div>
      ${totals.reimbursement > 0 ? `
      <div class="totals-row">
        <span>Reimbursement</span>
        <span>${formatRupiah(totals.reimbursement)}</span>
      </div>` : ''}
      <div class="totals-grand">
        <span>TOTAL INVOICE</span>
        <span>${formatRupiah(totals.grandTotal)}</span>
      </div>
    </div>
  </div>

  <div class="signature">
    <div><div class="signature-space">Disiapkan oleh:</div><div class="signature-line">Finance</div></div>
    <div class="signature-col"><div class="signature-space">Mengesahkan:</div><div class="signature-line">HQ Manager</div></div>
    <div class="signature-col"><div class="signature-space">Diterima oleh:</div><div class="signature-line">Customer</div></div>
  </div>
</div>

<!-- PAGE 2 -->
<div class="page">
  <div class="detail-header">
    <div class="detail-title">DETAIL INVOICE — ${escHtml(invoice.invoice_number || '-')}</div>
    <div class="detail-subtitle">${escHtml(tenant?.name || '')} | ${formatDate(invoice.invoice_date)}</div>
  </div>

  <div style="margin-bottom: 10mm;">
    <table class="table" style="font-size: 8.5px;">
      <thead>
        <tr>
          <th style="width: 30%;">DESKRIPSI</th>
          <th style="width: 15%;">TIPE</th>
          <th class="center" style="width: 10%;">QTY</th>
          <th class="right" style="width: 18%;">UNIT PRICE</th>
          <th class="right" style="width: 18%;">AMOUNT</th>
          <th style="width: 9%;">COA</th>
        </tr>
      </thead>
      <tbody>
        ${lineRowsDetail || '<tr><td colspan="6" style="padding: 4mm; text-align: center; color: #999; font-size: 8.5px;">No items</td></tr>'}
      </tbody>
    </table>
  </div>

  <div style="margin-top: 8mm; padding-top: 8mm; border-top: 2px solid #000;">
    <div class="totals">
      <div class="totals-inner">
        <div class="totals-row">
          <span>Subtotal (DPP):</span>
          <span>${formatRupiah(totals.dpp)}</span>
        </div>
        <div class="totals-row">
          <span>PPN (${taxRate}%):</span>
          <span>${formatRupiah(totals.taxAmount)}</span>
        </div>
        ${totals.reimbursement > 0 ? `
        <div class="totals-row">
          <span>Reimbursement:</span>
          <span>${formatRupiah(totals.reimbursement)}</span>
        </div>` : ''}
        <div class="totals-grand">
          <span>TOTAL:</span>
          <span>${formatRupiah(totals.grandTotal)}</span>
        </div>
      </div>
    </div>
  </div>

  <div style="margin-top: 12mm; font-size: 8px; color: #555; line-height: 1.5;">
    <div style="font-weight: bold; margin-bottom: 2mm;">CATATAN:</div>
    <ul style="margin-left: 5mm; padding-left: 0;">
      <li>Invoice ini berlaku sebagai bukti transaksi resmi</li>
      <li>Pembayaran dapat dilakukan sesuai dengan jatuh tempo yang telah ditentukan</li>
      <li>Dokumen ini dicetak oleh sistem dan sah tanpa tanda tangan</li>
    </ul>
  </div>

  <div class="footer">
    Generated by ${escHtml(tenant?.name || '')} | Printed: ${new Date().toLocaleString('id-ID')}
  </div>
</div>

</body>
</html>`
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getPuppeteerExecutablePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  return undefined
}

export async function generateInvoicePdf(
  invoiceId: string,
  invoiceNumber?: string | null,
): Promise<PdfResult> {
  const data = await fetchInvoiceData(invoiceId)

  const filename = invoiceNumber
    ? `invoice-${invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`
    : `invoice-${invoiceId}.pdf`

  const executablePath = getPuppeteerExecutablePath()
  const html = renderInvoiceHtml(data)

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })

  try {
    const page = await browser.newPage()

    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    })

    await page.evaluate(() => window.scrollTo(0, 0))

    const pdfOptions: PDFOptions = {
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: false,
      displayHeaderFooter: false,
    }

    const buffer = await page.pdf(pdfOptions)

    return { buffer: Buffer.from(buffer), filename }
  } finally {
    await browser.close().catch(() => {})
  }
}

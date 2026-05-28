import type { InvoiceTemplateBaseProps } from '@/types/invoice'

function formatCurrency(value: number, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function LightBrand({
  tenant,
  invoice,
  customer,
  lines,
  totals,
  notes,
  terms,
  currency,
  tax_rate,
}: InvoiceTemplateBaseProps) {
  const primary = tenant.branding?.primary_color ?? '#0f766e'
  const font = tenant.branding?.font ?? 'Georgia, serif'

  return (
    <div className="print:w-full print:bg-white" style={{ fontFamily: font }}>
      <div className="brand-invoice-page">
        <div className="brand-header">
          <div className="flex items-center gap-6">
            {tenant.logo_url && (
              <div className="brand-logo-ring" style={{ borderColor: primary }}>
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="brand-logo"
                />
              </div>
            )}
            <div>
              <div className="text-2xl font-bold tracking-wide" style={{ color: primary }}>
                {tenant.name}
              </div>
              {tenant.address && (
                <div className="brand-text-sm mt-1">{tenant.address}</div>
              )}
              {tenant.phone && (
                <div className="brand-text-sm">Phone: {tenant.phone}</div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[26px] font-light italic" style={{ color: primary }}>
              Invoice
            </div>
            <div className="brand-meta">
              <div className="brand-meta-item">
                <span className="brand-meta-label">No.</span>
                <span className="brand-meta-value">{invoice.invoice_number}</span>
              </div>
              <div className="brand-meta-item">
                <span className="brand-meta-label">Date</span>
                <span className="brand-meta-value">{formatDate(invoice.invoice_date)}</span>
              </div>
              <div className="brand-meta-item">
                <span className="brand-meta-label">Due</span>
                <span className="brand-meta-value">{formatDate(invoice.due_date)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="brand-divider" style={{ background: `linear-gradient(to right, ${primary}, transparent)` }} />

        <div className="brand-customer">
          <div className="brand-customer-title" style={{ color: primary }}>Bill To</div>
          <div className="font-bold text-sm">{customer.name}</div>
          {customer.address && (
            <div className="brand-text-sm whitespace-pre-wrap">{customer.address}</div>
          )}
          {customer.tax_id && (
            <div className="brand-text-sm mt-1">Tax ID: {customer.tax_id}</div>
          )}
        </div>

        <table className="brand-table">
          <thead>
            <tr>
              <th className="brand-th text-center w-[6%]">#</th>
              <th className="brand-th text-left">Description</th>
              <th className="brand-th text-center w-[10%]">Qty</th>
              <th className="brand-th text-right w-[18%]">Unit Price</th>
              <th className="brand-th text-right w-[18%]">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={line.id} className="brand-row">
                <td className="brand-td text-center">{idx + 1}</td>
                <td className="brand-td">{line.description}</td>
                <td className="brand-td text-center">{line.quantity}</td>
                <td className="brand-td text-right">{formatCurrency(line.unit_amount, currency)}</td>
                <td className="brand-td text-right font-semibold">{formatCurrency(line.amount, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="brand-summary">
          <div className="brand-summary-inner">
            <div className="brand-summary-row">
              <span>Subtotal (DPP)</span>
              <span>{formatCurrency(totals.dpp, currency)}</span>
            </div>
            {totals.tax > 0 && (
              <div className="brand-summary-row">
                <span>Tax{typeof tax_rate === 'number' ? ` (${tax_rate}%)` : ''}</span>
                <span>{formatCurrency(totals.tax, currency)}</span>
              </div>
            )}
            <div className="brand-summary-total" style={{ borderTopColor: primary }}>
              <span style={{ color: primary }}>Total Due</span>
              <span className="text-base" style={{ color: primary }}>
                {formatCurrency(totals.grand_total, currency)}
              </span>
            </div>
          </div>
        </div>

        {(notes || terms) && (
          <div className="brand-notes">
            {notes && (
              <div className="mb-2">
                <div className="font-bold text-[9px] mb-0.5" style={{ color: primary }}>Notes</div>
                <div className="text-[9px] leading-relaxed text-gray-500 italic">{notes}</div>
              </div>
            )}
            {terms && (
              <div>
                <div className="font-bold text-[9px] mb-0.5" style={{ color: primary }}>Terms & Conditions</div>
                <div className="text-[9px] leading-relaxed text-gray-500 italic">{terms}</div>
              </div>
            )}
          </div>
        )}

        <div className="brand-footer" style={{ borderTopColor: primary }}>
          <div className="text-[7px] text-gray-400 text-center">
            Thank you for your business
            <br />
            Generated on {new Date().toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .brand-invoice-page {
          width: 210mm;
          min-height: 297mm;
          padding: 12mm 15mm;
          margin: 0 auto;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          background: #fafaf9;
        }
        .brand-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10mm;
        }
        .brand-logo-ring {
          width: 50px;
          height: 50px;
          border: 2px solid;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .brand-logo {
          width: 40px;
          height: 40px;
          object-fit: contain;
        }
        .brand-text-sm {
          font-size: 9px;
          color: #666;
          line-height: 1.5;
        }
        .brand-meta {
          margin-top: 4mm;
          display: flex;
          flex-direction: column;
          gap: 1.5mm;
        }
        .brand-meta-item {
          display: flex;
          justify-content: space-between;
          gap: 6mm;
        }
        .brand-meta-label {
          font-size: 8px;
          color: #aaa;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .brand-meta-value {
          font-size: 10px;
          font-weight: 600;
          font-family: monospace;
        }
        .brand-divider {
          height: 1px;
          width: 100%;
          margin-bottom: 8mm;
        }
        .brand-customer {
          margin-bottom: 10mm;
        }
        .brand-customer-title {
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 2mm;
        }
        .brand-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
          margin-bottom: 10mm;
        }
        .brand-table thead tr {
          border-bottom: 2px solid #e5e7eb;
        }
        .brand-th {
          padding: 3mm 4mm;
          font-weight: 600;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #888;
        }
        .brand-td {
          padding: 3mm 4mm;
          border-bottom: 1px solid #e5e7eb;
          font-size: 9px;
        }
        .brand-row:last-child td {
          border-bottom: none;
        }
        .brand-summary {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 12mm;
        }
        .brand-summary-inner {
          width: 110mm;
        }
        .brand-summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          padding: 2mm 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .brand-summary-total {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          padding-top: 3mm;
          border-top: 2px solid;
          margin-top: 2mm;
        }
        .brand-notes {
          margin-bottom: 8mm;
        }
        .brand-footer {
          margin-top: auto;
          padding-top: 8mm;
          border-top: 1px solid;
        }
        @media print {
          * { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; }
          body { background: #fafaf9 !important; margin: 0 !important; padding: 0 !important; color: #000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          html { margin: 0 !important; padding: 0 !important; }
          @page { size: A4; margin: 0 !important; }
          img { max-width: 100%; height: auto; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          table { width: 100%; border-collapse: collapse; }
          td, th { word-wrap: break-word; }
          tr { page-break-inside: avoid; }
          .brand-table thead tr { border-bottom-color: #e5e7eb !important; }
        }
      `}</style>
    </div>
  )
}

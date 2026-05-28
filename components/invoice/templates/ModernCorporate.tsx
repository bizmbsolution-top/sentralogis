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

export default function ModernCorporate({
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
  const primary = tenant.branding?.primary_color ?? '#1e40af'
  const font = tenant.branding?.font ?? 'Arial, sans-serif'

  const statusColor =
    invoice.status === 'paid'
      ? '#16a34a'
      : invoice.status === 'overdue'
        ? '#dc2626'
        : '#f59e0b'

  return (
    <div className="print:w-full print:bg-white" style={{ fontFamily: font }}>
      <div className="corp-invoice-page">
        <div className="corp-top-bar" style={{ backgroundColor: primary }} />

        <div className="corp-header">
          <div className="flex gap-8 items-start">
            {tenant.logo_url && (
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="corp-logo"
              />
            )}
            <div>
              <div className="text-xl font-bold tracking-tight" style={{ color: primary }}>
                {tenant.name}
              </div>
              {tenant.address && (
                <div className="corp-text-sm mt-1">{tenant.address}</div>
              )}
              {tenant.phone && (
                <div className="corp-text-sm">Phone: {tenant.phone}</div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[28px] font-bold tracking-wider" style={{ color: primary }}>
              INVOICE
            </div>
            <div
              className="inline-block px-3 py-1 rounded text-[9px] font-bold text-white mt-1"
              style={{ backgroundColor: statusColor }}
            >
              {invoice.status.toUpperCase()}
            </div>
            <div className="corp-meta-grid">
              <div>
                <span className="corp-meta-label">Invoice No</span>
                <span className="corp-meta-value">{invoice.invoice_number}</span>
              </div>
              <div>
                <span className="corp-meta-label">Invoice Date</span>
                <span className="corp-meta-value">{formatDate(invoice.invoice_date)}</span>
              </div>
              <div>
                <span className="corp-meta-label">Due Date</span>
                <span className="corp-meta-value">{formatDate(invoice.due_date)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="corp-divider" style={{ backgroundColor: primary }} />

        <div className="corp-customer-section">
          <div className="corp-customer-badge" style={{ backgroundColor: primary }}>
            BILL TO
          </div>
          <div className="font-bold text-sm mt-2">{customer.name}</div>
          {customer.address && (
            <div className="corp-text-sm whitespace-pre-wrap">{customer.address}</div>
          )}
          {customer.tax_id && (
            <div className="corp-text-sm mt-1">Tax ID: {customer.tax_id}</div>
          )}
        </div>

        <table className="corp-table">
          <thead>
            <tr style={{ backgroundColor: primary }}>
              <th className="corp-th text-center w-[6%]">#</th>
              <th className="corp-th text-left">Description</th>
              <th className="corp-th text-center w-[10%]">Qty</th>
              <th className="corp-th text-right w-[18%]">Unit Price</th>
              <th className="corp-th text-right w-[18%]">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="corp-td text-center italic text-gray-400">
                  No items
                </td>
              </tr>
            ) : (
              lines.map((line, idx) => (
                <tr key={line.id} className="corp-row">
                  <td className="corp-td text-center">{idx + 1}</td>
                  <td className="corp-td">{line.description}</td>
                  <td className="corp-td text-center">{line.quantity}</td>
                  <td className="corp-td text-right">{formatCurrency(line.unit_amount, currency)}</td>
                  <td className="corp-td text-right font-semibold">{formatCurrency(line.amount, currency)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="corp-summary">
          <div className="corp-summary-inner">
            <div className="corp-summary-row">
              <span>Subtotal (DPP):</span>
              <span>{formatCurrency(totals.dpp, currency)}</span>
            </div>
            {totals.tax > 0 && (
              <div className="corp-summary-row">
                <span>Tax{typeof tax_rate === 'number' ? ` (${tax_rate}%)` : ''}:</span>
                <span>{formatCurrency(totals.tax, currency)}</span>
              </div>
            )}
            <div className="corp-summary-grand" style={{ borderTopColor: primary }}>
              <span>TOTAL</span>
              <span className="text-lg" style={{ color: primary }}>
                {formatCurrency(totals.grand_total, currency)}
              </span>
            </div>
          </div>
        </div>

        {(notes || terms) && (
          <div className="corp-notes">
            {notes && (
              <div className="mb-2">
                <div className="font-bold text-[9px] mb-0.5" style={{ color: primary }}>Notes:</div>
                <div className="text-[9px] leading-relaxed text-gray-600">{notes}</div>
              </div>
            )}
            {terms && (
              <div>
                <div className="font-bold text-[9px] mb-0.5" style={{ color: primary }}>Terms & Conditions:</div>
                <div className="text-[9px] leading-relaxed text-gray-600">{terms}</div>
              </div>
            )}
          </div>
        )}

        <div className="corp-footer">
          <div className="corp-footer-bar" style={{ backgroundColor: primary }} />
          <div className="text-[7px] text-gray-400 text-center mt-1">
            This is an electronically generated document. No signature is required.
            <br />
            Printed on {new Date().toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .corp-invoice-page {
          width: 210mm;
          min-height: 297mm;
          padding: 0;
          margin: 0 auto;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        .corp-top-bar {
          height: 6px;
          width: 100%;
        }
        .corp-header {
          display: flex;
          justify-content: space-between;
          padding: 12mm 15mm 8mm;
        }
        .corp-logo {
          height: 22mm;
          width: auto;
          object-fit: contain;
        }
        .corp-text-sm {
          font-size: 9px;
          color: #555;
          line-height: 1.5;
        }
        .corp-meta-grid {
          margin-top: 4mm;
          display: grid;
          grid-template-columns: 1fr;
          gap: 2mm;
        }
        .corp-meta-grid > div {
          display: flex;
          flex-direction: column;
        }
        .corp-meta-label {
          font-size: 8px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .corp-meta-value {
          font-size: 10px;
          font-weight: 600;
          font-family: monospace;
        }
        .corp-divider {
          height: 2px;
          margin: 0 15mm;
          opacity: 0.3;
        }
        .corp-customer-section {
          padding: 8mm 15mm;
        }
        .corp-customer-badge {
          display: inline-block;
          padding: 1.5mm 5mm;
          color: white;
          font-size: 8px;
          font-weight: bold;
          letter-spacing: 1px;
          border-radius: 2px;
        }
        .corp-table {
          width: calc(100% - 30mm);
          margin: 0 15mm;
          border-collapse: collapse;
          font-size: 9px;
        }
        .corp-th {
          padding: 3mm 4mm;
          color: white;
          font-weight: 600;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .corp-td {
          padding: 3mm 4mm;
          border-bottom: 1px solid #e5e7eb;
          font-size: 9px;
        }
        .corp-row:nth-child(even) {
          background-color: #f8fafc;
        }
        .corp-summary {
          display: flex;
          justify-content: flex-end;
          padding: 8mm 15mm 10mm;
        }
        .corp-summary-inner {
          width: 120mm;
        }
        .corp-summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          padding: 2mm 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .corp-summary-grand {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          padding-top: 3mm;
          border-top: 3px solid;
          margin-top: 2mm;
        }
        .corp-notes {
          padding: 0 15mm 8mm;
        }
        .corp-footer {
          margin-top: auto;
          padding: 5mm 15mm 8mm;
        }
        .corp-footer-bar {
          height: 3px;
          width: 100%;
          opacity: 0.2;
        }
        @media print {
          * { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; color: #000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          html { margin: 0 !important; padding: 0 !important; }
          @page { size: A4; margin: 0 !important; }
          img { max-width: 100%; height: auto; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          table { width: 100%; border-collapse: collapse; }
          td, th { word-wrap: break-word; }
          tr { page-break-inside: avoid; }
          .corp-row:nth-child(even) { background-color: #f8fafc !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .corp-customer-badge { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .corp-th { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  )
}

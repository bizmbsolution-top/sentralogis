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

export default function MinimalBlackWhite({
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
  return (
    <div className="print:w-full bg-white text-black print:bg-white"
      style={{ fontFamily: tenant.branding?.font ?? 'Arial, sans-serif' }}
    >
      <div className="print-invoice-page">
        <div className="print-invoice-header">
          <div className="flex gap-8 items-start">
            {tenant.logo_url && (
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="print-logo"
              />
            )}
            <div>
              <div className="text-lg font-bold tracking-wide mb-1">
                {tenant.name}
              </div>
              {tenant.address && (
                <div className="print-text-secondary mb-0.5">{tenant.address}</div>
              )}
              {tenant.phone && (
                <div className="print-text-secondary">Phone: {tenant.phone}</div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold mb-3">INVOICE</div>
            <div className="mb-2">
              <div className="print-text-label">Invoice Number</div>
              <div className="text-xs font-bold font-mono">{invoice.invoice_number}</div>
            </div>
            <div className="mb-2">
              <div className="print-text-label">Invoice Date</div>
              <div className="text-[10px]">{formatDate(invoice.invoice_date)}</div>
            </div>
            <div>
              <div className="print-text-label">Due Date</div>
              <div className="text-[10px]">{formatDate(invoice.due_date)}</div>
            </div>
          </div>
        </div>

        <div className="print-invoice-to">
          <div className="print-text-label font-bold mb-1">INVOICE TO</div>
          <div className="text-xs font-bold mb-0.5">{customer.name}</div>
          {customer.address && (
            <div className="print-text-secondary whitespace-pre-wrap">{customer.address}</div>
          )}
          {customer.tax_id && (
            <div className="print-text-secondary mt-1">Tax ID: {customer.tax_id}</div>
          )}
        </div>

        <div className="flex-1">
          <table className="print-items-table">
            <thead>
              <tr>
                <th className="print-th w-[8%] text-center">No</th>
                <th className="print-th text-left">Description</th>
                <th className="print-th w-[10%] text-center">Qty</th>
                <th className="print-th w-[18%] text-right">Unit Price</th>
                <th className="print-th w-[18%] text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id}>
                  <td className="print-td text-center">{idx + 1}</td>
                  <td className="print-td">{line.description}</td>
                  <td className="print-td text-center">{line.quantity}</td>
                  <td className="print-td text-right">{formatCurrency(line.unit_amount, currency)}</td>
                  <td className="print-td text-right font-medium">{formatCurrency(line.amount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="print-summary">
          <div className="print-summary-inner">
            <div className="print-summary-row">
              <span>Subtotal (DPP):</span>
              <span>{formatCurrency(totals.dpp, currency)}</span>
            </div>
            {totals.tax > 0 && (
              <div className="print-summary-row">
                <span>Tax{typeof tax_rate === 'number' ? ` (${tax_rate}%)` : ''}:</span>
                <span>{formatCurrency(totals.tax, currency)}</span>
              </div>
            )}
            <div className="print-summary-total">
              <span>TOTAL:</span>
              <span>{formatCurrency(totals.grand_total, currency)}</span>
            </div>
          </div>
        </div>

        {(notes || terms) && (
          <div className="print-notes">
            {notes && (
              <div className="mb-2">
                <div className="font-bold text-[8px] mb-0.5">Notes:</div>
                <div className="text-[8px] leading-relaxed">{notes}</div>
              </div>
            )}
            {terms && (
              <div>
                <div className="font-bold text-[8px] mb-0.5">Terms & Conditions:</div>
                <div className="text-[8px] leading-relaxed">{terms}</div>
              </div>
            )}
          </div>
        )}

        <div className="print-footer">
          This is an electronically generated document. No signature is required.
          <br />
          Printed on {new Date().toLocaleString('id-ID')}
        </div>
      </div>

      <style jsx global>{`
        .print-invoice-page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          margin: 0 auto;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        .print-invoice-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15mm;
          padding-bottom: 10mm;
          border-bottom: 2px solid #000;
        }
        .print-logo {
          height: 25mm;
          width: auto;
          object-fit: contain;
        }
        .print-text-secondary {
          font-size: 9px;
          color: #333;
          line-height: 1.4;
        }
        .print-text-label {
          font-size: 9px;
          color: #666;
          margin-bottom: 1mm;
        }
        .print-invoice-to {
          margin-bottom: 12mm;
        }
        .print-items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
        }
        .print-items-table thead tr {
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
        }
        .print-th {
          padding: 4mm;
          font-weight: bold;
        }
        .print-td {
          padding: 3.5mm 4mm;
          border-bottom: 1px solid #ddd;
          font-size: 9px;
        }
        .print-summary {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 15mm;
          padding-bottom: 10mm;
          border-bottom: 1px solid #999;
        }
        .print-summary-inner {
          width: 120mm;
        }
        .print-summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          margin-bottom: 2mm;
          padding-bottom: 2mm;
          border-bottom: 1px solid #ddd;
        }
        .print-summary-total {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: bold;
          padding-top: 3mm;
          border-top: 2px solid #000;
        }
        .print-notes {
          margin-bottom: 8mm;
          font-size: 8px;
          color: #555;
          line-height: 1.6;
        }
        .print-footer {
          margin-top: auto;
          padding-top: 10mm;
          border-top: 1px solid #999;
          font-size: 7px;
          color: #999;
          text-align: center;
        }
        @media print {
          * { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; color: #000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          html { margin: 0 !important; padding: 0 !important; }
          @page { size: A4; margin: 0 !important; padding: 0 !important; }
          @page :first { margin: 0 !important; }
          @page :last { margin: 0 !important; }
          .print\\:w-full { width: 100% !important; }
          .print\\:bg-white { background-color: white !important; }
          img { max-width: 100%; height: auto; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          table { width: 100%; border-collapse: collapse; }
          td, th { word-wrap: break-word; }
          tr { page-break-inside: avoid; }
          div, p { page-break-inside: avoid; }
        }
        @supports (-webkit-appearance: none) {
          @media print {
            body { margin: 0; padding: 0; }
            @page { margin: 0; }
          }
        }
      `}</style>
    </div>
  )
}

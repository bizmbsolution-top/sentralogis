'use client';

import { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Printer, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface BATBGeneratorProps {
  receipt: any;
  items: any[];
  damageRecords?: any[];
}

export default function BATBGenerator({ receipt, items, damageRecords = [] }: BATBGeneratorProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = () => {
    const element = printRef.current;
    if (!element) return;
    
    setIsGenerating(true);
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("Iframe document not found");

      iframeDoc.open();
      iframeDoc.write(`
        <html>
          <head>
            <title>BATB_${receipt.receipt_number?.replace(/^RCV-/, '')}</title>
            <style>
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
              body { font-family: sans-serif; margin: 0; }
              table { width: 100%; border-collapse: collapse; }
              .text-right { text-align: right; }
              .text-left { text-align: left; }
              .font-bold { font-weight: bold; }
            </style>
          </head>
          <body>
            ${element.innerHTML}
          </body>
        </html>
      `);
      iframeDoc.close();

      // Ensure iframe is loaded before printing
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          
          // Cleanup after print dialog opens
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            setIsGenerating(false);
          }, 1000);
        }, 200); // small delay to ensure rendering
      };

    } catch (err) {
      console.error('Failed to generate print document', err);
      setIsGenerating(false);
    }
  };

  const totalExpected = items.reduce((sum, item) => sum + (Number(item.expected_qty) || 0), 0);
  const totalGood = items.reduce((sum, item) => sum + (Number(item.actual_good_qty) || 0), 0);
  
  let totalQuarantine = 0;
  let totalReject = 0;
  let totalPending = 0;
  
  damageRecords.forEach(rec => {
    if (rec.decision === 'ACCEPT_QUARANTINE') totalQuarantine += Number(rec.qty);
    else if (rec.decision === 'REJECT_RETURN') totalReject += Number(rec.qty);
    else totalPending += Number(rec.qty);
  });

  const totalDamaged = totalQuarantine + totalReject + totalPending;

  const getDamageText = (rec: any) => {
    const sourceLabel = rec.damage_source === 'TRANSPORTER' ? 'Dari Transporter' : 'Kelalaian Staf';
    const conditionLabel = rec.damage_condition === 'PACKAGE_DAMAGED_INTACT' ? 'Kemasan Rusak, Isi Utuh' : 'Kemasan Rusak, Isi Berkurang';
    const decisionLabel = rec.decision === 'ACCEPT_QUARANTINE' ? '(Diterima Karantina)' : rec.decision === 'REJECT_RETURN' ? '(Ditolak/Return)' : '(Menunggu Keputusan)';
    return `${sourceLabel} | ${conditionLabel} ${decisionLabel}`;
  };

  return (
    <>
      <button 
        onClick={generatePdf}
        disabled={isGenerating}
        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-bold disabled:opacity-50"
      >
        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
        Cetak BATB (PDF)
      </button>

      {/* Hidden Print Template */}
      <div style={{ display: 'none' }}>
        <div ref={printRef} style={{ width: '210mm', minHeight: '297mm', backgroundColor: '#ffffff', color: '#000000', padding: '20px', fontFamily: 'sans-serif' }}>
          
          <div style={{ borderBottom: '2px solid #000000', marginBottom: '12px', paddingBottom: '8px' }}>
            <h1 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', margin: '0 0 2px 0' }}>BERITA ACARA TERIMA BARANG (BATB)</h1>
            <p style={{ fontSize: '9px', textAlign: 'center', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Dokumen Tanda Terima Resmi Gudang</p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '9px' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold', width: '18%' }}>No. Receipt</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px', width: '32%' }}>: {receipt.receipt_number?.replace(/^RCV-/, '')}</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold', width: '18%' }}>Lokasi Gudang</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px', width: '32%' }}>: {receipt.warehouse_name || '-'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>Nama Pelanggan</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px' }}>: {receipt.customer?.name || receipt.customer_name || '-'}</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>Shipper (Pengirim)</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px' }}>: {receipt.shipper?.name || '-'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>Transporter</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px' }}>: {receipt.transporter?.name || receipt.transporter_name_manual || '-'}</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>No. Polisi</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px' }}>: {receipt.fleet?.plate_number || '-'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>Tgl/Jam Kedatangan</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px' }}>: {format(new Date(receipt.actual_arrival || receipt.created_at), 'dd MMM yyyy HH:mm')}</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>Selesai Bongkar</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px' }}>: {receipt.unloading_end_time ? format(new Date(receipt.unloading_end_time), 'dd MMM yyyy HH:mm') : '-'}</td>
              </tr>
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '10px' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'left' }}>Kode SKU</th>
                <th style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'left' }}>Nama Barang</th>
                <th style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'right' }}>Target</th>
                <th style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'right' }}>Bagus</th>
                {totalQuarantine > 0 && <th style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'right' }}>Karantina</th>}
                {totalReject > 0 && <th style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'right' }}>Reject/Return</th>}
                {totalPending > 0 && <th style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'right' }}>Pending</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const itemDamages = damageRecords.filter(r => r.receipt_item_id === item.id);
                let iQ = 0, iR = 0, iP = 0;
                itemDamages.forEach(r => {
                  if (r.decision === 'ACCEPT_QUARANTINE') iQ += Number(r.qty);
                  else if (r.decision === 'REJECT_RETURN') iR += Number(r.qty);
                  else iP += Number(r.qty);
                });
                return (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #000000', padding: '4px 6px' }}>{item.product?.sku_code}</td>
                    <td style={{ border: '1px solid #000000', padding: '4px 6px' }}>{item.product?.name}</td>
                    <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'right' }}>{item.expected_qty}</td>
                    <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'right' }}>{item.actual_good_qty || '-'}</td>
                    {totalQuarantine > 0 && <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'right' }}>{iQ > 0 ? iQ : '-'}</td>}
                    {totalReject > 0 && <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'right' }}>{iR > 0 ? iR : '-'}</td>}
                    {totalPending > 0 && <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'right' }}>{iP > 0 ? iP : '-'}</td>}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 'bold' }}>
                <td colSpan={2} style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'right' }}>TOTAL KESELURUHAN</td>
                <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'right' }}>{totalExpected}</td>
                <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'right' }}>{totalGood}</td>
                {totalQuarantine > 0 && <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'right' }}>{totalQuarantine}</td>}
                {totalReject > 0 && <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'right' }}>{totalReject}</td>}
                {totalPending > 0 && <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'right' }}>{totalPending}</td>}
              </tr>
            </tfoot>
          </table>

          {totalDamaged > 0 && (
            <div style={{ border: '1px solid #000000', padding: '8px 12px', marginBottom: '24px', fontSize: '9px' }}>
              <h3 style={{ fontWeight: 'bold', margin: '0 0 4px 0', fontSize: '10px' }}>Catatan Barang Bermasalah (Rusak/Kurang):</h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {damageRecords.map((rec, idx) => {
                  const item = items.find(i => i.id === rec.receipt_item_id);
                  return (
                    <li key={idx} style={{ marginBottom: '2px' }}>
                      <strong>{item?.product?.name || 'Unknown'}</strong>: {rec.qty} unit. {getDamageText(rec)}
                      {rec.source_notes && ` (Ket: ${rec.source_notes})`}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', marginTop: '40px', fontSize: '10px' }}>
            <div style={{ width: '35%' }}>
              <p style={{ margin: '0 0 60px 0' }}>Diserahkan Oleh (Supir Transporter),</p>
              <div style={{ borderBottom: '1px solid #000000', width: '100%', margin: '0 auto 4px auto' }}></div>
              <p style={{ margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>{receipt.driver_name_manual || '(.......................................)'}</p>
            </div>
            <div style={{ width: '35%' }}>
              <p style={{ margin: '0 0 60px 0' }}>Diterima Oleh (Gudang),</p>
              <div style={{ borderBottom: '1px solid #000000', width: '100%', margin: '0 auto 4px auto' }}></div>
              <p style={{ margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>(.......................................)</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

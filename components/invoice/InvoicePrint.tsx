"use client";

import React, { useRef } from "react";
import { Printer } from "lucide-react";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoicePrintProps {
  // Invoice Data
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;

  // Tenant Data
  tenantName: string;
  tenantLogoUrl?: string;
  tenantAddress?: string;
  tenantPhone?: string;

  // Customer Data
  customerName: string;
  customerAddress?: string;

  // Items
  items: InvoiceItem[];

  // Financial Summary
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount: number;

  // Optional
  notes?: string;
  termsAndConditions?: string;
  currency?: string;
}

const InvoicePrint: React.FC<InvoicePrintProps> = ({
  invoiceNumber,
  invoiceDate,
  dueDate,
  tenantName,
  tenantLogoUrl,
  tenantAddress,
  tenantPhone,
  customerName,
  customerAddress,
  items,
  subtotal,
  taxRate = 10,
  taxAmount = 0,
  totalAmount,
  notes,
  termsAndConditions,
  currency = "IDR",
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <>
      {/* Print Button - Hidden on Print */}
      <div className="print:hidden mb-4 flex gap-3">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded border border-slate-900 hover:bg-slate-800 transition-colors"
        >
          <Printer size={16} />
          Print Invoice
        </button>
      </div>

      {/* Invoice Document */}
      <div
        ref={printRef}
        className="print:w-full bg-white text-black print:bg-white"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        <div
          style={{
            width: "210mm",
            height: "297mm",
            padding: "15mm",
            margin: "0 auto",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ========== HEADER SECTION ========== */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "15mm",
              paddingBottom: "10mm",
              borderBottom: "2px solid #000",
            }}
          >
            {/* Left: Logo & Company Info */}
            <div
              style={{ display: "flex", gap: "8mm", alignItems: "flex-start" }}
            >
              {tenantLogoUrl && (
                <img
                  src={tenantLogoUrl}
                  alt={tenantName}
                  style={{
                    height: "25mm",
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
              )}
              <div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    marginBottom: "2mm",
                    letterSpacing: "0.5px",
                  }}
                >
                  {tenantName}
                </div>
                {tenantAddress && (
                  <div
                    style={{
                      fontSize: "9px",
                      color: "#333",
                      marginBottom: "1mm",
                      lineHeight: "1.4",
                    }}
                  >
                    {tenantAddress}
                  </div>
                )}
                {tenantPhone && (
                  <div style={{ fontSize: "9px", color: "#333" }}>
                    Phone: {tenantPhone}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Invoice Info */}
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  marginBottom: "3mm",
                }}
              >
                INVOICE
              </div>
              <div style={{ marginBottom: "5mm" }}>
                <div
                  style={{
                    fontSize: "9px",
                    color: "#666",
                    marginBottom: "1mm",
                  }}
                >
                  Invoice Number
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    fontFamily: "monospace",
                  }}
                >
                  {invoiceNumber}
                </div>
              </div>
              <div style={{ marginBottom: "5mm" }}>
                <div
                  style={{
                    fontSize: "9px",
                    color: "#666",
                    marginBottom: "1mm",
                  }}
                >
                  Invoice Date
                </div>
                <div style={{ fontSize: "10px" }}>
                  {formatDate(invoiceDate)}
                </div>
              </div>
              {dueDate && (
                <div>
                  <div
                    style={{
                      fontSize: "9px",
                      color: "#666",
                      marginBottom: "1mm",
                    }}
                  >
                    Due Date
                  </div>
                  <div style={{ fontSize: "10px" }}>{formatDate(dueDate)}</div>
                </div>
              )}
            </div>
          </div>

          {/* ========== CUSTOMER SECTION ========== */}
          <div style={{ marginBottom: "12mm" }}>
            <div
              style={{
                fontSize: "9px",
                fontWeight: "bold",
                color: "#333",
                marginBottom: "3mm",
              }}
            >
              INVOICE TO
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "bold",
                  marginBottom: "1mm",
                }}
              >
                {customerName}
              </div>
              {customerAddress && (
                <div
                  style={{
                    fontSize: "9px",
                    color: "#555",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {customerAddress}
                </div>
              )}
            </div>
          </div>

          {/* ========== ITEMS TABLE ========== */}
          <div style={{ marginBottom: "12mm", flex: 1 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "9px",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderTop: "2px solid #000",
                    borderBottom: "2px solid #000",
                  }}
                >
                  <th
                    style={{
                      textAlign: "center",
                      padding: "4mm",
                      fontWeight: "bold",
                      width: "8%",
                    }}
                  >
                    No
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "4mm",
                      fontWeight: "bold",
                      width: "50%",
                    }}
                  >
                    Description
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "4mm",
                      fontWeight: "bold",
                      width: "12%",
                    }}
                  >
                    Qty
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "4mm",
                      fontWeight: "bold",
                      width: "15%",
                    }}
                  >
                    Unit Price
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "4mm",
                      fontWeight: "bold",
                      width: "15%",
                    }}
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    <td
                      style={{
                        textAlign: "center",
                        padding: "3.5mm 4mm",
                      }}
                    >
                      {index + 1}
                    </td>
                    <td
                      style={{
                        textAlign: "left",
                        padding: "3.5mm 4mm",
                      }}
                    >
                      {item.description}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        padding: "3.5mm 4mm",
                      }}
                    >
                      {item.quantity}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        padding: "3.5mm 4mm",
                      }}
                    >
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        padding: "3.5mm 4mm",
                        fontWeight: "500",
                      }}
                    >
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ========== SUMMARY SECTION ========== */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "15mm",
              paddingBottom: "10mm",
              borderBottom: "1px solid #999",
            }}
          >
            <div style={{ width: "120mm" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "9px",
                  marginBottom: "2mm",
                  paddingBottom: "2mm",
                  borderBottom: "1px solid #ddd",
                }}
              >
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              {taxAmount > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "9px",
                    marginBottom: "2mm",
                    paddingBottom: "2mm",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  <span>Tax ({taxRate}%):</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  fontWeight: "bold",
                  paddingTop: "3mm",
                  borderTop: "2px solid #000",
                }}
              >
                <span>TOTAL:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* ========== NOTES & TERMS ========== */}
          {(notes || termsAndConditions) && (
            <div
              style={{
                marginBottom: "8mm",
                fontSize: "8px",
                color: "#555",
                lineHeight: "1.6",
              }}
            >
              {notes && (
                <div style={{ marginBottom: "3mm" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "1mm" }}>
                    Notes:
                  </div>
                  <div>{notes}</div>
                </div>
              )}
              {termsAndConditions && (
                <div>
                  <div style={{ fontWeight: "bold", marginBottom: "1mm" }}>
                    Terms & Conditions:
                  </div>
                  <div>{termsAndConditions}</div>
                </div>
              )}
            </div>
          )}

          {/* ========== FOOTER ========== */}
          <div
            style={{
              marginTop: "auto",
              paddingTop: "10mm",
              borderTop: "1px solid #999",
              fontSize: "7px",
              color: "#999",
              textAlign: "center",
            }}
          >
            This is an electronically generated document. No signature is
            required.
            <br />
            Printed on {new Date().toLocaleString("id-ID")}
          </div>
        </div>
      </div>

      {/* ========== PRINT STYLES ========== */}
      <style jsx global>{`
        @media print {
          * {
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }

          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          html {
            margin: 0 !important;
            padding: 0 !important;
          }

          @page {
            size: A4;
            margin: 0 !important;
            padding: 0 !important;
          }

          @page :first {
            margin: 0 !important;
          }

          @page :last {
            margin: 0 !important;
          }

          .print\:hidden {
            display: none !important;
          }

          .print\:w-full {
            width: 100% !important;
          }

          .print\:bg-white {
            background-color: white !important;
          }

          img {
            max-width: 100%;
            height: auto;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          td,
          th {
            word-wrap: break-word;
          }

          /* Prevent page breaks inside elements */
          tr {
            page-break-inside: avoid;
          }

          div,
          p {
            page-break-inside: avoid;
          }
        }

        @supports (-webkit-appearance: none) {
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            @page {
              margin: 0;
            }
          }
        }
      `}</style>
    </>
  );
};

export default InvoicePrint;

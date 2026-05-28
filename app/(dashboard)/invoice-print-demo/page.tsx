"use client";

import React, { useState } from "react";
import InvoiceTemplateBase from "@/components/invoice/InvoiceTemplateBase";
import type { InvoiceTheme } from "@/types/invoice";
import { mockTemplateData } from "@/components/invoice/mockInvoiceData";

const themeMeta: Record<InvoiceTheme, { label: string; desc: string }> = {
  blackWhite: {
    label: "Minimal Black & White",
    desc: "High-contrast monochrome, perfect for B/W printers & formal documents",
  },
  corporate: {
    label: "Modern Corporate",
    desc: "Color-accent with header bars, status badges, and professional layout",
  },
  lightBrand: {
    label: "Light Brand",
    desc: "Soft background, serif typography, warm feel with brand accents",
  },
};

export default function InvoicePrintDemoPage() {
  const [theme, setTheme] = useState<InvoiceTheme>("blackWhite");

  const data = mockTemplateData[theme];

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold mb-1">
            Invoice Template System
          </h1>
          <p className="text-slate-600 text-sm mb-4">
            Multi-tenant white label invoice templates. Select a theme below to
            preview. Each template uses the same data shape with different
            branding.
          </p>

          <div className="flex flex-wrap gap-3">
            {(Object.entries(themeMeta) as [InvoiceTheme, typeof themeMeta[InvoiceTheme]][]).map(
              ([key, meta]) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                    theme === key
                      ? "bg-slate-900 text-white shadow"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  {meta.label}
                </button>
              )
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="bg-white rounded-lg shadow p-4 mb-2">
            <h2 className="font-semibold text-sm mb-2">
              {themeMeta[theme].label}
            </h2>
            <p className="text-xs text-slate-500 mb-2">
              {themeMeta[theme].desc}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-600">
              <div>
                <span className="font-medium">Tenant: </span>
                {data.tenant.name}
              </div>
              <div>
                <span className="font-medium">Invoice: </span>
                {data.invoice.invoice_number}
              </div>
              <div>
                <span className="font-medium">Status: </span>
                <span
                  className={`font-medium ${
                    data.invoice.status === "paid"
                      ? "text-green-600"
                      : data.invoice.status === "overdue"
                        ? "text-red-600"
                        : "text-amber-600"
                  }`}
                >
                  {data.invoice.status}
                </span>
              </div>
              <div>
                <span className="font-medium">Total: </span>
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                }).format(data.totals.grand_total)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <InvoiceTemplateBase {...data} />
          </div>
        </div>
      </div>
    </div>
  );
}

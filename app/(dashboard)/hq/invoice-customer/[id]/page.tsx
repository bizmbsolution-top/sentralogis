"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast, Toaster } from "react-hot-toast";
import {
  FileText,
  Send,
  CheckCircle2,
  DollarSign,
  Printer,
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  calculateInvoiceTotals,
  lineAmount,
  type InvoiceChargeType,
  type InvoiceLineRow,
} from "@/lib/domain/invoice/lines";
import {
  buildSeedLines,
  mapDbLineToRow,
  newManualLine,
  type SeedJobOrder,
} from "@/lib/domain/invoice/seedLines";

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatThousand = (val: number | string | null) => {
  if (val === null || val === undefined || val === '') return '';
  const clean = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return '';
  return new Intl.NumberFormat('id-ID').format(parsed);
};

const parseThousand = (str: string): number => {
  const clean = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}; // [AI] helper functions to support thousand separators in input fields

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  sent: { label: "Sent", className: "bg-blue-50 text-blue-700" },
  accepted: { label: "Accepted", className: "bg-emerald-50 text-emerald-700" },
  paid: { label: "Paid", className: "bg-purple-50 text-purple-700" },
};

const CHARGE_LABELS: Record<InvoiceChargeType, string> = {
  ritase: "RITASE",
  surcharge: "SURCHARGE",
  reimbursement: "REIMBURSEMENT",
};

const CHARGE_BADGE: Record<InvoiceChargeType, string> = {
  ritase: "bg-blue-50 text-blue-700",
  surcharge: "bg-violet-50 text-violet-700",
  reimbursement: "bg-orange-50 text-orange-700",
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [isPrintMode, setIsPrintMode] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setIsPrintMode(p.get('print') === '1');
  }, []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [jobOrders, setJobOrders] = useState<SeedJobOrder[]>([]);
  const [coaList, setCoaList] = useState<any[]>([]);
  const [taxList, setTaxList] = useState<any[]>([]);
  const [lines, setLines] = useState<InvoiceLineRow[]>([]);
  const [linesDirty, setLinesDirty] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<{
    name: string;
    logo_url: string | null;
  } | null>(null);

  const isDraft = invoice?.status === "draft";
  const taxRate = Number(invoice?.tax_percentage) || 0;
  const totals = useMemo(
    () => calculateInvoiceTotals(lines, taxRate),
    [lines, taxRate],
  );

  const fetchInvoice = useCallback(async () => {
    if (!params?.id || !profile?.tenant_id) return;

    try {
      setLoading(true);
      const { data: inv, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) throw error;
      setInvoice(inv);

      const [
        { data: taxData },
        { data: coaData },
        { data: wo },
        { data: tenantData },
      ] = await Promise.all([
        supabase
          .from("md_taxes")
          .select("id, code, name, rate, description, is_active")
          .eq("is_active", true)
          .order("rate"),
        supabase
          .from("finance_coa")
          .select("id, account_number, account_name, category")
          .order("account_number"),
        supabase
          .from("work_orders")
          .select(`*, customer:md_entities!customer_id(name, legal_name)`)
          .eq("id", inv.wo_id)
          .single(),
        supabase
          .from("tenants")
          .select("name, logo_url")
          .eq("id", profile.tenant_id)
          .maybeSingle(),
      ]);

      if (taxData) setTaxList(taxData);
      if (coaData) setCoaList(coaData);
      if (tenantData) setTenantInfo(tenantData);

      let enrichedJos: SeedJobOrder[] = [];

      if (wo) {
        setWorkOrder(wo);

        const { data: wis } = await supabase
          .from("wo_items")
          .select(
            `id, unit_price, total_revenue, item_data, max_jo_count, job_orders(id, jo_number, status, base_price, fleet_id, driver_id, is_doc_finished, is_cost_finished)`,
          )
          .eq("wo_id", wo.id);

        if (wis) {
          const allJos = wis.flatMap((wi: any) =>
            (wi.job_orders || []).map((jo: any) => ({ ...jo, wo_item: wi })),
          );

          const fleetIds = Array.from(
            new Set(allJos.map((j: any) => j.fleet_id).filter(Boolean)),
          );
          const driverIds = Array.from(
            new Set(allJos.map((j: any) => j.driver_id).filter(Boolean)),
          );

          const [fleetsRes, driversRes] = await Promise.all([
            fleetIds.length > 0
              ? supabase
                  .from("md_fleets")
                  .select(
                    "id, plate_number, fleet_type_id, md_fleet_types(type_name)",
                  )
                  .in("id", fleetIds)
              : { data: [] },
            driverIds.length > 0
              ? supabase
                  .from("md_drivers")
                  .select("id, name")
                  .in("id", driverIds)
              : { data: [] },
          ]);

          const fleetsMap = Object.fromEntries(
            (fleetsRes.data || []).map((f: any) => [f.id, f]),
          );
          const driversMap = Object.fromEntries(
            (driversRes.data || []).map((d: any) => [d.id, d]),
          );

          enrichedJos = allJos.map((jo: any) => ({
            ...jo,
            fleet: fleetsMap[jo.fleet_id] || null,
            driver: driversMap[jo.driver_id] || null,
          }));
          setJobOrders(enrichedJos);
        }
      }

      const joIds = enrichedJos.map((j) => j.id);
      let extraCosts: any[] = [];
      if (joIds.length > 0) {
        const { data: ecData } = await supabase
          .from("extra_costs")
          .select(
            "id, jo_id, cost_type, charge_type, amount, description, status, is_billable",
          )
          .in("jo_id", joIds)
          .eq("is_billable", true)
          .in("status", ["approved", "APPROVED"]);
        extraCosts = ecData || [];
      }

      const { data: dbLines, error: linesError } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", inv.id)
        .order("sort_order");

      if (linesError?.code === "42P01") {
        toast.error(
          "Jalankan migrasi 046_invoice_lines.sql di Supabase terlebih dahulu",
        );
      }

      const joById = new Map(enrichedJos.map((j) => [j.id, j]));

      if (!linesError && dbLines && dbLines.length > 0) {
        setLines(dbLines.map((row) => mapDbLineToRow(row, joById)));
        setLinesDirty(false);
      } else if (enrichedJos.length > 0 || extraCosts.length > 0) {
        const seeded = buildSeedLines(
          enrichedJos,
          extraCosts,
          coaData || [],
          inv.co_revenue_account_id,
        );
        setLines(seeded);
        setLinesDirty(true);
      } else {
        setLines([]);
      }
    } catch {
      toast.error("Failed to load invoice");
      router.push("/hq/invoice-customer");
    } finally {
      setLoading(false);
    }
  }, [params?.id, profile?.tenant_id, router]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const updateLine = (lineId: string, patch: Partial<InvoiceLineRow>) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const next = { ...line, ...patch };
        if ("quantity" in patch || "unit_amount" in patch) {
          next.amount = lineAmount(next.quantity, next.unit_amount);
        }
        return next;
      }),
    );
    setLinesDirty(true);
  };

  const handleAddManualLine = () => {
    setLines((prev) => [...prev, newManualLine(coaList, prev.length)]);
    setLinesDirty(true);
  };

  const handleRemoveLine = (lineId: string) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    if (line.line_type === "ritase") {
      toast.error("Baris ritase tidak bisa dihapus");
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== lineId));
    setLinesDirty(true);
  };

  const persistLines = async (): Promise<boolean> => {
    if (!invoice || !profile?.tenant_id) return false;

    const missingCoa = lines.some((l) => !l.coa_id);
    if (missingCoa) {
      toast.error("Setiap baris harus memiliki Akun COA");
      return false;
    }

    setSaving(true);
    try {
      await supabase
        .from("invoice_lines")
        .delete()
        .eq("invoice_id", invoice.id);

      if (lines.length > 0) {
        const inserts = lines.map((line, idx) => ({
          invoice_id: invoice.id,
          tenant_id: profile.tenant_id,
          line_type: line.line_type,
          job_order_id: line.job_order_id || null,
          extra_cost_id: line.extra_cost_id || null,
          description: line.description || "",
          coa_id: line.coa_id,
          charge_type: line.charge_type,
          quantity: line.quantity,
          unit_amount: line.unit_amount,
          amount: line.amount,
          sort_order: idx,
        }));

        const { data: inserted, error: insertErr } = await supabase
          .from("invoice_lines")
          .insert(inserts)
          .select("id, sort_order");

        if (insertErr) throw insertErr;

        if (inserted) {
          const sorted = [...inserted].sort(
            (a, b) => a.sort_order - b.sort_order,
          );
          setLines((prev) =>
            prev.map((line, idx) => ({
              ...line,
              dbId: sorted[idx]?.id,
              id: sorted[idx]?.id || line.id,
            })),
          );
        }
      }

      const primaryRevenueCoa =
        lines.find((l) => l.charge_type === "ritase" && l.coa_id)?.coa_id ||
        lines.find((l) => l.coa_id)?.coa_id ||
        null;

      const { error: invErr } = await supabase
        .from("invoices")
        .update({
          total_billing: totals.grandTotal,
          tax_amount: totals.taxAmount,
          co_revenue_account_id: primaryRevenueCoa,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      if (invErr) throw invErr;

      setInvoice((prev: any) => ({
        ...prev,
        total_billing: totals.grandTotal,
        tax_amount: totals.taxAmount,
        co_revenue_account_id: primaryRevenueCoa,
      }));
      setLinesDirty(false);
      toast.success("Invoice lines saved");
      return true;
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + (err.message || "unknown error"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    await persistLines();
  };

  const handlePrint = async () => {
    if (!invoice) return;
    if (lines.length === 0) {
      toast.error("Tidak ada baris untuk dicetak");
      return;
    }

    if (isDraft && linesDirty) {
      const ok = await persistLines();
      if (!ok) return;
    }

    const prevTitle = document.title;
    const title =
      invoice.invoice_number || `Invoice-${String(invoice.id).slice(0, 8)}`;
    document.title = title;

    // [AI] temporarily enable print layout to ensure it's rendered in DOM during print
    const wasPrintMode = new URLSearchParams(window.location.search).get('print') === '1';
    setIsPrintMode(true);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = prevTitle;
        if (!wasPrintMode) {
          setIsPrintMode(false);
        }
      }, 250);
    }, 150);
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      const res = await fetch(`/api/invoice/pdf?invoice_id=${invoice.id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoice_number || invoice.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error('Gagal download PDF: ' + (err.message || 'unknown'));
    }
  };

  const handleSelectTax = async (taxId: string) => {
    try {
      const val = taxId || null;
      const tax = taxList.find((t: any) => t.id === taxId);
      const rate = tax ? tax.rate : 0;
      const { taxAmount, grandTotal } = calculateInvoiceTotals(lines, rate);

      const { error } = await supabase
        .from("invoices")
        .update({
          tax_id: val,
          tax_percentage: rate,
          tax_amount: taxAmount,
          total_billing: grandTotal,
        })
        .eq("id", invoice.id);

      if (error) throw error;

      setInvoice((prev: any) => ({
        ...prev,
        tax_id: val,
        tax_percentage: rate,
        tax_amount: taxAmount,
        total_billing: grandTotal,
      }));
      if (val) toast.success("Pajak diperbarui");
    } catch (err: any) {
      toast.error("Failed to update tax: " + err.message);
    }
  };

  const handleAction = async (action: "send" | "accept" | "paid") => {
    if (!invoice) return;

    if (action === "send") {
      if (lines.length === 0) {
        toast.error("Tambahkan minimal satu baris invoice");
        return;
      }
      if (lines.some((l) => !l.coa_id)) {
        toast.error("Lengkapi COA untuk semua baris sebelum kirim");
        return;
      }
      if (linesDirty) {
        const ok = await persistLines();
        if (!ok) return;
      }
    }

    try {
      const updates: Record<string, unknown> = {};
      if (action === "send") {
        updates.status = "sent";
        updates.sent_at = new Date().toISOString();
        updates.total_billing = totals.grandTotal;
        updates.tax_amount = totals.taxAmount;
      }
      if (action === "accept") {
        updates.status = "accepted";
        updates.customer_accepted_invoice_at = new Date().toISOString();
      }
      if (action === "paid") {
        updates.status = "paid";
        updates.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("invoices")
        .update(updates)
        .eq("id", invoice.id);
      if (error) throw error;

      toast.success(
        action === "paid"
          ? "Invoice marked as paid"
          : action === "accept"
            ? "Invoice accepted"
            : "Invoice sent",
      );
      fetchInvoice();
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    }
  };

  const allLinesHaveCoa = lines.length > 0 && lines.every((l) => l.coa_id);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const statusCfg = STATUS_CONFIG[invoice.status] || {
    label: invoice.status,
    className: "bg-slate-100 text-slate-600",
  };
  const customerName =
    workOrder?.customer?.legal_name || workOrder?.customer?.name || "-";
  const customerAddress =
    workOrder?.customer?.address ||
    workOrder?.customer?.company_address ||
    null;
  const customerTaxId =
    workOrder?.customer?.tax_id || workOrder?.customer?.npwp || null;
  const selectedTax = taxList.find((t: any) => t.id === invoice.tax_id) || null;

  const renderLineRow = (line: InvoiceLineRow, compact?: boolean) => {
    const coaLabel = coaList.find((c) => c.id === line.coa_id);
    const canEditAmount =
      isDraft &&
      (line.line_type === "manual" || line.line_type === "extra_cost");
    const canEditDesc = isDraft && line.line_type === "manual";
    const canRemove = isDraft && line.line_type !== "ritase";

    if (compact) {
      return (
        <div
          key={line.id}
          className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100"
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${CHARGE_BADGE[line.charge_type]}`}
            >
              {CHARGE_LABELS[line.charge_type]}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                {formatRupiah(line.amount)}
              </span>
              {canRemove && (
                <button
                  type="button"
                  onClick={() => handleRemoveLine(line.id)}
                  className="p-1 text-rose-500"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
          {canEditDesc ? (
            <input
              value={line.description}
              onChange={(e) =>
                updateLine(line.id, { description: e.target.value })
              }
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              placeholder="Deskripsi biaya"
            />
          ) : (
            <p className="text-xs text-slate-700">{line.description}</p>
          )}
          {canEditAmount && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-800 uppercase block mb-1">Qty</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(line.id, {
                      quantity: Number(e.target.value) || 0, // [AI] enabled editing of quantity in compact view
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-800 uppercase block mb-1">Harga Satuan</label>
                <input
                  type="text"
                  value={formatThousand(line.unit_amount)}
                  onChange={(e) =>
                    updateLine(line.id, {
                      unit_amount: parseThousand(e.target.value), // [AI] enabled editing of unit price with thousand separators in compact view
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  placeholder="0"
                />
              </div>
            </div>
          )}
          <select
            value={line.coa_id || ""}
            disabled={!isDraft}
            onChange={(e) =>
              updateLine(line.id, { coa_id: e.target.value || null })
            }
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg disabled:opacity-60"
          >
            <option value="">Pilih COA...</option>
            {coaList.map((coa) => (
              <option key={coa.id} value={coa.id}>
                {coa.account_number} — {coa.account_name}
              </option>
            ))}
          </select>
          {line.jo_number && (
            <p className="text-[10px] text-slate-400">
              {line.jo_number} · {line.fleet_plate || "-"} ·{" "}
              {line.driver_name || "-"}
            </p>
          )}
        </div>
      );
    }

    return (
      <tr key={line.id} className="hover:bg-slate-50/50 align-top">
        <td className="px-2 py-2 min-w-[180px]">
          <select
            value={line.coa_id || ""}
            disabled={!isDraft}
            onChange={(e) =>
              updateLine(line.id, { coa_id: e.target.value || null })
            }
            className="w-full min-w-[160px] px-2 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-60"
          >
            <option value="">Pilih COA...</option>
            {coaList.map((coa) => (
              <option key={coa.id} value={coa.id}>
                {coa.account_number} — {coa.account_name}
              </option>
            ))}
          </select>
        </td>
        <td className="px-2 py-2 whitespace-nowrap">
          <span
            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${CHARGE_BADGE[line.charge_type]}`}
          >
            {CHARGE_LABELS[line.charge_type]}
          </span>
        </td>
        <td className="px-2 py-2 text-xs text-slate-900 font-semibold min-w-[200px]">
          {canEditDesc ? (
            <input
              value={line.description}
              onChange={(e) =>
                updateLine(line.id, { description: e.target.value })
              }
              className="w-full px-2 py-1 border border-slate-200 rounded"
              placeholder="Deskripsi"
            />
          ) : (
            <span title={line.description}>{line.description}</span>
          )}
          {line.line_type === "manual" && (
            <select
              value={line.charge_type}
              disabled={!isDraft}
              onChange={(e) =>
                updateLine(line.id, {
                  charge_type: e.target.value as InvoiceChargeType,
                })
              }
              className="mt-1 w-full px-2 py-1 text-[10px] border border-slate-200 rounded"
            >
              <option value="surcharge">Surcharge (DPP)</option>
              <option value="reimbursement">Reimbursement</option>
              <option value="ritase">Ritase</option>
            </select>
          )}
        </td>
        <td className="px-2 py-2 text-xs text-slate-900 font-semibold whitespace-nowrap">
          {line.fleet_plate || "-"}
        </td>
        <td className="px-2 py-2 text-xs text-slate-900 font-semibold whitespace-nowrap">
          {line.driver_name || "-"}
        </td>
        <td
          className="px-2 py-2 text-xs text-slate-900 font-semibold max-w-[140px] truncate"
          title={line.route}
        >
          {line.route || "-"}
        </td>
        <td className="px-2 py-2 text-right">
          {canEditAmount ? (
            <input
              type="number"
              min={0}
              step="any"
              value={line.quantity}
              onChange={(e) =>
                updateLine(line.id, {
                  quantity: Number(e.target.value) || 0, // [AI] enabled editing of quantity
                })
              }
              className="w-20 px-2 py-1 text-xs text-right border border-slate-200 rounded"
            />
          ) : (
            <span className="text-xs text-slate-900 font-semibold">{line.quantity}</span>
          )}
        </td>
        <td className="px-2 py-2 text-xs text-slate-900 font-semibold text-right whitespace-nowrap">
          {canEditAmount ? (
            <input
              type="text"
              value={formatThousand(line.unit_amount)}
              onChange={(e) =>
                updateLine(line.id, {
                  unit_amount: parseThousand(e.target.value), // [AI] enabled editing of unit price with thousand separators
                })
              }
              className="w-28 px-2 py-1 text-xs text-right border border-slate-200 rounded"
              placeholder="0"
            />
          ) : (
            formatRupiah(line.unit_amount)
          )}
        </td>
        <td className="px-2 py-2 text-xs font-bold text-slate-950 text-right whitespace-nowrap">
          {formatRupiah(line.amount)}
        </td>
        <td className="px-2 py-2 w-8">
          {canRemove && (
            <button
              type="button"
              onClick={() => handleRemoveLine(line.id)}
              className="p-1 text-rose-500 hover:bg-rose-50 rounded"
            >
              <Trash2 size={14} />
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className={`${isPrintMode ? '' : 'min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8'}`}>
      <Toaster position="top-right" />

      {/* Perbaikan Utama: CSS Injection Khusus untuk Mengisolasi Dokumen Cetak */}
      <style jsx global>{`
        @media print {
          /* 1. Sembunyikan Layout Utama Aplikasi Web (Navbar, Layout Header bawaan framework) */
          body > :not(.print-only),
          header, 
          nav, 
          footer, 
          aside,
          button,
          .system-online-header,
          #system-header {
            display: none !important;
          }

          /* 2. Setup Kertas Cetak A4 Portrait Bersih */
          @page {
            size: A4 portrait;
            margin: 0mm;
          }

          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* 3. Atur Kontainer Utama agar Menyesuaikan Kertas A4 & Tidak Terpotong */
          .print-only {
            display: block !important;
            width: 210mm !important;
            max-width: 210mm !important;
            min-height: 297mm !important;
            background: #ffffff !important;
            margin: 0 auto !important;
            overflow: visible !important;
          }

          /* 4. Paksa Tabel & Text Berada di Batas Aman Lebar Kertas */
          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }

          th, td {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            white-space: normal !important;
          }

          /* 5. Paksa Tema Hitam-Putih Formal */
          * {
            color: #000000 !important;
            background-color: transparent !important;
            box-shadow: none !important;
            text-shadow: none !important;
            border-color: #000000 !important;
          }
          
          /* Tetapkan logo agar tetap grayscale/bersih */
          img {
            filter: grayscale(100%) !important;
          }
        }
      `}</style>

      {/* Screen layout — invoice editing UI */}
      {!isPrintMode && (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/hq/invoice-customer')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <ArrowLeft size={18} className="text-slate-500" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-slate-900">{invoice.invoice_number || 'Draft Invoice'}</h1>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${statusCfg.className}`}>
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">WO: {workOrder?.wo_number || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isDraft && linesDirty && (
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                  <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
              {isDraft && (
                <Button variant="secondary" onClick={handleAddManualLine} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                  {/* [AI] added variant="secondary" to prevent white-on-white color clash */}
                  <Plus size={15} /> Add Line
                </Button>
              )}
              {isDraft && allLinesHaveCoa && (
                <Button onClick={() => handleAction('send')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                  <Send size={15} /> Send
                </Button>
              )}
              {invoice.status === 'sent' && (
                <Button onClick={() => handleAction('accept')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 size={15} /> Accept
                </Button>
              )}
              {invoice.status === 'accepted' && (
                <Button onClick={() => handleAction('paid')} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                  <DollarSign size={15} /> Mark Paid
                </Button>
              )}
              {lines.length > 0 && (
                <Button variant="secondary" onClick={handlePrint} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                  {/* [AI] added variant="secondary" to prevent white-on-white color clash */}
                  <Printer size={15} /> Print
                </Button>
              )}
              {lines.length > 0 && (
                <Button variant="secondary" onClick={handleDownloadPdf} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                  {/* [AI] added variant="secondary" to prevent white-on-white color clash */}
                  <FileText size={15} /> PDF
                </Button>
              )}
            </div>
          </div>

          {/* Customer & Invoice Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">Bill To</h2>
              <p className="text-sm font-bold text-slate-950">{customerName}</p>
              {customerAddress && <p className="text-xs text-slate-900 mt-1 font-medium whitespace-pre-wrap">{customerAddress}</p>}
              {customerTaxId && <p className="text-xs text-slate-900 mt-1 font-medium">NPWP: {customerTaxId}</p>}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-800 uppercase">Invoice Date</p>
                <p className="text-sm text-slate-900 font-semibold mt-0.5">{formatDate(invoice.invoice_date)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-800 uppercase">Due Date</p>
                <p className="text-sm text-slate-900 font-semibold mt-0.5">{formatDate(invoice.due_date)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-800 uppercase">Tax (PPN)</p>
                <select
                  value={invoice.tax_id || ''}
                  disabled={!isDraft}
                  onChange={(e) => handleSelectTax(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-60"
                >
                  <option value="">No Tax</option>
                  {taxList.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Invoice Lines</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-bold text-slate-800 uppercase tracking-wide border-b border-slate-250">
                    <th className="px-3 py-3 text-left">COA</th>
                    <th className="px-3 py-3 text-left">Type</th>
                    <th className="px-3 py-3 text-left">Description</th>
                    <th className="px-3 py-3 text-left">Fleet</th>
                    <th className="px-3 py-3 text-left">Driver</th>
                    <th className="px-3 py-3 text-left">Route</th>
                    <th className="px-3 py-3 text-right">Qty</th>
                    <th className="px-3 py-3 text-right">Unit Price</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                    <th className="px-3 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line) => renderLineRow(line))}
                </tbody>
              </table>
            </div>
            {lines.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-400">No invoice lines yet</p>
                {isDraft && (
                  <Button onClick={handleAddManualLine} className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2">
                    <Plus size={15} /> Add Line
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-900 font-medium">Subtotal</span>
                <span className="font-bold text-slate-950">{formatRupiah(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-900 font-medium">PPN ({taxRate}%)</span>
                <span className="font-bold text-slate-950">{formatRupiah(totals.taxAmount)}</span>
              </div>
              <div className="border-t border-slate-300 pt-3 flex justify-between text-base">
                <span className="font-bold text-slate-900">Grand Total</span>
                <span className="font-extrabold text-slate-950">{formatRupiah(totals.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* History / Audit */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">History</h2>
            <div className="space-y-2 text-xs text-slate-900 font-medium">
              {invoice.sent_at && <p>Sent: {formatDate(invoice.sent_at)}</p>}
              {invoice.customer_accepted_invoice_at && <p>Accepted by customer: {formatDate(invoice.customer_accepted_invoice_at)}</p>}
              {invoice.paid_at && <p>Paid: {formatDate(invoice.paid_at)}</p>}
              {!invoice.sent_at && <p className="text-slate-900 italic">No activity yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* Print-only layout (formal 2-page document, black & white) */}
      <div className={`print-only ${isPrintMode ? 'block' : 'hidden'}`}>
        {/* PAGE 1 */}
        <div className="w-full" style={{ pageBreakAfter: "always" }}>
          <div
            style={{
              width: "210mm",
              height: "297mm",
              padding: "15mm",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                marginBottom: "12mm",
                paddingBottom: "8mm",
                borderBottom: "2px solid #000",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8mm" }}
                >
                  {tenantInfo?.logo_url && (
                    <img
                      src={tenantInfo.logo_url}
                      alt={tenantInfo.name}
                      style={{ height: "20mm", width: "auto" }}
                    />
                  )}
                  <div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "bold",
                        letterSpacing: "0.5px",
                        color: "#000",
                      }}
                    >
                      {tenantInfo?.name || "SENTRALOGIS"}
                    </div>
                    <div
                      style={{
                        fontSize: "9px",
                        color: "#000", // [AI] changed text color to dark for high contrast in print preview screen view
                        marginTop: "2mm",
                      }}
                    >
                      FAKTUR PAJAK
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "bold",
                      marginBottom: "2mm",
                      color: "#000",
                    }}
                  >
                    INVOICE
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "bold",
                      fontFamily: "monospace",
                      color: "#000",
                    }}
                  >
                    {invoice.invoice_number || "-"}
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Details - 2 rows */}
            <div
              style={{
                marginBottom: "10mm",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8mm",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "8px",
                    fontWeight: "bold",
                    color: "#000", // [AI] changed text color to dark for high contrast in print preview screen view
                    marginBottom: "1mm",
                  }}
                >
                  TANGGAL INVOICE
                </div>
                <div style={{ fontSize: "10px", fontWeight: "500", color: "#000" }}>
                  {formatDate(invoice.invoice_date)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "8px",
                    fontWeight: "bold",
                    color: "#000", // [AI] changed text color to dark for high contrast in print preview screen view
                    marginBottom: "1mm",
                  }}
                >
                  JATUH TEMPO
                </div>
                <div style={{ fontSize: "10px", fontWeight: "500", color: "#000" }}>
                  {formatDate(invoice.due_date)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "8px",
                    fontWeight: "bold",
                    color: "#000", // [AI] changed text color to dark for high contrast in print preview screen view
                    marginBottom: "1mm",
                  }}
                >
                  WORK ORDER
                </div>
                <div style={{ fontSize: "10px", fontFamily: "monospace", color: "#000" }}>
                  {workOrder?.wo_number || "-"}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "8px",
                    fontWeight: "bold",
                    color: "#000", // [AI] changed text color to dark for high contrast in print preview screen view
                    marginBottom: "1mm",
                  }}
                >
                  STATUS
                </div>
                <div style={{ fontSize: "10px", color: "#000" }}>
                  {invoice.status?.toUpperCase() || "-"}
                </div>
              </div>
            </div>

            {/* Bill To Section */}
            <div
              style={{
                marginBottom: "10mm",
                paddingBottom: "8mm",
                borderBottom: "1px solid #000", // [AI] changed border color to dark for high contrast in print preview screen view
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10mm",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "8px",
                    fontWeight: "bold",
                    color: "#000", // [AI] changed text color to dark for high contrast in print preview screen view
                    marginBottom: "2mm",
                  }}
                >
                  DITAGIHKAN KEPADA
                </div>
                <div style={{ fontSize: "10px", lineHeight: "1.4", color: "#000" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "1mm", color: "#000" }}>
                    {customerName}
                  </div>
                  {customerAddress && (
                    <div
                      style={{
                        fontSize: "9px",
                        color: "#000", // [AI] changed text color to dark for high contrast in print preview screen view
                        marginBottom: "1mm",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {customerAddress}
                    </div>
                  )}
                  {customerTaxId && (
                    <div style={{ fontSize: "9px", color: "#000" }}>
                      NPWP: {customerTaxId}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "8px",
                    fontWeight: "bold",
                    color: "#000", // [AI] changed text color to dark for high contrast in print preview screen view
                    marginBottom: "2mm",
                  }}
                >
                  INFORMASI PAJAK
                </div>
                <div style={{ fontSize: "10px", color: "#000" }}>
                  <div style={{ fontWeight: "bold", color: "#000" }}>PPN: {taxRate}%</div>
                  {selectedTax?.code && (
                    <div
                      style={{
                        fontSize: "9px",
                        color: "#000", // [AI] changed text color to dark for high contrast in print preview screen view
                        marginTop: "1mm",
                      }}
                    >
                      Kode: {selectedTax.code}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div style={{ marginBottom: "8mm", flex: "1" }}>
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
                      borderBottom: "2px solid #000",
                      borderTop: "2px solid #000",
                    }}
                  >
                    <th
                      style={{
                        textAlign: "left",
                        padding: "3mm 2mm",
                        fontWeight: "bold",
                      }}
                    >
                      DESKRIPSI
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "3mm 2mm",
                        fontWeight: "bold",
                        width: "12mm",
                      }}
                    >
                      QTY
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "3mm 2mm",
                        fontWeight: "bold",
                        width: "25mm",
                      }}
                    >
                      HARGA
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "3mm 2mm",
                        fontWeight: "bold",
                        width: "30mm",
                      }}
                    >
                      JUMLAH
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr
                      key={line.id}
                      style={{ borderBottom: "1px solid #000" }} // [AI] changed border color to dark for high contrast in print preview screen view
                    >
                      <td
                        style={{ padding: "2.5mm 2mm", verticalAlign: "top" }}
                      >
                        <div style={{ fontWeight: "500", marginBottom: "1mm" }}>
                          {line.description}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "2.5mm 2mm",
                          verticalAlign: "top",
                          textAlign: "right",
                        }}
                      >
                        {line.quantity}
                      </td>
                      <td
                        style={{
                          padding: "2.5mm 2mm",
                          verticalAlign: "top",
                          textAlign: "right",
                        }}
                      >
                        {formatRupiah(line.unit_amount)}
                      </td>
                      <td
                        style={{
                          padding: "2.5mm 2mm",
                          verticalAlign: "top",
                          textAlign: "right",
                          fontWeight: "bold",
                        }}
                      >
                        {formatRupiah(line.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
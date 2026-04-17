"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase as supabaseRaw } from "@/lib/supabase/client";
const supabase = supabaseRaw as any;
import { toast, Toaster } from "react-hot-toast";
import {
  Banknote, FileText, ClipboardCheck, Search, 
  Loader2, CheckCircle2, XCircle, Printer,
  ChevronRight, Calendar, User, Truck,
  ScanLine, CreditCard, ArrowUpRight, Filter,
  FileCheck, Wallet, Send, Download, Eye, 
  ArrowDownCircle, ArrowUpCircle, Receipt,
  Scale, Landmark, Upload, X, Plus, ShieldCheck,
  Percent, Calculator, Clock, FilePlus, ExternalLink, Save, Edit3,
  LayoutGrid, RefreshCw, BarChart3, TrendingUp, History
} from "lucide-react";

// --- Types ---

type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  tax_ppn: number;
  tax_pph: number;
  created_at: string;
};

type CashAdvance = {
  id: string;
  job_order_id: string;
  amount: number;
  description: string;
  status: 'pending' | 'approved' | 'disbursed' | 'settled';
  created_at: string;
  disbursement_proof_url?: string;
  disbursement_notes?: string;
};

type JobOrder = {
  id: string;
  jo_number: string;
  status: string;
  fleets: {
    plate_number: string;
    companies?: {
      name: string;
    };
    truck_type: string;
  };
  vendor_price: number;
  ap_status: 'pending' | 'paid' | 'verified';
  cash_advances: CashAdvance[];
  extra_costs?: {
    id: string;
    cost_type: string;
    amount: number;
    description: string;
    status: string;
    is_billable: boolean;
  }[];
};

type WorkOrder = {
  id: string;
  wo_number: string;
  status: string;
  billing_status: string;
  physical_doc_received: boolean;
  customers: {
    id: string;
    name: string;
    company_name: string;
    tax_id_number: string;
    use_ppn: boolean;
    pph_rate: number;
    phone: string;
  };
  work_order_items: {
    id: string;
    deal_price: number;
    quantity: number;
    job_orders: JobOrder[];
  }[];
  invoices: Invoice[];
};

// --- Main Component ---

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<"ar" | "ap" | "advances" | "reports">("ar");
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInvoicingModal, setShowInvoicingModal] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  // Liquidation Modal State
  const [showLiqModal, setShowLiqModal] = useState(false);
  const [selectedAdv, setSelectedAdv] = useState<any>(null);
  const [liqForm, setLiqForm] = useState({
    amount: 0,
    notes: "",
    proof_url: ""
  });
  const [uploading, setUploading] = useState(false);
  const [advFilter, setAdvFilter] = useState<'all' | 'pending' | 'approved' | 'disbursed'>('all');
  const [arFilter, setArFilter] = useState<'all' | 'incomplete' | 'completed' | 'invoiced' | 'paid'>('all');
  
  const [apFilter, setApFilter] = useState<'all' | 'unquoted' | 'pending' | 'paid'>('all');
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedJO, setSelectedJO] = useState<any>(null);
  const [vendorPriceForm, setVendorPriceForm] = useState(0);

  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [currentWO, setCurrentWO] = useState<WorkOrder | null>(null);
  const [payForm, setPayForm] = useState({
    paid_at: new Date().toISOString().split('T')[0],
    proof_url: "",
    notes: ""
  });

  // Stats
  const [stats, setStats] = useState({
    ar_total: 0,
    ap_total: 0,
    cash_adv_pending: 0,
    tax_ytd: 0
  });

  // Cockpit Modal State
  const [showJOCockpitModal, setShowJOCockpitModal] = useState(false);
  const [selectedJOForCockpit, setSelectedJOForCockpit] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("work_orders")
        .select(`
          id, wo_number, status, billing_status, physical_doc_received, created_at,
          customers (id, name, company_name, tax_id_number, use_ppn, pph_rate, phone),
          work_order_items (
            id, deal_price, quantity,
            job_orders (
              id, jo_number, status, vendor_price, ap_status, physical_doc_received,
              fleets (id, plate_number, truck_type, companies(id, name)),
              cash_advances (id, amount, description, status, created_at, disbursement_proof_url, disbursement_notes),
              extra_costs (id, cost_type, amount, description, status, is_billable)
            )
          ),
          invoices (id, invoice_number, total_amount, status, created_at)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWorkOrders(data as any);

      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      let ar = 0;
      let ap = 0;
      let adv = 0;
      let thisMonthRevenue = 0;
      let lastMonthRevenue = 0;
      
      const funnel = {
        waiting_pod: 0,
        ready: 0,
        invoiced: 0,
        paid: 0
      };

      data?.forEach(wo => {
        const subtotal = wo.work_order_items?.reduce((sum, item: any) => sum + (item.deal_price * item.quantity), 0) || 0;
        const createdAt = new Date(wo.created_at);

        if (wo.billing_status === 'paid') funnel.paid++;
        else if (wo.billing_status === 'invoiced') funnel.invoiced++;
        else if (wo.physical_doc_received) funnel.ready++;
        else funnel.waiting_pod++;

        if (createdAt >= firstDayThisMonth) thisMonthRevenue += subtotal;
        else if (createdAt >= firstDayLastMonth && createdAt < firstDayThisMonth) lastMonthRevenue += subtotal;

        if (wo.billing_status === 'invoiced' || wo.billing_status === 'paid') {
          ar += wo.invoices?.[0]?.total_amount || 0;
        }

        wo.work_order_items?.forEach((item: any) => {
          item.job_orders?.forEach((jo: any) => {
            jo.cash_advances?.forEach((ca: any) => {
              if (ca.status === 'pending' || ca.status === 'approved') adv += ca.amount;
            });
            if (jo.status === 'delivered' && jo.ap_status !== 'paid') {
              ap += Number(jo.vendor_price || 0);
            }
          });
        });
      });

      const growth = lastMonthRevenue === 0 ? 100 : ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

      setStats({
        ar_total: ar,
        ap_total: ap,
        cash_adv_pending: adv,
        tax_ytd: ar * 0.11,
        funnel,
        total_orders: data?.length || 0,
        revenueComparison: {
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue,
          growth
        }
      } as any);

    } catch (error: any) {
      toast.error("Gagal sinkron data: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers ---

  const handleCreateInvoice = async (wo: WorkOrder) => {
    try {
      if (!wo.id || !wo.customers?.id) {
        throw new Error("Data Work Order atau Customer tidak lengkap.");
      }
      setCreatingInvoice(true);
      
      const subtotal = wo.work_order_items.reduce((sum, item) => sum + (item.deal_price * item.quantity), 0);
      
      // Calculate Extra Costs (Non-Taxable)
      const extraCosts = wo.work_order_items.reduce((sum, item) => {
        return sum + (item.job_orders?.reduce((joSum, jo) => {
          return joSum + (jo.extra_costs?.filter(ec => ec.is_billable).reduce((ecSum, ec) => ecSum + Number(ec.amount), 0) || 0);
        }, 0) || 0);
      }, 0);

      const ppn = wo.customers.use_ppn ? subtotal * 0.11 : 0;
      const pph = (subtotal * (wo.customers.pph_rate || 2)) / 100;
      const total = subtotal + extraCosts + ppn - pph;

      const invNumber = `INV-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Create Financial Transaction Record
      const amountBase = Number(subtotal) || 0;
      const amountTotal = Number(total) || 0;
      const amountPpn = Number(ppn) || 0;
      const amountPph = Number(pph) || 0;

      const { error: transError } = await supabase.from("finance_transactions").insert([{
        type: 'AR',
        category: 'Revenue',
        amount_base: amountBase,
        amount_total: amountTotal,
        tax_ppn: amountPpn,
        tax_pph: amountPph,
        entity_id: wo.customers?.id,
        reference_id: wo.id,
        status: 'unpaid',
        notes: `Invoice for ${wo.wo_number}. Includes Rp ${Number(extraCosts || 0).toLocaleString('id-ID')} extra costs.`
      }]);

      if (transError) throw transError;

      // 2. Create Public Invoice Record
      const { error: invError } = await supabase.from("invoices").insert([{
        invoice_number: invNumber,
        work_order_id: wo.id,
        total_amount: total,
        status: 'sent'
      }]);

      if (invError) throw invError;

      // 3. Update Work Order Status
      await supabase.from("work_orders").update({ billing_status: 'invoiced' }).eq("id", wo.id);

      toast.success(`Invoice ${invNumber} Berhasil Diterbitkan!`);
      setShowInvoicingModal(false);
      fetchData();
    } catch (error: any) {
      console.error("Invoice Creation Error:", error);
      toast.error("Error: " + (error?.message || error?.error_description || "Unknown error"));
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!currentWO) return;
    try {
      setLoading(true);
      const invoice = currentWO.invoices?.[0];
      if (!invoice) throw new Error("Invoice tidak ditemukan.");

      // 1. Update Invoice
      const { error: invError } = await supabase
        .from("invoices")
        .update({
          status: 'paid',
          paid_at: new Date(payForm.paid_at).toISOString(),
          payment_proof_url: payForm.proof_url
        })
        .eq("id", invoice.id);

      if (invError) throw invError;

      // 2. Update Finance Transaction
      const { error: transError } = await supabase
        .from("finance_transactions")
        .update({ status: 'paid' })
        .eq("reference_id", currentWO.id);

      if (transError) throw transError;

      // 3. Update Work Order
      const { error: woError } = await supabase
        .from("work_orders")
        .update({ billing_status: 'paid' })
        .eq("id", currentWO.id);

      if (woError) throw woError;

      toast.success("Pembayaran Berhasil Dikonfirmasi!");
      setShowPayModal(false);
      fetchData();
    } catch (error: any) {
      console.error("Payment Confirmation Error:", error);
      toast.error("Gagal konfirmasi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintInvoice = (wo: WorkOrder) => {
    const invoice = wo.invoices?.[0];
    const subtotal = wo.work_order_items.reduce((sum, item) => sum + (item.deal_price * item.quantity), 0);
    
    // Sum Extra Costs
    const extraCostsTotal = wo.work_order_items.reduce((sum, item) => {
      return sum + (item.job_orders?.reduce((joSum, jo) => {
        return joSum + (jo.extra_costs?.filter(ec => ec.is_billable).reduce((ecSum, ec) => ecSum + Number(ec.amount), 0) || 0);
      }, 0) || 0);
    }, 0);

    const ppn = wo.customers.use_ppn ? subtotal * 0.11 : 0;
    const pph = (subtotal * (wo.customers.pph_rate || 2)) / 100;
    const total = subtotal + extraCostsTotal + ppn - pph;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>INVOICE - ${invoice?.invoice_number || wo.wo_number}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.2; color: #000; margin: 0; padding: 0; }
            .invoice-box { max-width: 800px; margin: auto; }
            
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .company-info h1 { margin: 0; font-size: 18pt; letter-spacing: -1px; text-transform: uppercase; }
            .company-info p { margin: 1px 0; font-size: 8pt; color: #333; }
            
            .invoice-title { text-align: right; }
            .invoice-title h2 { margin: 0; font-size: 16pt; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 3px; }
            .invoice-title p { margin: 2px 0; font-size: 9pt; font-weight: bold; }

            .details-section { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .details-box h3 { font-size: 8pt; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-bottom: 5px; color: #666; }
            .details-box p { margin: 2px 0; font-size: 9pt; }

            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            table th { background: #f2f2f2; border: 1px solid #000; padding: 6px; text-align: left; font-size: 8pt; text-transform: uppercase; }
            table td { border: 1px solid #ddd; padding: 6px; font-size: 9pt; }
            table tr.last td { border-bottom: 2px solid #000; }

            .totals-container { display: flex; justify-content: flex-end; margin-top: -10px; }
            .totals-table { width: 280px; }
            .totals-table div { display: flex; justify-content: space-between; padding: 3px 0; font-size: 9pt; }
            .totals-table .grand-total { border-top: 1px solid #000; margin-top: 5px; padding-top: 5px; font-weight: bold; font-size: 11pt; }

            .payment-info { margin-top: 20px; font-size: 8pt; border: 1px solid #eee; padding: 10px; border-radius: 4px; }
            .payment-info h4 { margin: 0 0 5px 0; text-transform: uppercase; border-bottom: 1px solid #eee; }

            .signature-section { margin-top: 30px; display: grid; grid-template-cols: 1fr 1fr; gap: 40px; }
            .signature-box { text-align: center; }
            .signature-space { height: 50px; margin: 10px 0; border-bottom: 1px solid #000; width: 140px; margin-left: auto; margin-right: auto; }

            .footer { margin-top: 20px; text-align: center; font-size: 7pt; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
            
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
              .invoice-box { width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="position: fixed; top: 20px; right: 20px; z-index: 1000;">
            <button onclick="window.print()" style="padding: 12px 24px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">PRINT INVOICE</button>
          </div>

          <div class="invoice-box">
            <div class="header">
              <div class="company-info">
                <h1>SENTRALOGIS</h1>
                <p>PT SENTRAL LOGISTIK INDONESIA</p>
                <p>Jl. Raya Logistik No. 88, Kawasan Industri</p>
                <p>Jakarta Utara, Indonesia | Tel: (021) 1234-5678</p>
                <p>Email: finance@sentralogis.com</p>
              </div>
              <div class="invoice-title">
                <h2>INVOICE</h2>
                <p>No: ${invoice?.invoice_number || 'PENDING'}</p>
                <p>Date: ${new Date(invoice?.created_at || Date.now()).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            <div class="details-section">
              <div class="details-box">
                <h3>Billed To</h3>
                <p><strong>${wo.customers.company_name || wo.customers.name}</strong></p>
                <p>${wo.customers.phone || '-'}</p>
                <p>NPWP: ${wo.customers.tax_id_number || '-'}</p>
              </div>
              <div class="details-box" style="text-align: right;">
                <h3>Subject / Project</h3>
                <p>Freight & Logistics Services</p>
                <p>Work Order: ${wo.wo_number}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 50%">Item Description</th>
                  <th style="text-align: center; width: 10%">Quantity</th>
                  <th style="text-align: right; width: 20%">Unit Price</th>
                  <th style="text-align: right; width: 20%">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${wo.work_order_items.map(item => `
                  <tr>
                    <td>
                      <strong>Shipping Services</strong><br/>
                      <small style="color: #666">${wo.wo_number} - ${wo.route_name || 'Standard Route'}</small>
                    </td>
                    <td style="text-align: center">${item.quantity}</td>
                    <td style="text-align: right">Rp ${item.deal_price.toLocaleString('id-ID')}</td>
                    <td style="text-align: right">Rp ${(item.deal_price * item.quantity).toLocaleString('id-ID')}</td>
                  </tr>
                `).join('')}
                
                ${wo.work_order_items.map(item => 
                  item.job_orders?.map(jo => 
                    jo.extra_costs?.filter(ec => ec.is_billable).map(ec => `
                      <tr>
                        <td>
                          <strong>Additional Charge: ${ec.description || ec.cost_type}</strong><br/>
                          <small style="color: #666">Ref: ${jo.jo_number}</small>
                        </td>
                        <td style="text-align: center">1</td>
                        <td style="text-align: right">Rp ${Number(ec.amount).toLocaleString('id-ID')}</td>
                        <td style="text-align: right">Rp ${Number(ec.amount).toLocaleString('id-ID')}</td>
                      </tr>
                    `).join('') || ''
                  ).join('') || ''
                ).join('')}

                <tr class="last">
                  <td colspan="4" style="height: 10px; border: none;"></td>
                </tr>
              </tbody>
            </table>

            <div class="totals-container">
              <div class="totals-table">
                <div>
                  <span>Base Amount (Taxable)</span>
                  <span>Rp ${subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div>
                  <span>Extra Charges (Non-Taxable)</span>
                  <span>Rp ${extraCostsTotal.toLocaleString('id-ID')}</span>
                </div>
                ${ppn > 0 ? `
                  <div>
                    <span>VAT (PPN 11%)</span>
                    <span>Rp ${ppn.toLocaleString('id-ID')}</span>
                  </div>
                ` : ''}
                ${pph > 0 ? `
                  <div style="color: #c00;">
                    <span>WHT (PPh 23 - ${wo.customers.pph_rate || 2}%)</span>
                    <span>- Rp ${pph.toLocaleString('id-ID')}</span>
                  </div>
                ` : ''}
                <div class="grand-total">
                  <span>GRAND TOTAL</span>
                  <span>Rp ${total.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-cols: 1.5fr 1fr; gap: 40px; align-items: end; margin-top: 20px;">
              <div class="payment-info" style="margin-top: 0;">
                <h4>Bank Payment Instructions</h4>
                <p>Please settle the total amount to following account:</p>
                <p>Bank Name &nbsp;&nbsp;&nbsp;: <strong>Bank Mandiri</strong></p>
                <p>Account Name : <strong>PT SENTRAL LOGISTIK INDONESIA</strong></p>
                <p>Account No &nbsp;&nbsp;&nbsp;: <strong>123-00-9876543-2</strong></p>
                <p style="margin-top: 5px; font-style: italic;">* Please include the invoice number as a reference.</p>
              </div>

              <div class="signature-box" style="margin-bottom: 10px;">
                <p>Jakarta, ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p>Authorized Signature,</p>
                <div class="signature-space"></div>
                <p><strong>Finance Department</strong></p>
              </div>
            </div>

            <div class="footer">
              <p>This is a computer-generated document. No signature is required if sent electronically.</p>
              <p>Sentralogis - Logistics Management System • www.sentralogis.com</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleUpdateVendorPrice = async () => {
    if (!selectedJO) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from("job_orders")
        .update({ vendor_price: vendorPriceForm })
        .eq("id", selectedJO.id);

      if (error) throw error;
      toast.success("Vendor Price updated!");
      setShowPriceModal(false);
      fetchData();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSettlement = async (jo: any) => {
    try {
      if (!jo.vendor_price || jo.vendor_price <= 0) {
        toast.error("Please set vendor price before settlement.");
        return;
      }

      setLoading(true);
      
      const subtotal = Number(jo.vendor_price);
      // For AP, we might have extra costs too
      const extraCosts = jo.extra_costs?.reduce((sum: number, ec: any) => sum + Number(ec.amount), 0) || 0;
      const total = subtotal + extraCosts;

      // 1. Create Financial Transaction (AP)
      const { error: transError } = await supabase.from("finance_transactions").insert([{
        type: 'AP',
        category: 'Vendor Payment',
        amount_base: subtotal,
        amount_total: total,
        entity_id: jo.fleets?.companies?.id,
        reference_id: jo.id,
        status: 'paid', // Mark as paid immediately for now or 'unpaid' if we want a two-step process
        notes: `Settlement for JO ${jo.jo_number}. Fleet ${jo.fleets?.plate_number}.`
      }]);

      if (transError) throw transError;

      // 2. Update JO Status
      const { error: joError } = await supabase
        .from("job_orders")
        .update({ ap_status: 'paid' })
        .eq("id", jo.id);

      if (joError) throw joError;

      toast.success("Settlement untuk JO #" + jo.jo_number + " berhasil!");
      fetchData();
    } catch (error: any) {
      toast.error("Gagal settlement: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAdvanceStatus = async (advId: string, newStatus: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("cash_advances")
        .update({ status: newStatus })
        .eq("id", advId);

      if (error) throw error;
      
      toast.success(`Cash Advance status updated to ${newStatus.toUpperCase()}`);
      fetchData();
    } catch (error: any) {
      toast.error("Gagal update: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
      const filePath = `ca-proofs/${fileName}`;

      const { data, error } = await supabase.storage
        .from('perusahaan_files')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('perusahaan_files')
        .getPublicUrl(filePath);

      setLiqForm({ ...liqForm, proof_url: publicUrl });
      toast.success("Bukti transfer diunggah!");
    } catch (error: any) {
      toast.error("Gagal unggah: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const processLiquidation = async () => {
    if (!selectedAdv) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from("cash_advances")
        .update({
          status: 'disbursed',
          disbursement_proof_url: liqForm.proof_url,
          disbursement_notes: liqForm.notes
        })
        .eq("id", selectedAdv.id);

      if (error) throw error;
      
      toast.success("Cash Advance cair & Bukti tersimpan!");
      setShowLiqModal(false);
      fetchData();
    } catch (error: any) {
      console.error("Liquidation Error:", error);
      toast.error("Gagal proses: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // --- Render Helpers ---

  const renderAR = () => {
    const filteredAR = workOrders.filter(wo => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
          wo.wo_number?.toLowerCase().includes(term) || 
          wo.customers?.company_name?.toLowerCase().includes(term) ||
          wo.customers?.name?.toLowerCase().includes(term);

      if (!matchesSearch) return false;
      if (wo.status !== 'approved' && wo.status !== 'done') return false;
      
      if (arFilter === 'all') return true;
      if (arFilter === 'incomplete') return !wo.physical_doc_received && wo.billing_status === 'none';
      if (arFilter === 'completed') return wo.physical_doc_received && (wo.billing_status === 'none' || wo.billing_status === 'pending_verification');
      if (arFilter === 'invoiced') return wo.billing_status === 'invoiced';
      if (arFilter === 'paid') return wo.billing_status === 'paid';
      return true;
    });

    return (
      <div className="space-y-6">
        {/* AR Tabs filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['all', 'incomplete', 'completed', 'invoiced', 'paid'].map(s => (
            <button 
              key={s} 
              onClick={() => setArFilter(s as any)}
              className={`whitespace-nowrap px-6 py-4 rounded-[1.25rem] text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                arFilter === s ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-600/20' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAR.length === 0 ? (
            <div className="col-span-full py-20 text-center opacity-30 bg-[#151f32]/60 rounded-[3rem] border border-white/10">
              <FileText className="w-12 h-12 mx-auto mb-4" />
              <p className="font-black text-xs uppercase tracking-widest">No matching receivables found</p>
            </div>
          ) : (
            filteredAR.map(wo => {
              const subtotal = wo.work_order_items.reduce((sum, item) => sum + (item.deal_price * item.quantity), 0);
              const extraCosts = wo.work_order_items.reduce((sum, item) => {
                return sum + (item.job_orders?.reduce((joSum, jo) => {
                  return joSum + (jo.extra_costs?.filter(ec => ec.is_billable).reduce((ecSum, ec) => ecSum + Number(ec.amount), 0) || 0);
                }, 0) || 0);
              }, 0);
              
              const ppn = wo.customers?.use_ppn ? subtotal * 0.11 : 0;
              const pph = (subtotal * (wo.customers?.pph_rate || 2)) / 100;
              const netAmount = subtotal + extraCosts + ppn - pph;

              const isInvoiced = wo.billing_status === 'invoiced';
              const isPaid = wo.billing_status === 'paid';
              const hasPOD = wo.physical_doc_received;

              return (
                <div key={wo.id} className="bg-[#151f32]/60 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 hover:border-white/10 transition-all relative group overflow-hidden">
                  {/* Status Indicator Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isPaid ? 'bg-emerald-500' : isInvoiced ? 'bg-blue-500' : hasPOD ? 'bg-amber-500' : 'bg-slate-700'}`} />

                  <div className="flex flex-col h-full justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex justify-between items-start">
                           <div className="space-y-1">
                              <span className="text-[10px] font-black text-slate-500 bg-white/5 px-3 py-1 rounded-lg uppercase tracking-widest">{wo.wo_number}</span>
                              <h3 className="text-xl font-black text-white italic tracking-tighter leading-tight mt-2 line-clamp-1">{wo.customers?.company_name || wo.customers?.name}</h3>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">NPWP: {wo.customers?.tax_id_number || '-'}</p>
                           </div>
                           <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                              isPaid ? 'bg-emerald-500/10 text-emerald-500' :
                              isInvoiced ? 'bg-blue-500/10 text-blue-500' :
                              hasPOD ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-600'
                           }`}>
                              {isPaid ? 'PAID' : isInvoiced ? 'INVOICED' : hasPOD ? 'READY' : 'WAITING POD'}
                           </div>
                        </div>

                        {/* Financial Summary */}
                        <div className="p-6 bg-black/40 rounded-[2rem] border border-white/5 space-y-4">
                           <div className="flex justify-between items-center text-slate-500">
                              <span className="text-[9px] font-black uppercase tracking-widest">Base Revenue</span>
                              <span className="text-sm font-bold text-slate-300">Rp {subtotal.toLocaleString('id-ID')}</span>
                           </div>
                           {extraCosts > 0 && (
                             <div className="flex justify-between items-center text-slate-500">
                                <span className="text-[9px] font-black uppercase tracking-widest">Extra Costs</span>
                                <span className="text-sm font-bold text-blue-400">+ Rp {extraCosts.toLocaleString('id-ID')}</span>
                             </div>
                           )}
                           <div className="pt-3 border-t border-white/5 flex justify-between items-end">
                              <div>
                                 <p className="text-[8px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">Net Billing Amount</p>
                                 <p className="text-2xl font-black text-white italic">Rp {netAmount.toLocaleString('id-ID')}</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Tax Est (VAT)</p>
                                 <p className="text-sm font-black text-white/40">Rp {ppn.toLocaleString('id-ID')}</p>
                              </div>
                           </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                       {isInvoiced && !isPaid && (
                         <button 
                           onClick={() => { setCurrentWO(wo); setShowPayModal(true); }}
                           className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-2xl shadow-emerald-500/20"
                         >
                           <CheckCircle2 className="w-4 h-4 text-white" />
                           Collect Payment
                         </button>
                       )}

                       {(isInvoiced || isPaid) && (
                         <button 
                           onClick={() => handlePrintInvoice(wo)}
                           className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                         >
                           <Printer className="w-4 h-4 text-slate-400" />
                           {isPaid ? 'View Invoice' : 'Issue Print'}
                         </button>
                       )}

                       {!isInvoiced && !isPaid && (
                         <button 
                           onClick={() => { setSelectedWO(wo); setShowInvoicingModal(true); }}
                           className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                             hasPOD 
                               ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-2xl shadow-blue-500/20' 
                               : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                           }`}
                           disabled={!hasPOD}
                         >
                           <FilePlus className="w-4 h-4" />
                           {hasPOD ? 'Proceed to Invoice' : 'Pending Verification'}
                         </button>
                       )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderAP = () => {
    const allJOs = workOrders.flatMap(wo => 
      wo.work_order_items.flatMap(item => 
        item.job_orders.map(jo => ({ ...jo, customer: wo.customers }))
      )
    );

    const filteredJOs = allJOs.filter(jo => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
          jo.jo_number?.toLowerCase().includes(term) || 
          jo.fleets?.plate_number?.toLowerCase().includes(term) ||
          jo.fleets?.companies?.name?.toLowerCase().includes(term);

      if (!matchesSearch) return false;
      if (jo.status !== 'delivered' && jo.status !== 'completed') return false;
      if (apFilter === 'all') return true;
      if (apFilter === 'unquoted') return !jo.vendor_price || jo.vendor_price === 0;
      if (apFilter === 'pending') return jo.vendor_price > 0 && jo.ap_status !== 'paid';
      if (apFilter === 'paid') return jo.ap_status === 'paid';
      return true;
    });

    return (
      <div className="space-y-6">
        {/* AP Tabs filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['all', 'unquoted', 'pending', 'paid'].map(s => (
            <button 
              key={s} 
              onClick={() => setApFilter(s as any)}
              className={`whitespace-nowrap px-6 py-4 rounded-[1.25rem] text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                apFilter === s ? 'bg-red-600 border-red-500 text-white shadow-xl shadow-red-600/20' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredJOs.length === 0 ? (
            <div className="col-span-full py-20 text-center opacity-30 bg-[#151f32]/60 rounded-[3rem] border border-white/10">
              <Truck className="w-12 h-12 mx-auto mb-4" />
              <p className="font-black text-xs uppercase tracking-widest">No matching payables found</p>
            </div>
          ) : (
            filteredJOs.map(jo => {
              const isPaid = jo.ap_status === 'paid';
              const hasPrice = jo.vendor_price > 0;
              const advances = jo.cash_advances?.reduce((s: number, a: any) => s + (a.status !== 'settled' ? a.amount : 0), 0) || 0;
              const extraCosts = jo.extra_costs?.reduce((s: number, a: any) => s + Number(a.amount), 0) || 0;
              const netPayable = (Number(jo.vendor_price) + extraCosts) - advances;

              return (
                <div key={jo.id} className="bg-[#151f32]/60 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 hover:border-white/10 transition-all relative group overflow-hidden">
                  {/* Status Indicator Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isPaid ? 'bg-emerald-500' : hasPrice ? 'bg-blue-500' : 'bg-rose-500'}`} />
                  
                  <div className="flex flex-col gap-8 h-full justify-between">
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isPaid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'}`}>
                            <Truck className="w-6 h-6" />
                          </div>
                          <div>
                             <span className="text-[10px] font-black text-slate-500 bg-white/5 px-3 py-1 rounded-lg uppercase tracking-widest leading-none mb-1 inline-block">{jo.jo_number}</span>
                             <h3 className="text-xl font-black text-white italic tracking-tighter line-clamp-1">{jo.fleets?.companies?.name || 'Internal Driver'}</h3>
                             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                {jo.fleets?.plate_number} • {jo.fleets?.truck_type}
                             </p>
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                          isPaid ? 'bg-emerald-500/10 text-emerald-500' :
                          hasPrice ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {isPaid ? 'SETTLED' : hasPrice ? 'UNPAID' : 'PENDING PRICE'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Base Vendor Fee</p>
                           <p className="text-lg font-black text-white">Rp {Number(jo.vendor_price || 0).toLocaleString('id-ID')}</p>
                        </div>
                        <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Advances Paid</p>
                           <p className="text-lg font-black text-rose-500">- Rp {advances.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="col-span-2 p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex justify-between items-center">
                           <div>
                              <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Net Payable To Vendor</p>
                              <p className="text-2xl font-black text-white italic">Rp {netPayable.toLocaleString('id-ID')}</p>
                           </div>
                           <Banknote className="w-8 h-8 text-emerald-500/30" />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                       <button 
                        onClick={() => { setSelectedJOForCockpit(jo); setShowJOCockpitModal(true); }}
                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 border border-white/5 shadow-xl"
                      >
                        <Eye className="w-4 h-4" />
                        Details
                      </button>

                      {!isPaid && (
                        <button 
                          onClick={() => { setSelectedJO(jo); setVendorPriceForm(jo.vendor_price); setShowPriceModal(true); }}
                          className="px-4 py-4 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl transition-all border border-white/5"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                      )}
                      
                      {!isPaid && hasPrice && (
                        <button 
                          onClick={() => handleSettlement(jo)}
                          className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 shadow-2xl shadow-emerald-600/20"
                        >
                          <Send className="w-4 h-4" />
                          Execute Settlement
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderAdvances = () => {
    const allAdvances = workOrders.flatMap(wo => 
      (wo.work_order_items || []).flatMap((item: any) => 
        (item.job_orders || []).flatMap((jo: any) => 
          (jo.cash_advances || []).map((adv: any) => ({ ...adv, jo_number: jo.jo_number, fleet: jo.fleets }))
        )
      )
    );

    const filteredAdvances = allAdvances.filter(adv => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
          adv.jo_number?.toLowerCase().includes(term) || 
          adv.fleet?.plate_number?.toLowerCase().includes(term) ||
          adv.description?.toLowerCase().includes(term);

      if (!matchesSearch) return false;
      return advFilter === 'all' ? true : adv.status === advFilter;
    });

    return (
      <div className="space-y-6">
        {/* Advance Tabs filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['all', 'pending', 'approved', 'disbursed'].map(s => (
            <button 
              key={s} 
              onClick={() => setAdvFilter(s as any)}
              className={`whitespace-nowrap px-6 py-4 rounded-[1.25rem] text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                advFilter === s ? 'bg-amber-600 border-amber-500 text-white shadow-xl shadow-amber-600/20' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="bg-[#151f32]/60 backdrop-blur-2xl border border-white/5 rounded-[3rem] p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3 leading-none">
                <Wallet className="w-8 h-8 text-amber-500" /> Advance Liquidator
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Managing Field Operational Capital</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredAdvances.length === 0 ? (
              <div className="py-20 text-center opacity-30">
                <Banknote className="w-12 h-12 mx-auto mb-4" />
                <p className="font-black text-xs uppercase tracking-widest">No matching liquidations found</p>
              </div>
            ) : (
              filteredAdvances.map(adv => (
                <div key={adv.id} className="bg-white/3 border border-white/5 rounded-[2rem] p-6 flex flex-col md:flex-row justify-between items-center group hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                      adv.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                      adv.status === 'approved' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                      'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                    }`}>
                      <Banknote className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{adv.jo_number}</span>
                        <div className={`w-1 h-1 rounded-full ${
                          adv.status === 'pending' ? 'bg-amber-500' :
                          adv.status === 'approved' ? 'bg-blue-500' : 'bg-emerald-500'
                        }`} />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${
                          adv.status === 'pending' ? 'text-amber-500' :
                          adv.status === 'approved' ? 'text-blue-400' : 'text-emerald-400'
                        }`}>{adv.status}</span>
                      </div>
                      <h4 className="text-xl font-black text-white italic tracking-tight">Rp {adv.amount.toLocaleString('id-ID')}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 line-clamp-1">{adv.description || "Field Op-Ex Advance"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 w-full md:w-auto mt-6 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0 md:border-l border-white/5 md:pl-8">
                    <div className="flex-1 md:flex-none text-left md:text-right hidden sm:block">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Requester Ref</p>
                        <p className="text-xs font-black text-slate-300 uppercase leading-none">{adv.fleet?.plate_number || 'Internal Fleet'}</p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Operation Hub Alpha</p>
                    </div>
                    
                    <div className="flex-1 md:flex-none flex justify-end">
                       {adv.status === 'pending' && (
                         <button 
                           onClick={() => {
                             setSelectedAdv(adv);
                             setLiqForm({ amount: adv.amount, notes: "", proof_url: "" });
                             setShowLiqModal(true);
                           }}
                           className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-3"
                         >
                           <ShieldCheck className="w-4 h-4" /> Approve & Disburse
                         </button>
                       )}
                       {adv.status === 'disbursed' && (
                         <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                              <CheckCircle2 className="w-4 h-4 shadow-emerald-500/50" /> Funds Disbursed
                            </div>
                            {adv.disbursement_proof_url && (
                              <a 
                                href={adv.disbursement_proof_url} 
                                target="_blank" 
                                className="text-[9px] font-black text-blue-400 hover:text-blue-300 underline uppercase tracking-[0.2em] px-2 italic transition-colors"
                              >
                                View Evidence
                              </a>
                            )}
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderReports = () => {
    const paidInvoices = workOrders.filter(wo => wo.billing_status === 'paid');
    
    // Aggregates
    const totalRevenue = paidInvoices.reduce((sum, wo) => {
      const subtotal = wo.work_order_items.reduce((s, i) => s + (i.deal_price * i.quantity), 0);
      const extra = wo.work_order_items.reduce((s, i) => s + (i.job_orders?.reduce((js, j) => js + (j.extra_costs?.filter(ec => ec.is_billable).reduce((es, e) => es + Number(e.amount), 0) || 0), 0) || 0), 0);
      return sum + subtotal + extra;
    }, 0);

    const totalVAT = paidInvoices.reduce((sum, wo) => {
      if (!wo.customers?.use_ppn) return sum;
      const subtotal = wo.work_order_items.reduce((s, i) => s + (i.deal_price * i.quantity), 0);
      return sum + (subtotal * 0.11);
    }, 0);

    const totalWHT = paidInvoices.reduce((sum, wo) => {
      const subtotal = wo.work_order_items.reduce((s, i) => s + (i.deal_price * i.quantity), 0);
      return sum + (subtotal * (wo.customers?.pph_rate || 2) / 100);
    }, 0);

    return (
      <div className="space-y-10">
        {/* Tax & Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#151f32]/60 backdrop-blur-2xl border border-white/5 rounded-[3rem] p-10 relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-all">
               <Landmark className="w-24 h-24 text-blue-500" />
            </div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2 leading-none">Gross Settled Revenue</p>
            <h3 className="text-3xl font-black text-white italic tracking-tighter">Rp {totalRevenue.toLocaleString('id-ID')}</h3>
            <div className="mt-6 flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Verified & Liquidated
            </div>
          </div>

          <div className="bg-[#151f32]/60 backdrop-blur-2xl border border-emerald-500/10 rounded-[3rem] p-10 relative group overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-all">
                <Receipt className="w-24 h-24 text-emerald-500" />
             </div>
             <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2 leading-none">VAT Ledger (PPN 11%)</p>
             <h3 className="text-3xl font-black text-white italic tracking-tighter">Rp {totalVAT.toLocaleString('id-ID')}</h3>
             <p className="text-[10px] font-bold text-slate-500 uppercase mt-4">Collected on behalf of customers</p>
          </div>

          <div className="bg-[#151f32]/60 backdrop-blur-2xl border border-rose-500/10 rounded-[3rem] p-10 relative group overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-all">
                <Percent className="w-24 h-24 text-rose-500" />
             </div>
             <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-2 leading-none">Withholding Ledger (PPh 23)</p>
             <h3 className="text-3xl font-black text-white italic tracking-tighter">Rp {totalWHT.toLocaleString('id-ID')}</h3>
             <p className="text-[10px] font-bold text-slate-500 uppercase mt-4">Pre-paid income tax deductions</p>
          </div>
        </div>

        {/* Transaction History Ledger */}
        <div className="bg-[#151f32]/40 backdrop-blur-xl border border-white/5 rounded-[3.5rem] p-12">
            <div className="flex justify-between items-center mb-10">
               <div>
                  <h4 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                     <History className="w-6 h-6 text-emerald-500" /> Transactional Archive
                  </h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Audit-ready historical records</p>
               </div>
               <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export Ledger (.CSV)
               </button>
            </div>

            <div className="space-y-3">
               {paidInvoices.length === 0 ? (
                 <div className="py-20 text-center opacity-20 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                    <FileText className="w-16 h-16 mx-auto mb-4" />
                    <p className="font-black text-xs uppercase tracking-widest">No matching archives found in the ledger</p>
                 </div>
               ) : (
                 paidInvoices.map(wo => {
                    const subtotal = wo.work_order_items.reduce((s, i) => s + (i.deal_price * i.quantity), 0);
                    const invoiceDate = wo.invoices?.[0]?.invoice_date || wo.updated_at;
                    
                    return (
                      <div key={wo.id} className="group bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-3xl p-6 transition-all flex items-center justify-between">
                         <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-emerald-500 transition-colors">
                               <Receipt className="w-6 h-6" />
                            </div>
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{wo.wo_number}</span>
                                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded-lg uppercase">PAID & SETTLED</span>
                               </div>
                               <h5 className="text-base font-black text-white italic tracking-tight">{wo.customers?.company_name || wo.customers?.name}</h5>
                               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                  {new Date(invoiceDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                               </p>
                            </div>
                         </div>

                         <div className="flex items-center gap-12">
                            <div className="text-right hidden md:block">
                               <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Invoice Value</p>
                               <p className="text-lg font-black text-white italic">Rp {subtotal.toLocaleString('id-ID')}</p>
                            </div>
                            <div className="flex gap-2">
                               {wo.invoices?.[0]?.payment_proof_url && (
                                 <a 
                                   href={wo.invoices[0].payment_proof_url} 
                                   target="_blank" 
                                   className="p-3 bg-white/5 hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-500 rounded-xl transition-all border border-white/5"
                                 >
                                    <ShieldCheck className="w-5 h-5" />
                                 </a>
                               )}
                               <button 
                                 onClick={() => handlePrintInvoice(wo)}
                                 className="p-3 bg-white/5 hover:bg-blue-600/10 text-slate-500 hover:text-blue-500 rounded-xl transition-all border border-white/5"
                               >
                                  <Printer className="w-5 h-5" />
                               </button>
                            </div>
                         </div>
                      </div>
                    );
                 })
               )}
            </div>
        </div>
      </div>
    );
  };

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
      {[
        { label: "Accounts Receivable", value: stats.ar_total, icon: ArrowUpCircle, color: "emerald" },
        { label: "Accounts Payable", value: stats.ap_total, icon: ArrowDownCircle, color: "red" },
        { label: "Pending Advances", value: stats.cash_adv_pending, icon: Wallet, color: "amber" },
        { label: "Tax Liability (EST)", value: stats.tax_ytd, icon: Landmark, color: "blue" }
      ].map((s, idx) => (
        <div key={idx} className="bg-white/[0.03] border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group">
          <div className={`absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all`}>
            <s.icon className={`w-16 h-16 text-${s.color}-500`} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
            <h3 className="text-2xl font-black text-white italic">
               Rp {s.value.toLocaleString('id-ID')}
            </h3>
            <div className={`mt-3 flex items-center gap-2 text-[9px] font-bold text-${s.color}-500 uppercase`}>
              <div className={`w-1.5 h-1.5 rounded-full bg-${s.color}-500 animate-pulse`} />
              Real-time update
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050a18] text-slate-200 p-6 pb-32 md:pb-6 relative overflow-hidden">
      <Toaster position="top-right" />

      {/* Decorative Blur */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/2 -right-24 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20 rotate-3">
              <Banknote className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                FINANCE <span className="text-emerald-500">ENGINE</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 leading-none">Logistics Liquidity & Tax Management</p>
            </div>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 md:mx-0 md:px-0 md:pb-0 md:overflow-visible scrollbar-hide w-[calc(100%+3rem)] md:w-auto">
              <button
                onClick={fetchData}
                className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-6 py-3 rounded-2xl hover:bg-white/10 transition-all font-bold active:scale-95"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Sync Data
              </button>
              <button
                className="flex items-center gap-2 bg-purple-600/10 border border-purple-500/20 text-purple-400 px-6 py-3 rounded-2xl hover:bg-purple-600 hover:text-white transition-all font-bold active:scale-95"
              >
                <ShieldCheck className="w-5 h-5" />
                Tax Analytics
              </button>
              <button
                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 font-bold active:scale-95 whitespace-nowrap"
              >
                <Calculator className="w-5 h-5" />
                Bank Reconciliation
              </button>
          </div>
        </div>

        {/* BI COCKPIT - Finance Intelligence */}
        <div className="flex lg:grid lg:grid-cols-3 gap-6 overflow-x-auto lg:overflow-visible pb-8 -mx-6 px-6 lg:mx-0 lg:px-0 lg:pb-0 mb-12 snap-x snap-mandatory scrollbar-hide">
          {/* 1. Receivables Pipeline */}
          <div className="min-w-[320px] lg:min-w-0 snap-center bg-[#151f32]/60 backdrop-blur-2xl border border-white/5 rounded-[3.5rem] p-8 shadow-2xl relative group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <Landmark className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white italic tracking-tighter uppercase line-clamp-1">Receivables Pipeline</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-0.5">AR Flow Control</p>
              </div>
            </div>
            <div className="space-y-6 relative">
              {[
                { label: 'Pending POD', count: (stats as any).funnel?.waiting_pod || 0, color: 'text-slate-500', bar: 'bg-slate-700' },
                { label: 'Ready to Bill', count: (stats as any).funnel?.ready || 0, color: 'text-amber-400', bar: 'bg-amber-500' },
                { label: 'Invoiced', count: (stats as any).funnel?.invoiced || 0, color: 'text-blue-400', bar: 'bg-blue-500' },
                { label: 'Collected', count: (stats as any).funnel?.paid || 0, color: 'text-emerald-400', bar: 'bg-emerald-500' },
              ].map((step, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{step.label}</span>
                    <span className={`text-lg font-black ${step.color}`}>{step.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${step.bar}`} style={{ width: `${(step.count / ((stats as any).total_orders || 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Portfolio Performance */}
          <div className="min-w-[320px] lg:min-w-0 snap-center bg-[#151f32]/60 backdrop-blur-2xl border border-white/5 rounded-[3.5rem] p-8 shadow-2xl relative group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                <ScanLine className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white italic tracking-tighter uppercase">Portfolio Health</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-0.5">Yield & Growth</p>
              </div>
            </div>
            <div className="flex flex-col justify-center h-[calc(100%-100px)]">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Total Booked Value</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-black text-emerald-500/50 italic font-sans uppercase">IDR</span>
                  <span className="text-4xl font-black text-white tracking-tighter leading-none">
                    {((stats as any).revenueComparison?.thisMonth || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Growth MoM</p>
                  <div className={`flex items-center gap-1 text-sm font-black ${(stats as any).revenueComparison?.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {((stats as any).revenueComparison?.growth || 0).toFixed(1)}%
                    <TrendingUp className={`w-3 h-3 ${(stats as any).revenueComparison?.growth < 0 ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tax Est.</p>
                   <p className="text-sm font-black text-blue-400 italic">Rp {((stats as any).tax_ytd || 0).toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Operational Liquidity */}
          <div className="min-w-[320px] lg:min-w-0 snap-center bg-[#151f32]/60 backdrop-blur-2xl border border-white/5 rounded-[3.5rem] p-8 shadow-2xl relative group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white italic tracking-tighter uppercase">Liquid Capital</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-0.5">Payables & Advances</p>
              </div>
            </div>
            <div className="flex flex-col justify-between h-[calc(100%-100px)]">
               <div className="space-y-4">
                  <div className="p-6 bg-white/3 rounded-[2rem] border border-white/5">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 opacity-50">Accounts Payable</p>
                     <p className="text-2xl font-black text-white italic">Rp {stats.ap_total.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="p-6 bg-amber-500/5 rounded-[2rem] border border-amber-500/10">
                     <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Operational Advances</p>
                     <p className="text-2xl font-black text-white italic">Rp {stats.cash_adv_pending.toLocaleString('id-ID')}</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Tactical Sub-Navigation */}
        <div className="flex flex-col md:flex-row gap-6 mb-8 items-end justify-between">
           <div className="flex bg-[#151f32]/60 backdrop-blur-xl border border-white/5 p-1.5 rounded-[2.5rem] w-full md:w-fit overflow-x-auto scrollbar-hide">
              {[
                { id: 'ar', label: 'Receivables', icon: Landmark },
                { id: 'ap', label: 'Payables', icon: Receipt },
                { id: 'advances', label: 'Advances', icon: Wallet },
                { id: 'reports', label: 'Archive', icon: BarChart3 },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-3 px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap ${activeTab === t.id ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
           </div>

           <div className="relative flex-1 max-w-md w-full group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="text"
                placeholder="Cari Entitas, No-Invoice, atau Referensi..."
                className="w-full bg-[#151f32]/60 backdrop-blur-xl border border-white/5 rounded-[2rem] py-5 pl-16 pr-8 text-[11px] font-black uppercase tracking-widest text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 transition-all placeholder:text-slate-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        {/* MAIN TACTICAL GRID */}
        <div className="min-h-[500px]">
          {activeTab === 'ar' && renderAR()}
          {activeTab === 'ap' && renderAP()}
          {activeTab === 'advances' && renderAdvances()}
          {activeTab === 'reports' && renderReports()}
        </div>

        {/* MOBILE BOTTOM MENU - Ergonomic Standard */}
        <nav className="fixed bottom-0 inset-x-0 bg-[#0a0f1e]/80 backdrop-blur-2xl border-t border-white/5 p-4 pb-8 flex justify-around items-center z-50 md:hidden">
            <button 
              onClick={() => { setActiveTab('ar'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
              className={`flex flex-col items-center gap-1.5 ${activeTab === 'ar' ? 'text-emerald-500' : 'text-slate-600'}`}
            >
                <LayoutGrid className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-tighter">Finance</span>
            </button>
            <button 
              onClick={() => { setActiveTab('ap'); }} 
              className={`flex flex-col items-center gap-1.5 ${activeTab === 'ap' ? 'text-emerald-500' : 'text-slate-600'}`}
            >
                <Truck className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-tighter">Payables</span>
            </button>
            
            <div className="-mt-14 relative">
                <button 
                  onClick={() => fetchData()} 
                  className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_20px_40px_rgba(16,185,129,0.3)] text-white border-4 border-[#0a0f1e] active:scale-90 transition-all"
                >
                    <RefreshCw className={`w-8 h-8 font-black ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <button 
              onClick={() => setActiveTab('advances')} 
              className={`flex flex-col items-center gap-1.5 ${activeTab === 'advances' ? 'text-emerald-500' : 'text-slate-600'}`}
            >
                <Wallet className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-tighter">Advances</span>
            </button>
            <button 
              onClick={() => setActiveTab('reports')} 
              className={`flex flex-col items-center gap-1.5 ${activeTab === 'reports' ? 'text-emerald-500' : 'text-slate-600'}`}
            >
                <BarChart3 className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-tighter">Reports</span>
            </button>
        </nav>
      </div>

      {/* LIQUIDATION MODAL — APPROVE & DISBURSE */}
      {showLiqModal && selectedAdv && (
        <div className="fixed inset-0 bg-[#0a0f1e]/95 backdrop-blur-xl flex items-center justify-center z-[200] p-4">
          <div className="bg-[#111827] border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-emerald-500/5">
                <div>
                    <h2 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                        <Landmark className="w-6 h-6 text-emerald-500" /> Fund Liquidation
                    </h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Konfirmasi & Bukti Transfer</p>
                </div>
                <button onClick={() => setShowLiqModal(false)} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-8 space-y-6">
                <div className="bg-white/3 border border-white/5 rounded-2xl p-6 flex justify-between items-center">
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Cair</p>
                        <h4 className="text-2xl font-black text-white tracking-tight">Rp {selectedAdv.amount.toLocaleString('id-ID')}</h4>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{selectedAdv.jo_number}</p>
                        <p className="text-[11px] font-bold text-slate-400">{selectedAdv.fleet?.plate_number}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Catatan Disburse</label>
                        <textarea 
                          value={liqForm.notes}
                          onChange={(e) => setLiqForm({ ...liqForm, notes: e.target.value })}
                          placeholder="Misal: Transfer via BCA / Mandiri..."
                          className="w-full bg-[#0a0f1e] border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 h-24"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Upload Bukti Transfer</label>
                        <div className="relative group">
                          <input 
                            type="file" 
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            accept="image/*,.pdf"
                          />
                          <div className={`w-full py-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${
                            liqForm.proof_url ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 group-hover:border-emerald-500/30 bg-white/3 group-hover:bg-emerald-500/5'
                          }`}>
                            {uploading ? (
                              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                            ) : liqForm.proof_url ? (
                              <>
                                <FileCheck className="w-6 h-6 text-emerald-500" />
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Bukti Tersimpan</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-slate-600" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Klik atau Seret file (PDF/IMG)</span>
                              </>
                            )}
                          </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex gap-4">
                    <button 
                      onClick={() => setShowLiqModal(false)}
                      className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={processLiquidation}
                      disabled={!liqForm.proof_url || loading}
                      className={`flex-[2] py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 ${
                        !liqForm.proof_url || loading
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-95'
                      }`}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Cairkan Dana
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal with Tax Logic */}
      {showInvoicingModal && selectedWO && (() => {
        const subtotal = selectedWO.work_order_items.reduce((s, i) => s + (i.deal_price * i.quantity), 0);
        const extraCosts = selectedWO.work_order_items.reduce((sum, item) => {
          return sum + (item.job_orders?.reduce((joSum, jo) => {
            return joSum + (jo.extra_costs?.filter(ec => ec.is_billable).reduce((ecSum, ec) => ecSum + Number(ec.amount), 0) || 0);
          }, 0) || 0);
        }, 0);
        const ppn = selectedWO.customers?.use_ppn ? subtotal * 0.11 : 0;
        const pphRate = selectedWO.customers?.pph_rate || 2;
        const pph = (subtotal * pphRate) / 100;
        const netTotal = subtotal + extraCosts + ppn - pph;

        return (
          <div className="fixed inset-0 bg-[#050a18]/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">Invoice Confirmation</h2>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Ready for Financial Recording & Tax Calculation</p>
                </div>
                <button onClick={() => setShowInvoicingModal(false)} className="text-slate-500 hover:text-white transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Billed To</p>
                    <p className="text-sm font-bold text-white">{selectedWO.customers?.company_name || selectedWO.customers?.name}</p>
                    <p className="text-[10px] text-slate-500 mt-1">NPWP: {selectedWO.customers?.tax_id_number || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Reference</p>
                    <p className="text-sm font-bold text-white">{selectedWO.wo_number}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{selectedWO.route_name || 'Shipping Services'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-slate-400">
                    <p className="text-[10px] font-black uppercase tracking-widest">Base Revenue (Taxable)</p>
                    <span className="text-sm font-bold text-white">Rp {subtotal.toLocaleString('id-ID')}</span>
                  </div>

                  {extraCosts > 0 && (
                    <div className="flex justify-between items-center text-slate-400">
                      <p className="text-[10px] font-black uppercase tracking-widest">Extra Charges (Non-Taxable)</p>
                      <span className="text-sm font-bold text-emerald-400">Rp {extraCosts.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  
                  <div className="p-5 bg-white/3 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">VAT (PPN 11%)</span>
                      <span className="text-xs font-bold text-slate-300">+ Rp {ppn.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">WHT (PPh 23 - {pphRate}%)</span>
                      <span className="text-xs font-bold text-red-500">- Rp {pph.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                     <div className="space-y-1">
                       <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Grand Total to Invoice</p>
                       <p className="text-[10px] text-slate-500">Includes all services & extra charges</p>
                     </div>
                     <h2 className="text-3xl font-black text-white tracking-tighter">
                       Rp {netTotal.toLocaleString('id-ID')}
                     </h2>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
                <button 
                  onClick={() => setShowInvoicingModal(false)}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleCreateInvoice(selectedWO)}
                  disabled={creatingInvoice}
                  className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20"
                >
                  {creatingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {creatingInvoice ? 'Generating...' : 'Finalize & Issue Invoice'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Payment Confirmation Modal */}
      {showPayModal && currentWO && (
        <div className="fixed inset-0 bg-[#050a18]/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Confirm Payment</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Record Inbound Payment & Close AR</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Payment Reference</p>
                <p className="text-sm font-bold text-white">{currentWO.wo_number} - {currentWO.customers?.company_name || currentWO.customers?.name}</p>
                <div className="mt-3 pt-3 border-t border-emerald-500/10 flex justify-between items-end">
                   <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Expected Amount</p>
                   <p className="text-xl font-black text-white">
                     Rp {currentWO.invoices?.[0]?.total_amount?.toLocaleString('id-ID') || (
                        currentWO.work_order_items.reduce((sum, item) => sum + (item.deal_price * item.quantity), 0) +
                        (currentWO.work_order_items.reduce((sum, item) => {
                          return sum + (item.job_orders?.reduce((joSum, jo) => {
                            return joSum + (jo.extra_costs?.filter(ec => ec.is_billable).reduce((ecSum, ec) => ecSum + Number(ec.amount), 0) || 0);
                          }, 0) || 0);
                        }, 0)) +
                        (currentWO.customers?.use_ppn ? currentWO.work_order_items.reduce((sum, item) => sum + (item.deal_price * item.quantity), 0) * 0.11 : 0) -
                        (currentWO.work_order_items.reduce((sum, item) => sum + (item.deal_price * item.quantity), 0) * (currentWO.customers?.pph_rate || 2) / 100)
                     ).toLocaleString('id-ID')}
                   </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Payment Date</label>
                  <input 
                    type="date" 
                    value={payForm.paid_at}
                    onChange={(e) => setPayForm({...payForm, paid_at: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Payment Proof (Upload)</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        try {
                          const fileExt = file.name.split('.').pop();
                          const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
                          const filePath = `payments/${fileName}`;
                          
                          const { error: uploadError } = await supabase.storage
                            .from('documents')
                            .upload(filePath, file, { 
                              upsert: true,
                              contentType: file.type 
                            });

                          if (uploadError) throw uploadError;
                          
                          const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
                          if (!data?.publicUrl) throw new Error("Gagal mendapatkan URL publik.");
                          
                          setPayForm({...payForm, proof_url: data.publicUrl});
                          toast.success("Bukti transfer berhasil diunggah!");
                        } catch (error: any) {
                          console.error("Storage Error:", error);
                          toast.error("Gagal unggah: " + (error.message || "Unknown error"));
                        } finally {
                          setUploading(false);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`w-full bg-white/5 border-2 border-dashed rounded-xl px-4 py-6 flex flex-col items-center justify-center transition-all ${payForm.proof_url ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 hover:border-white/20'}`}>
                      {uploading ? <Loader2 className="w-6 h-6 text-slate-400 animate-spin" /> : (
                        <>
                          <Upload className={`w-6 h-6 mb-2 ${payForm.proof_url ? 'text-emerald-500' : 'text-slate-400'}`} />
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            {payForm.proof_url ? 'File Uploaded' : 'Drop Transfer Proof / Click to Browse'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Internal Notes</label>
                  <textarea 
                    value={payForm.notes}
                    onChange={(e) => setPayForm({...payForm, notes: e.target.value})}
                    placeholder="e.g. Paid in full via BCA Transfer"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all font-bold h-24"
                  />
                </div>
              </div>
            </div>

            <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
              <button 
                onClick={() => setShowPayModal(false)}
                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmPayment}
                disabled={loading || uploading}
                className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {loading ? 'Confirming...' : 'Record Payment & Close AR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Price Modal */}
      {showPriceModal && selectedJO && (
        <div className="fixed inset-0 bg-[#050a18]/95 backdrop-blur-xl z-[500] flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Banknote className="w-5 h-5 text-blue-500" /> Set Vendor Price
              </h2>
              <button onClick={() => setShowPriceModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Job Order Number</p>
                <p className="text-sm font-bold text-white">{selectedJO.jo_number}</p>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Freight Cost (To Vendor)</p>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">Rp</div>
                  <input 
                    type="number"
                    value={vendorPriceForm}
                    onChange={(e) => setVendorPriceForm(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-black text-lg focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              <button 
                onClick={handleUpdateVendorPrice}
                disabled={loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Update & Save Price
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINANCE AP DETAIL COCKPIT MODAL */}
      {showJOCockpitModal && selectedJOForCockpit && (() => {
          const jo = selectedJOForCockpit;
          const advances = jo.cash_advances?.reduce((s: number, a: any) => s + (a.status !== 'settled' ? a.amount : 0), 0) || 0;
          const extraCosts = jo.extra_costs?.reduce((s: number, a: any) => s + Number(a.amount), 0) || 0;
          const netPayable = (Number(jo.vendor_price) + extraCosts) - advances;
          const isPaid = jo.ap_status === 'paid';

          return (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-10">
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl transition-opacity" onClick={() => setShowJOCockpitModal(false)} />
                
                <div className="relative w-full max-w-5xl bg-[#0d121f] border border-white/10 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col items-stretch max-h-[92vh] overflow-hidden animate-in zoom-in duration-300">
                    <div className="p-8 border-b border-white/10 bg-[#151f32]/50 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                                <Landmark className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black tracking-tight text-white mb-1 uppercase italic">{jo.jo_number}</h2>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                    AP SETTLEMENT COCKPIT <span className="mx-2 opacity-30">•</span> {jo.fleets?.plate_number}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowJOCockpitModal(false)}
                            className="p-3 hover:bg-white/5 rounded-full text-slate-600 hover:text-white transition-all transform hover:rotate-90"
                        >
                            <X className="w-10 h-10" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10 space-y-12">
                        {/* 1. OPERATIONAL SUMMARY */}
                        <section className="space-y-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                                <Clock className="w-6 h-6 text-blue-400" /> Operational Verification
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-8 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Job Integrity State</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-white uppercase">Trip Status</span>
                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-lg uppercase">{jo.status}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-white uppercase">Physical Documents</span>
                                        <span className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase ${jo.physical_doc_received ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {jo.physical_doc_received ? 'RECEIVED' : 'PENDING'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-8 bg-white/5 rounded-3xl border border-white/5 space-y-2">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logistics Hub Trace</p>
                                    <div className="space-y-4 relative ml-3 pt-2">
                                        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-white/5" />
                                        <div className="relative flex items-center gap-4">
                                            <div className="w-4 h-4 rounded-full bg-emerald-500" />
                                            <p className="text-xs font-black text-white uppercase">Pickup Successful</p>
                                        </div>
                                        <div className="relative flex items-center gap-4">
                                            <div className="w-4 h-4 rounded-full bg-emerald-500" />
                                            <p className="text-xs font-black text-white uppercase">Delivered & Signed</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. FINANCIAL SETTLEMENT */}
                        <section className="bg-emerald-500/5 p-10 rounded-[3rem] border border-emerald-500/10 space-y-8">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                                <Banknote className="w-8 h-8 text-emerald-500" /> Liquidation Summary
                            </h3>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Base Vendor Price</p>
                                        <p className="text-2xl font-black text-white">Rp {Number(jo.vendor_price || 0).toLocaleString('id-ID')}</p>
                                    </div>
                                    <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5">
                                        <p className="text-[10px] font-black text-blue-500/80 uppercase tracking-widest mb-2">Total Extra Costs</p>
                                        <p className="text-2xl font-black text-blue-400">Rp {extraCosts.toLocaleString('id-ID')}</p>
                                        <div className="mt-2 space-y-1">
                                            {jo.extra_costs?.map((ec: any) => (
                                                <div key={ec.id} className="flex justify-between text-[10px]">
                                                    <span className="text-slate-500 uppercase">{ec.cost_type}</span>
                                                    <span className="text-slate-300 font-bold">Rp {Number(ec.amount).toLocaleString('id-ID')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5">
                                        <p className="text-[10px] font-black text-rose-500/80 uppercase tracking-widest mb-2">Advance Deductions</p>
                                        <p className="text-2xl font-black text-rose-500">- Rp {advances.toLocaleString('id-ID')}</p>
                                    </div>
                                </div>

                                <div className="p-10 bg-emerald-500/10 rounded-[2.5rem] border border-emerald-500/20 flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">Net Amount Released</p>
                                        <p className="text-sm text-slate-400 font-bold uppercase tracking-tight">Final calculation for vendor disbursement</p>
                                    </div>
                                    <h2 className="text-5xl font-black text-white tracking-widest italic">
                                        Rp {netPayable.toLocaleString('id-ID')}
                                    </h2>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="p-10 bg-black/20 border-t border-white/10 flex gap-6">
                        <button 
                            onClick={() => setShowJOCockpitModal(false)}
                            className="flex-1 py-5 text-sm font-black uppercase text-slate-500 hover:text-white transition-all tracking-widest"
                        >
                            Tutup View
                        </button>
                        {!isPaid && (
                            <button 
                                onClick={() => {
                                    handleSettlement(jo);
                                    setShowJOCockpitModal(false);
                                }}
                                className="flex-[2] py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.5rem] text-sm font-black uppercase tracking-widest transition-all shadow-[0_0_50px_rgba(16,185,129,0.3)] flex items-center justify-center gap-4"
                            >
                                <Send className="w-6 h-6" />
                                EXECUTE DISBURSEMENT
                            </button>
                        )}
                        {isPaid && (
                            <div className="flex-[2] py-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-[1.5rem] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-4">
                                <ShieldCheck className="w-6 h-6" />
                                SETTLED & ARCHIVED
                            </div>
                        )}
                    </div>
                </div>
            </div>
          );
      })()}
    </div>
  );
}

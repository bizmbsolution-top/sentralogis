"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { createJournalEntry } from "@/lib/finance/journaling";
import { resolveIsVendor } from "@/lib/domain/jo/assignment";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";

// ─── Utilities ───────────────────────────────────────────

export const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

export const getTransportTone = (label: string) => {
  if (label === "Vendor") return "bg-rose-50 text-rose-700 border-rose-200";
  if (label === "Internal") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

export const getGroupTone = (group: any) => {
  const pendingCount = group.costs.filter(
    (item: any) => item.status === "need_approval"
  ).length;
  const waitingDocCount = group.costs.filter(
    (item: any) => item.status === "sbu_processing"
  ).length;

  if (group.isApSettled) {
    return {
      label: "Settled",
      badgeClass: "bg-slate-900 text-white border-slate-950",
      icon: CheckCircle2,
      iconClass: "text-slate-900",
      borderClass: "border-slate-200",
      summaryTone: "bg-slate-100 text-slate-800",
    };
  }

  if (waitingDocCount > 0) {
    return {
      label: "Waiting SBU",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      icon: FileText,
      iconClass: "text-slate-700",
      borderClass: "border-slate-200",
      summaryTone: "bg-slate-50 text-slate-700",
    };
  }

  if (pendingCount > 0) {
    return {
      label: `Needs Review (${pendingCount})`,
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      icon: AlertCircle,
      iconClass: "text-amber-600",
      borderClass: "border-amber-200",
      summaryTone: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Ready to Pay",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
    borderClass: "border-emerald-200",
    summaryTone: "bg-emerald-50 text-emerald-700",
  };
};

export const resolveTransportLabel = (joList: any[]) => {
  const hasVendor = joList.some((jg: any) => jg.margin?.isVendor === true);
  const hasInternal = joList.some((jg: any) => jg.margin?.isVendor === false);
  if (hasVendor && hasInternal) return "Mixed";
  if (hasVendor) return "Vendor";
  if (hasInternal) return "Internal";
  return "Unknown";
};

// ─── Hook ────────────────────────────────────────────────

export function useCostAuditData() {
  const { profile } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("new_request");
  
  // [AI] SBU filter state synced with URL
  const searchParams = useSearchParams();
  const [sbuFilter, setSbuFilter] = useState(searchParams.get("sbu") || "all");

  useEffect(() => {
    const sbu = searchParams.get("sbu");
    if (sbu) setSbuFilter(sbu);
  }, [searchParams]);

  const handleSbuFilterChange = (value: string) => {
    setSbuFilter(value);
    const url = new URL(window.location.href);
    if (value === "all") {
      url.searchParams.delete("sbu");
    } else {
      url.searchParams.set("sbu", value);
    }
    window.history.replaceState({}, "", url.toString());
  };

  const [selectedWoId, setSelectedWoId] = useState<string | null>(null);
  const [paymentMap, setPaymentMap] = useState<Record<string, any[]>>({});

  // ─── Fetch ──────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: tenantJos, error: joIdError } = await supabase
        .from("job_orders")
        .select("id")
        .eq("tenant_id", profile?.tenant_id);

      if (joIdError) throw joIdError;
      const tenantJoIds = tenantJos.map((j) => j.id);

      if (tenantJoIds.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const { data: costs, error: costsError } = await supabase
        .from("extra_costs")
        .select("*")
        .neq("status", "draft")
        .in("jo_id", tenantJoIds)
        .order("created_at", { ascending: false });

      if (costsError) throw costsError;

      // [AI] Fetch job_order_payments for payment status tracking
      const { data: paymentsData } = await supabase
        .from("job_order_payments")
        .select("*")
        .in("job_order_id", tenantJoIds)
        .order("paid_at", { ascending: false });

      const paymentsByJo: Record<string, any[]> = {};
      for (const p of paymentsData || []) {
        if (!paymentsByJo[p.job_order_id]) paymentsByJo[p.job_order_id] = [];
        paymentsByJo[p.job_order_id].push(p);
      }

      // [AI] Added driver_share_percentage, driver_id, fleet_id, transporter_id for internal/transporter model checks
      const joSelectQuery = `
          id, jo_number, sbu_type, base_price, purchase_price, driver_phone, pod_status, status, created_at,
          driver_share_percentage, driver_id, fleet_id, transporter_id,
          advance_amount, driver_payment_amount,
          is_doc_finished, is_cost_finished, pod_photo_url, advance_receipt_url, transfer_proof_url,
          md_drivers:driver_id(id, name, phone),
          md_fleets:fleet_id(id, plate_number, fleet_type:md_fleet_types!fleet_type_id(type_name)),
          md_transporters:transporter_id(id, tenant_id, name, is_own, vendor_type),
          wo_item:wo_items(
            id, unit_price, total_revenue, item_data, sbu_type,
            wo:work_orders(
              id, wo_number,
              customer:md_entities!customer_id(name, legal_name, billing_method, phone)
            )
          )
        `;

      const costJoIds = Array.from(new Set(costs.map((c) => c.jo_id).filter(Boolean)));
      const { data: josByStatus, error: josError } = await supabase
        .from("job_orders")
        .select(joSelectQuery)
        .eq("tenant_id", profile?.tenant_id)
        .in("status", [
          "pekerjaan selesai",
          "PEKERJAAN SELESAI",
          "completed",
          "COMPLETED",
          "done",
          "DONE",
          "awaiting_audit",
          "AWAITING_AUDIT",
          "ready_for_billing",
          "READY_FOR_BILLING",
          "invoiced",
          "INVOICED",
          "paid",
          "PAID",
        ]);

      if (josError) throw josError;
      let jos = [...(josByStatus || [])];

      const existingJoIds = new Set(jos.map((j) => j.id));
      const missingJoIds = costJoIds.filter((id) => !existingJoIds.has(id));
      if (missingJoIds.length > 0) {
        const { data: josByCost } = await supabase
          .from("job_orders")
          .select(joSelectQuery)
          .in("id", missingJoIds);
        if (josByCost && josByCost.length > 0) {
          jos = [...jos, ...josByCost];
        }
      }

      const normalizedJos = (jos || []).map((jo) => {
        const woItem = Array.isArray(jo.wo_item) ? jo.wo_item[0] : jo.wo_item;
        const wo = woItem
          ? Array.isArray(woItem.wo)
            ? woItem.wo[0]
            : woItem.wo
          : null;
        const fallbackWo = wo || {
          id: `standalone-${jo.id}`,
          wo_number: jo.jo_number || "Direct JO",
          customer: { name: "Direct / Non-WO Customer", legal_name: "Direct / Non-WO Customer" },
        };
        const fallbackWoItem = woItem || {
          id: `item-${jo.id}`,
          unit_price: jo.base_price || 0,
          total_revenue: jo.base_price || 0,
          sbu_type: jo.sbu_type || "TRUCKING",
          wo: fallbackWo,
        };
        return { ...jo, wo_item: fallbackWoItem };
      });

      const seen = new Set();
      const hydratedCosts = costs
        .filter((c) => Number(c.amount) > 0 && c.cost_type)
        .filter((c) => {
          const key = `${c.jo_id}-${c.cost_type}-${c.amount}-${c.created_at}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((cost) => ({
          ...cost,
          billing_proof_url: cost.description?.startsWith("http")
            ? cost.description
            : null,
          job_orders: normalizedJos.find((j) => j.id === cost.jo_id) || null,
          vendor_id: cost.vendor_id || null,
          wo_id: cost.wo_id || null,
        }));

      // [AI] Add dummy costs for SBU processing visibility
      const COMPLETED_STATUSES = [
        "PEKERJAAN SELESAI",
        "COMPLETED",
        "DONE",
      ];
      const sbuProcessingJos = normalizedJos.filter(
        (jo) =>
          COMPLETED_STATUSES.includes(jo.status?.toUpperCase() || "") &&
          (!jo.is_doc_finished || !jo.is_cost_finished)
      );

      const sbuDummies = sbuProcessingJos.map((jo) => ({
        id: `dummy-${jo.id}`,
        jo_id: jo.id,
        status: "sbu_processing",
        amount: 0,
        cost_type: "PENDING_SBU_SUBMISSION",
        name: "Waiting for SBU to finalize Doc & Cost",
        description: "Waiting for SBU to finalize Doc & Cost",
        charge_type: "PENDING",
        created_at: jo.created_at,
        billing_proof_url: null,
        job_orders: jo,
      }));

      // [AI] Add dummy costs for jobs awaiting audit but have no extra costs
      const auditJos = normalizedJos.filter(
        (jo) =>
          ["AWAITING_AUDIT", "READY_FOR_BILLING", "READY_TO_PAY"].includes(
            jo.status?.toUpperCase() || ""
          ) &&
          jo.is_doc_finished &&
          jo.is_cost_finished &&
          !hydratedCosts.some((c) => c.jo_id === jo.id)
      );

      const auditDummies = auditJos.map((jo) => ({
        id: `audit-${jo.id}`,
        jo_id: jo.id,
        status:
          jo.status?.toUpperCase() === "AWAITING_AUDIT"
            ? "need_approval"
            : "approved",
        amount: 0,
        cost_type: "BASE_COST_AUDIT",
        name: "Document & Base Cost Audit",
        description: "Document & Base Cost Audit",
        charge_type: "BASE AUDIT",
        created_at: jo.created_at,
        billing_proof_url: null,
        job_orders: jo,
      }));

      setPaymentMap(paymentsByJo);
      setData([...hydratedCosts, ...sbuDummies, ...auditDummies]);
    } catch (err: any) {
      toast.error("Gagal mengambil data: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchData();
    }
  }, [fetchData, profile?.tenant_id]);

  // ─── Grouping + Margin Calc ─────────────────────────────

  // [AI] Pre-compute all groups without status filter for tab counts
  const allGroups = useMemo(() => {
    const groups: Record<string, any> = {};
    data.forEach((item) => {
      const wo = item.job_orders?.wo_item?.wo;
      if (!wo) return;
      const woId = wo.id;

      if (!groups[woId]) {
        groups[woId] = { wo, costs: [], wo_id: woId, jo_map: {} };
      }
      groups[woId].costs.push(item);

      if (!groups[woId].jo_map[item.jo_id]) {
        groups[woId].jo_map[item.jo_id] = { jo: item.job_orders, costs: [] };
      }
      groups[woId].jo_map[item.jo_id].costs.push(item);
    });

    return Object.values(groups).map((group: any) => {
      let totalRevenue = 0;
      let totalCogs = 0;
      let totalApprovedSurcharges = 0;
      let totalDriverShareAmount = 0;
      let totalApprovedExtraCosts = 0;
      let totalDriverSharePct = 0;

      let totalTarget = 0;
      let totalPaid = 0;

      const joList = Object.values(group.jo_map) as any[];

      const vendorBreakdown = new Map<
        string,
        {
          vendor_id: string | null;
          bucket: string;
          total_amount: number;
          approved_amount: number;
          pending_count: number;
          approved_count: number;
        }
      >();

      group.costs.forEach((item: any) => {
        const key = item.vendor_id || "internal";
        const current = vendorBreakdown.get(key) || {
          vendor_id: item.vendor_id || null,
          bucket: item.vendor_id ? "Vendor AP" : "Internal",
          total_amount: 0,
          approved_amount: 0,
          pending_count: 0,
          approved_count: 0,
        };
        current.total_amount += Number(item.amount || 0);
        if (item.status === "approved") {
          current.approved_amount += Number(item.amount || 0);
          current.approved_count += 1;
        }
        if (item.status === "need_approval") {
          current.pending_count += 1;
        }
        vendorBreakdown.set(key, current);
      });

      joList.forEach((joGroup: any) => {
        const unitPrice = Number(joGroup.jo?.wo_item?.unit_price || 0);
        const basePrice = Number(joGroup.jo?.base_price || 0);
        const dealPrice = Number(
          joGroup.jo?.wo_item?.item_data?.deal_price || 0
        );
        const effectiveRevenue =
          unitPrice > 0 ? unitPrice : basePrice > 0 ? basePrice : dealPrice;

        const approvedSurcharges = joGroup.costs.reduce(
          (sum: number, c: any) =>
            sum +
            (c.status === "approved" && c.charge_type === "surcharge"
              ? Number(c.amount)
              : 0),
          0
        );
        const joRevenue = effectiveRevenue + approvedSurcharges;

        // [AI] Use hydrated transporter info for vendor/internal detection
        const transporter = joGroup.jo?.md_transporters;
        const isInternalByTenant =
          transporter?.tenant_id === profile?.tenant_id;
        const isInternalByType =
          transporter?.is_own === true ||
          (typeof transporter?.transporter_type === "string" &&
            ["OWN", "INTERNAL"].includes(
              transporter.transporter_type.toUpperCase()
            ));

        const isVendor = resolveIsVendor(
          transporter
            ? {
                id: transporter.id,
                name: transporter.name,
                is_vendor:
                  transporter?.is_own === false &&
                  transporter?.vendor_type !== "OWN" &&
                  transporter?.vendor_type !== "INTERNAL",
                is_own: isInternalByTenant || isInternalByType,
              }
            : undefined,
          undefined
        );

        const purchasePrice = Number(joGroup.jo?.purchase_price || 0);
        const driverSharePct = Number(
          joGroup.jo?.driver_share_percentage ?? 0
        );
        const driverShareAmount = isVendor
          ? 0
          : effectiveRevenue * (driverSharePct / 100);

        const approvedExtraCosts = joGroup.costs.reduce(
          (sum: number, c: any) =>
            sum +
            ((c.status === "approved" || c.status === "rejected_as_cogs") &&
            (c.paid_by_sbu || c.charge_type === "reimbursement")
              ? Number(c.amount)
              : 0),
          0
        );

        const joCogs =
          (isVendor ? purchasePrice : driverShareAmount) + approvedExtraCosts;

        totalRevenue += joRevenue;
        totalCogs += joCogs;
        totalApprovedSurcharges += approvedSurcharges;
        totalDriverShareAmount += driverShareAmount;
        totalApprovedExtraCosts += approvedExtraCosts;
        totalDriverSharePct += driverSharePct;

        // Calculate dynamic payment targets matching the fallback used in the payment panel
        const advanceTarget = Number(joGroup.jo?.advance_amount || 0);
        const purchaseTarget = Number(joGroup.jo?.purchase_price || 0);
        const pelunasanTarget = joGroup.jo?.driver_payment_amount && Number(joGroup.jo.driver_payment_amount) > 0
          ? Number(joGroup.jo.driver_payment_amount)
          : (driverShareAmount - advanceTarget);

        const joTarget = advanceTarget + (isVendor ? purchaseTarget : 0) + (isVendor ? 0 : pelunasanTarget);

        let joPaid = 0;
        const joPayments = joGroup.jo?.id ? paymentMap[joGroup.jo.id] || [] : [];
        for (const payment of joPayments) {
          joPaid += Number(payment.amount);
        }

        totalTarget += joTarget;
        totalPaid += joPaid;

        const isJoSettled = joTarget > 0 && joPaid >= joTarget;

        joGroup.isJoSettled = isJoSettled;

        joGroup.margin = {
          revenue: joRevenue,
          cogs: joCogs,
          driverShareAmount,
          approvedExtraCosts,
          driverSharePct,
          isVendor,
          purchasePrice,
        };
      });

      const grossMargin = totalRevenue - totalCogs;
      const marginPercent =
        totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

      // [AI] bug fix: compute average driverSharePct at WO level
      const avgDriverSharePct =
        joList.length > 0 ? totalDriverSharePct / joList.length : 0;

      const hasPendingOrProcessing = group.costs.some((c: any) => c.status === "need_approval" || c.status === "sbu_processing");
      const isApSettled = totalTarget > 0 && totalPaid >= totalTarget && !hasPendingOrProcessing;

      group.jo_list = joList;
      group.vendor_breakdown = Array.from(vendorBreakdown.values()).sort(
        (a, b) => b.total_amount - a.total_amount
      );

      return {
        ...group,
        isApSettled,
        totalTarget,
        totalPaid,
        margin: {
          revenue: totalRevenue,
          cogs: totalCogs,
          absolute: grossMargin,
          percent: marginPercent,
          driverShareAmount: totalDriverShareAmount,
          driverSharePct: avgDriverSharePct,
          approvedExtraCosts: totalApprovedExtraCosts,
        },
      };
    });
  }, [data, profile?.tenant_id, paymentMap]);

  // [AI] Helper to extract SBU types for a group (from its jobs)
  const getGroupSbuTypes = useCallback((group: any) => {
    const types = new Set<string>();
    group.jo_list?.forEach((joGroup: any) => {
      const sbu = joGroup.jo?.sbu_type || joGroup.jo?.wo_item?.sbu_type;
      if (sbu) types.add(sbu.toUpperCase());
    });
    return Array.from(types);
  }, []);

  // [AI] Memoized tab counts — computed once per data change, no repeated grouping
  const tabCounts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const searched = allGroups.filter((g: any) => {
      const matchesSearch =
        !term ||
        g.wo?.wo_number?.toLowerCase().includes(term) ||
        g.wo?.customer?.name?.toLowerCase().includes(term);

      let matchesSbu = true;
      if (sbuFilter !== "all") {
        matchesSbu = getGroupSbuTypes(g).includes(sbuFilter);
      }

      return matchesSearch && matchesSbu;
    });

    return {
      all: searched.length,
      sbu_processing: searched.filter((g: any) =>
        !g.isApSettled && g.costs.some((c: any) => c.status === "sbu_processing")
      ).length,
      new_request: searched.filter((g: any) =>
        !g.isApSettled && g.costs.some((c: any) => c.status === "need_approval")
      ).length,
      audit_done: searched.filter(
        (g: any) =>
          !g.isApSettled &&
          !g.costs.some(
            (c: any) =>
              c.status === "need_approval" || c.status === "sbu_processing"
          )
      ).length,
      paid: searched.filter((g: any) => g.isApSettled).length,
    };
  }, [allGroups, searchTerm]);

  // [AI] Filtered + sorted list based on active status filter + search
  const groupedData = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return allGroups
      .filter((group: any) => {
        const matchesSearch =
          !term ||
          group.wo?.wo_number?.toLowerCase().includes(term) ||
          group.wo?.customer?.name?.toLowerCase().includes(term);

        let matchesSbu = true;
        if (sbuFilter !== "all") {
          matchesSbu = getGroupSbuTypes(group).includes(sbuFilter);
        }

        let matchesStatus = false;
        if (statusFilter === "all") matchesStatus = true;
        else if (statusFilter === "sbu_processing")
          matchesStatus = !group.isApSettled && group.costs.some(
            (c: any) => c.status === "sbu_processing"
          );
        else if (statusFilter === "new_request")
          matchesStatus = group.costs.some(
            (c: any) => c.status === "need_approval"
          );
        else if (statusFilter === "audit_done")
          matchesStatus =
            !group.isApSettled &&
            !group.costs.some(
              (c: any) =>
                c.status === "need_approval" || c.status === "sbu_processing"
            );
        else if (statusFilter === "paid")
          matchesStatus = group.isApSettled;

        return matchesSearch && matchesStatus && matchesSbu;
      })
      .sort((a: any, b: any) => {
        const aNeeds = a.costs.some(
          (c: any) => c.status === "need_approval"
        );
        const bNeeds = b.costs.some(
          (c: any) => c.status === "need_approval"
        );
        if (aNeeds && !bNeeds) return -1;
        if (!aNeeds && bNeeds) return 1;
        return 0;
      });
  }, [allGroups, searchTerm, statusFilter]);

  // ─── Stats ──────────────────────────────────────────────

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalMissions = 0;
    let totalItems = 0;
    let totalPendingReview = 0;
    let totalPodReady = 0;

    groupedData.forEach((g) => {
      totalRevenue += Number(g.margin?.revenue || 0);
      totalCogs += Number(g.margin?.cogs || 0);
      totalMissions += g.jo_list?.length || 0;
      totalItems += g.costs?.length || 0;

      totalPendingReview += g.costs?.filter(
        (c: any) => c.status === "need_approval"
      ).length || 0;

      totalPodReady += g.jo_list?.filter(
        (j: any) => j.jo?.pod_status === "received_hq"
      ).length || 0;
    });

    const totalAbsoluteMargin = totalRevenue - totalCogs;

    return {
      pending: totalPendingReview,
      totalItems,
      totalApproved: data
        .filter((d) => d.status === "approved")
        .reduce((sum, d) => sum + Number(d.amount), 0),
      podReady: totalPodReady,
      total: totalMissions,
      totalRevenue,
      totalAbsoluteMargin,
    };
  }, [groupedData, data]);

  const avgMargin = useMemo(() => {
    if (stats.totalRevenue > 0) {
      return ((stats.totalAbsoluteMargin / stats.totalRevenue) * 100).toFixed(1);
    }
    return "0.0";
  }, [stats.totalRevenue, stats.totalAbsoluteMargin]);

  const selectedWo = selectedWoId
    ? groupedData.find((g) => g.wo_id === selectedWoId)
    : null;

  // ─── Actions ────────────────────────────────────────────

  const handleAction = useCallback(
    async (itemId: string, newStatus: "approved" | "rejected") => {
      try {
        const item = data.find((d) => d.id === itemId);
        if (!item) return;

        if (itemId.startsWith("audit-")) {
          if (newStatus === "approved") {
            const { error } = await supabase
              .from("job_orders")
              .update({ status: "ready_for_billing" })
              .eq("id", item.jo_id);
            if (error) throw error;
            toast.success("Audit Dokumen & Base Cost disetujui");
            fetchData();
          } else {
            toast.error("Audit dasar tidak dapat di-reject di sini");
          }
          return;
        }

        if (itemId.startsWith("dummy-")) {
          toast.error("Masih menunggu pemrosesan dari SBU");
          return;
        }

        let finalStatus: any = newStatus;
        let isBillable = newStatus === "approved";
        let paidBySbu = false;

        if (newStatus === "rejected") {
          const confirmPaid = window.confirm(
            "Apakah biaya ini SUDAH DIBAYAR?\n\nOK = Sudah Bayar (Masuk COGS)\nCancel = Belum Bayar (Reject Murni)"
          );
          if (confirmPaid) {
            finalStatus = "rejected_as_cogs";
            paidBySbu = true;
            isBillable = false;
          }
        }

        const { error } = await supabase
          .from("extra_costs")
          .update({
            status: finalStatus,
            is_billable: isBillable,
            paid_by_sbu: paidBySbu,
            decided_at: new Date().toISOString(),
          })
          .eq("id", itemId);

        if (error) throw error;

        if (isBillable || paidBySbu) {
          await createJournalEntry({
            jobOrderId: item.jo_id,
            amount: item.amount,
            description: `${isBillable ? "Approved" : "Rejected (COGS)"} Add Cost ${item.cost_type}: ${item.job_orders?.jo_number}`,
            sourceType: (isBillable
              ? item.charge_type === "surcharge"
                ? "surcharge"
                : "reimbursement"
              : "cogs_adjustment") as any,
            metadata: {
              jo_id: item.jo_id,
              customer: item.job_orders?.wo_item?.wo?.customer?.name,
            },
          });
        }

        toast.success(`Biaya diproses sebagai ${finalStatus.toUpperCase()}`);
        fetchData();
      } catch (err) {
        toast.error("Gagal memproses data audit");
      }
    },
    [data, fetchData]
  );

  // [AI] bug fix: bulk approve now creates journal entries per item
  const handleBulkApprove = useCallback(
    async (pendingCosts: any[]) => {
      try {
        for (const c of pendingCosts) {
          if (c.id.startsWith("audit-")) {
            await supabase
              .from("job_orders")
              .update({ status: "ready_for_billing" })
              .eq("id", c.jo_id);
            continue;
          }
          if (c.id.startsWith("dummy-")) continue;

          await supabase
            .from("extra_costs")
            .update({
              status: "approved",
              is_billable: true,
              decided_at: new Date().toISOString(),
            })
            .eq("id", c.id);

          // [AI] Create journal entry for each approved item
          if (Number(c.amount) > 0) {
            await createJournalEntry({
              jobOrderId: c.jo_id,
              amount: c.amount,
              description: `Approved (Bulk) Add Cost ${c.cost_type}: ${c.job_orders?.jo_number || ""}`,
              sourceType: (c.charge_type === "surcharge"
                ? "surcharge"
                : "reimbursement") as any,
              metadata: {
                jo_id: c.jo_id,
                customer: c.job_orders?.wo_item?.wo?.customer?.name,
              },
            });
          }
        }
        toast.success("Semua item di-approve secara massal");
        fetchData();
      } catch (err) {
        toast.error("Gagal bulk approve");
      }
    },
    [fetchData]
  );

  const handleFinalizeAudit = useCallback(
    async (joList: any[]) => {
      try {
        const results = await Promise.all(
          joList.map((jo: any) =>
            supabase
              .from("job_orders")
              .update({ status: "ready_for_billing" })
              .eq("id", jo.jo.id)
          )
        );
        const hasError = results.some((r) => r.error);
        if (hasError) throw new Error("Gagal memperbarui status");
        toast.success("Audit Selesai. Job Order siap untuk Invoicing.");
        setSelectedWoId(null);
        fetchData();
      } catch (err) {
        toast.error("Gagal memperbarui status");
      }
    },
    [fetchData]
  );

  return {
    profile,
    loading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sbuFilter,
    handleSbuFilterChange,
    selectedWoId,
    setSelectedWoId,
    groupedData,
    selectedWo,
    paymentMap,
    stats,
    tabCounts,
    avgMargin,
    fetchData,
    handleAction,
    handleBulkApprove,
    handleFinalizeAudit,
  };
}

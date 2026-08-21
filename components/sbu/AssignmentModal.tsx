"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Truck,
  User,
  MapPin,
  DollarSign,
  MessageCircle,
  Loader2,
  ShieldCheck,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/hooks/useAuth";
import { mapTransportersForTenant } from "@/lib/domain/jo/assignment";
import { displayCode } from "@/lib/domain/tenant/displayCode";
import { toast } from "react-hot-toast";

interface AssignmentModalProps {
  woItemId: string;
  woNumber: string;
  customerName: string;
  executionDate: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignmentModal({
  woItemId,
  woNumber,
  customerName,
  executionDate,
  onClose,
  onSuccess,
}: AssignmentModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Data States
  const [dealPrice, setDealPrice] = useState(0);
  const [unitCount, setUnitCount] = useState(1);
  const [vehicleType, setVehicleType] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [assignedCount, setAssignedCount] = useState(0);

  // Form States
  const [vendors, setVendors] = useState<any[]>([]);
  const [fleets, setFleets] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [tenantCodeMap, setTenantCodeMap] = useState<Record<string, string>>({});

  const [selectedTransporterId, setSelectedTransporterId] = useState("");
  const [selectedTransporterType, setSelectedTransporterType] = useState<
    "OWN" | "VENDOR" | ""
  >("");
  const [selectedFleetId, setSelectedFleetId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [purchasePrice, setPurchasePrice] = useState<string>("");
  const [driverShare, setDriverShare] = useState<string>("40");

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  useEffect(() => {
    const initModal = async () => {
      try {
        setFetching(true);

        // 1. Fetch WO Item Data from item_data
        const { data: item, error: itemError } = await supabase
          .from("wo_items")
          .select("id, item_code, sbu_type, item_data, status")
          .eq("id", woItemId)
          .single();

        if (itemError) throw itemError;

        if (item) {
          const itemData = (item as any).item_data || {};
          // AMBIL deal_price dari item_data sesuai instruksi
          setDealPrice(Number(itemData.deal_price) || 0);
          setUnitCount(Number(itemData.unit_count) || 1);
          setVehicleType(itemData.vehicle_type_name || "-");
          setOrigin(
            itemData.origin_name || itemData.origin_location_name || "-",
          );
          setDestination(
            itemData.destination_name ||
              itemData.destination_location_name ||
              "-",
          );
        }

        // 2. Fetch Assigned Count
        const { count, error: countError } = await supabase
          .from("job_orders")
          .select("*", { count: "exact", head: true })
          .eq("wo_item_id", woItemId)
          .not("status", "eq", "cancelled");

        if (countError) throw countError;
        setAssignedCount(count || 0);

        // 3. Fetch Transporters (Vendors + Own)
        if (!profile?.tenant_id) return;
        const { data: entityData, error: entityError } = await (supabase
          .from("md_entities" as any) as any)
          .select("id, name, is_vendor, is_customer, vendor_type, category")
          .eq("tenant_id", profile.tenant_id)
          .eq("is_active", true);

        if (entityError) {
          console.error("Error fetching entities:", {
            code: entityError.code,
            message: entityError.message,
            details: entityError.details,
            hint: entityError.hint,
          });
        }

        const tenantName = (profile?.tenants?.name || "").toUpperCase();
        const tenantCode = (profile?.tenant_code || "").toUpperCase();

        const trans = mapTransportersForTenant(
          (entityData as any[]) || [],
          tenantName,
          tenantCode,
        );

        setVendors(trans);
      } catch (err: any) {
        toast.error("Gagal memuat data: " + err.message);
      } finally {
        setFetching(false);
      }
    };

    initModal();
  }, [woItemId]);

  const handleTransporterChange = async (val: string) => {
    setSelectedTransporterId(val);
    setSelectedFleetId("");
    setSelectedDriverId("");
    setDriverPhone("");

    if (!val) {
      setSelectedTransporterType("");
      setFleets([]);
      setDrivers([]);
      return;
    }

    const isOwn = val === "own";
    setSelectedTransporterType(isOwn ? "OWN" : "VENDOR");

    try {
      // Fetch Fleets based on transporter
      if (!profile?.tenant_id) return;

      let fleetQuery = (supabase
        .from("md_fleets" as any) as any)
        .select(
          `
        id, 
        plate_number, 
        brand,
        vendor_tenant_id,
        md_fleet_types (type_name)
      `,
        )
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true);

      if (isOwn) {
        // For internal, we want those with entity_id null OR the specific ID of the internal entity
        const internalId = vendors.find((v) => v.is_own)?.id;
        if (internalId) {
          fleetQuery = fleetQuery.or(
            `entity_id.is.null,entity_id.eq.${internalId}`,
          );
        } else {
          fleetQuery = fleetQuery.is("entity_id", null);
        }
      } else {
        fleetQuery = fleetQuery.eq("entity_id", val);
      }
      const { data: fleetData, error: fError } = await fleetQuery;
      if (fError)
        console.error("Error fetching fleets:", {
          code: fError.code,
          message: fError.message,
          details: fError.details,
          hint: fError.hint,
        });
      setFleets((fleetData as any[]) || []);

      // Fetch Drivers
      let driverQuery = (supabase
        .from("md_drivers" as any) as any)
        .select("id, name, phone, md_entities(vendor_tenant_id)")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true);

      if (isOwn) {
        const internalId = vendors.find((v) => v.is_own)?.id;
        if (internalId) {
          driverQuery = driverQuery.or(
            `entity_id.is.null,entity_id.eq.${internalId}`,
          );
        } else {
          driverQuery = driverQuery.is("entity_id", null);
        }
      } else {
        driverQuery = driverQuery.eq("entity_id", val);
      }
      const { data: driverData, error: dError } = await driverQuery;
      if (dError)
        console.error("Error fetching drivers:", {
          code: dError.code,
          message: dError.message,
          details: dError.details,
          hint: dError.hint,
        });
      setDrivers((driverData as any[]) || []);

      const vendorTenantIds = new Set<string>();
      for (const f of (fleetData as any[]) || []) {
        if (f.vendor_tenant_id) vendorTenantIds.add(f.vendor_tenant_id);
      }
      for (const d of (driverData as any[]) || []) {
        if (d.md_entities?.vendor_tenant_id)
          vendorTenantIds.add(d.md_entities.vendor_tenant_id);
      }
      if (vendorTenantIds.size > 0) {
        const { data: tenantRows } = await supabase
          .from("tenants")
          .select("id, tenant_code")
          .in("id", [...vendorTenantIds]);
        const map: Record<string, string> = {};
        for (const t of tenantRows || []) map[t.id] = t.tenant_code || "";
        setTenantCodeMap(map);
      }
    } catch (err: any) {
      console.error("Assignment Fetch Error:", err);
      toast.error("Gagal mengambil data armada/driver");
    }
  };

  const handleFleetChange = (val: string) => {
    setSelectedFleetId(val);
  };

  const handleDriverChange = (val: string) => {
    setSelectedDriverId(val);
    const driver = drivers.find((d) => d.id === val);
    if (driver) {
      setDriverPhone(driver.phone || "");
    }
  };

  const handleAssign = async () => {
    if (!selectedFleetId || !selectedDriverId || !driverPhone) {
      toast.error("Mohon lengkapi data armada dan driver");
      return;
    }

    setLoading(true);
    try {
      // 1. Create Job Order
      const { data: jo, error: joError } = await supabase
        .from("job_orders")
        .insert({
          wo_item_id: woItemId,
          jo_number: `${woNumber}-${String(assignedCount + 1).padStart(2, "0")}`,
          transporter_id:
            selectedTransporterId === "own" ? undefined : selectedTransporterId,
          fleet_id: selectedFleetId,
          driver_id: selectedDriverId,
          driver_phone: driverPhone,
          purchase_price: Number(purchasePrice) || 0,
          base_price: dealPrice,
          driver_share_percentage:
            selectedTransporterId === "own" ? Number(driverShare) : 0,
          status: "pending",
          tracking_token: crypto.randomUUID(),
          driver_link_token: Math.random().toString(36).substring(2, 15),
        } as any)
        .select()
        .single();

      if (joError) throw joError;

      // 2. Update wo_item status to in_progress if it was pending
      await supabase
        .from("wo_items")
        .update({ status: "in_progress" })
        .eq("id", woItemId)
        .eq("status", "pending");

      toast.success("Assignment berhasil disimpan!");
      onSuccess();
    } catch (err: any) {
      toast.error("Gagal menyimpan assignment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-600 animate-pulse uppercase tracking-widest">
            Memuat Console...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">
              Assignment Console
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
              {assignedCount} Assigned{" "}
              <span className="text-slate-200 mx-1">/</span>{" "}
              <span className="text-rose-500">
                {unitCount - assignedCount} Remaining
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Informasi WO */}
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  WO Number
                </p>
                <p className="font-black text-sm text-slate-900 italic">
                  {woNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Units Needed
                </p>
                <p className="font-black text-sm text-blue-600 italic">
                  {unitCount} Fleet{unitCount > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 italic">
                <MapPin size={14} className="text-emerald-500" />
                <span>
                  {origin} <span className="text-slate-300 mx-1">→</span>{" "}
                  {destination}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 italic">
                <Truck size={14} className="text-blue-500" />
                <span>Requirement: {vehicleType}</span>
              </div>
            </div>
          </div>

          {/* Customer & Schedule */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Customer
                </p>
                <p className="font-black text-sm text-slate-900 uppercase italic">
                  {customerName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Execution
                </p>
                <div className="flex items-center gap-2 justify-end">
                  <Calendar size={14} className="text-rose-500" />
                  <p className="text-sm font-black text-rose-600 italic">
                    {formatDate(executionDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* HARGA DEAL */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:rotate-12 transition-transform">
              <DollarSign size={80} className="text-emerald-900" />
            </div>
            <p className="text-[9px] text-emerald-600 font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
              <DollarSign size={12} /> Harga Jual (DEALS)
            </p>
            <div className="flex items-baseline justify-between mt-1 relative z-10">
              <span className="text-3xl font-black text-emerald-700 italic tracking-tighter">
                {formatRupiah(dealPrice)}
              </span>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                per unit
              </span>
            </div>
            {unitCount > 1 && (
              <p className="text-[10px] font-black text-emerald-600/60 mt-2 uppercase tracking-widest border-t border-emerald-200/50 pt-2">
                Total Revenue: {formatRupiah(dealPrice * unitCount)}
              </p>
            )}
          </div>

          {/* Form Assignment */}
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                TRANSPORTER / VENDOR *
              </label>
              <select
                value={selectedTransporterId}
                onChange={(e) => handleTransporterChange(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black italic focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
              >
                <option value="" className="not-italic">
                  Pilih Transporter
                </option>
                <option
                  value="own"
                  className="not-italic font-bold text-blue-600"
                >
                  (OWN) INTERNAL HQ
                </option>
                {vendors
                  .filter((v) => v.is_vendor)
                  .map((v) => (
                    <option key={v.id} value={v.id} className="not-italic">
                      PT {v.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  FLEET / ARMADA *
                </label>
                <select
                  value={selectedFleetId}
                  onChange={(e) => handleFleetChange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black italic focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none disabled:opacity-50"
                  disabled={!selectedTransporterId}
                >
                  <option value="" className="not-italic">
                    Pilih Armada
                  </option>
                  {fleets.map((f) => (
                    <option key={f.id} value={f.id} className="not-italic">
                      {displayCode(
                        f.plate_number,
                        f.vendor_tenant_id,
                        profile?.tenant_id,
                        tenantCodeMap,
                      )}{" "}
                      {f.md_fleet_types?.type_name
                        ? `- ${f.md_fleet_types.type_name}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  DRIVER / SOPIR *
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => handleDriverChange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black italic focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none disabled:opacity-50"
                  disabled={!selectedTransporterId}
                >
                  <option value="" className="not-italic">
                    Pilih Driver
                  </option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id} className="not-italic">
                      {displayCode(
                        d.name,
                        d.md_entities?.vendor_tenant_id,
                        profile?.tenant_id,
                        tenantCodeMap,
                      )}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                WHATSAPP CONTACT
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <MessageCircle size={16} className="text-emerald-500" />
                </div>
                <input
                  type="tel"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="6281234567890"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                />
              </div>
              <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest italic ml-1">
                Link tracking akan dikirim otomatis ke nomor ini.
              </p>
            </div>
          </div>

          {/* Purchase Price (hanya untuk VENDOR) */}
          {selectedTransporterType === "VENDOR" && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-300">
              <p className="text-[9px] text-amber-700 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <DollarSign size={12} /> Harga Beli (Vendor Agreement)
              </p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">
                  Rp
                </span>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-amber-200 rounded-2xl text-sm font-black focus:ring-4 focus:ring-amber-500/10 transition-all outline-none"
                  placeholder="0"
                />
              </div>
              {Number(purchasePrice) > 0 && dealPrice > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center pt-3 border-t border-amber-200/50">
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                      Estimasi Margin
                    </span>
                    <span
                      className={`text-sm font-black italic ${dealPrice - Number(purchasePrice) < 500000 ? "text-rose-600" : "text-emerald-600"}`}
                    >
                      {formatRupiah(dealPrice - Number(purchasePrice))}
                    </span>
                  </div>
                  {dealPrice - Number(purchasePrice) < 500000 && (
                    <div className="flex items-center gap-2 p-3 bg-rose-100/50 rounded-xl border border-rose-200 animate-pulse">
                      <AlertTriangle size={14} className="text-rose-600" />
                      <p className="text-[9px] font-black text-rose-600 uppercase tracking-tight">
                        Margin Tipis! Harap negosiasi lebih lanjut.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Driver Share (hanya untuk OWN) */}
          {selectedTransporterType === "OWN" && (
            <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-300">
              <p className="text-[9px] text-blue-700 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <DollarSign size={12} /> Persentase Bagi Hasil Driver (%)
              </p>
              <div className="relative">
                <input
                  type="number"
                  value={driverShare}
                  onChange={(e) => setDriverShare(e.target.value)}
                  className="w-full pl-4 pr-11 py-3 bg-white border border-blue-200 rounded-2xl text-sm font-black focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                  placeholder="40"
                  max="100"
                  min="0"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">
                  %
                </span>
              </div>
              {Number(driverShare) > 0 && dealPrice > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center pt-3 border-t border-blue-200/50">
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                      Estimasi Cair ke Driver
                    </span>
                    <span className="text-sm font-black italic text-blue-600">
                      {formatRupiah(dealPrice * (Number(driverShare) / 100))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                      Estimasi Margin SBU
                    </span>
                    <span className="text-sm font-black italic text-emerald-600">
                      {formatRupiah(
                        dealPrice * ((100 - Number(driverShare)) / 100),
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tombol Aksi */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95 shadow-sm"
          >
            Batal
          </button>
          <button
            onClick={handleAssign}
            disabled={
              loading || !selectedFleetId || !selectedDriverId || !driverPhone
            }
            className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-900/20 disabled:opacity-50 disabled:grayscale"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              "ASSIGN & KIRIM WA"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

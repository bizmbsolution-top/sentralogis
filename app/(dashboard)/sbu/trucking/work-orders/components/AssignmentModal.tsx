"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "react-hot-toast";
import {
  Truck,
  Search,
  Filter,
  Loader2,
  MapPin,
  Calendar,
  Clock,
  ChevronRight,
  User,
  ClipboardList,
  AlertCircle,
  Activity,
  Package,
  CheckCircle,
  ArrowRight,
  AlertTriangle,
  Layers,
  ExternalLink,
  ShieldCheck,
  Box,
  Save,
  MessageCircle,
  X,
  Edit2,
  Plus,
  Trash2,
  GripVertical,
  FileText,
  DollarSign,
  Printer,
  Upload,
  FolderGit2,
  Eye,
  Download,
  Image as ImageIcon,
  Send,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { saveAssignmentsAction } from "@/lib/actions/assignmentActions";
import { computeDriverReadiness } from "@/lib/domain/driver/readiness";
import {
  type AssignmentSlot,
  type TransporterOption,
  buildInitialAssignmentSlots,
  computeMaxJoCount,
  getActiveAssetIdsFromJos,
  getRouteOriginDest,
  mapTransportersForTenant,
  matchDriverAllowance,
  parseItemData,
  resolveIsVendor,
  computeMargin,
  isEmptySlot,
} from "@/lib/domain/jo/assignment";
import { buildDriverAssignmentMessage, buildWaLink } from "@/lib/domain/phone";
import VendorSendBox from "@/components/sbu/VendorSendBox";
import GroundStaffSendBox from "@/components/sbu/GroundStaffSendBox";

interface AssignmentModalProps {
  item: any;
  onClose: () => void;
  onSuccess: () => void;
  onHandover?: () => void;
  onSbuHandover?: () => void;
}

export default function AssignmentModal({
  item,
  onClose,
  onSuccess,
  onHandover,
  onSbuHandover,
}: AssignmentModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [uploadingSlotIndex, setUploadingSlotIndex] = useState<number | null>(
    null,
  );
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [rejectingSlotIndex, setRejectingSlotIndex] = useState<number | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState<string>("truck_unavailable");
  const [rejectNote, setRejectNote] = useState<string>("");

  // Selection Data
  const [fleets, setFleets] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [transporters, setTransporters] = useState<TransporterOption[]>([]);
  const [transporterFleets, setTransporterFleets] = useState<any[]>([]);
  const [transporterDrivers, setTransporterDrivers] = useState<any[]>([]);
  const [driverReadiness, setDriverReadiness] = useState<
    Record<
      string,
      {
        ready: boolean;
        reason: string;
        hasAttendance: boolean;
        hasInspection: boolean;
        inspectionStatus: string;
      }
    >
  >({});
  const [driverAllowances, setDriverAllowances] = useState<any[]>([]);

  const [assignments, setAssignments] = useState<AssignmentSlot[]>([]);
  const [existingJOs, setExistingJOs] = useState<any[]>([]);
  const [coaList, setCoaList] = useState<any[]>([]);

  // Vendor reply manual input (from WhatsApp broadcast)
  const [replyVendorId, setReplyVendorId] = useState<string>("");
  const [replyQty, setReplyQty] = useState<number>(1);
  const [replyPrice, setReplyPrice] = useState<string>("");
  const [replySaving, setReplySaving] = useState(false);
  const [vendorSendOpen, setVendorSendOpen] = useState(false);
  const [groundStaffSendOpen, setGroundStaffSendOpen] = useState(false);

  const itemData = parseItemData(item?.item_data);
  const dealPrice = Number(itemData.deal_price) || 0;
  const unitCount = Number(itemData.unit_count) || 1;
  const isHandoverApproved = itemData.handover_approved === true;
  const maxJOCount = computeMaxJoCount(itemData);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.tenant_id) return;
      setLoading(true);

      try {
        const tenantId = profile?.tenant_id;

        // 1. Fetch existing Job Orders first - without tenant_id filter since it might block due to RLS
        console.log("[AssignmentModal] Fetching JOs for item:", item.id);

        // Use simpler query like parent page - don't filter by status to avoid RLS issues
        // Fetch JOs - try without select to get all fields
        const { data: jos, error: joError } = await supabase
          .from("job_orders")
          .select("*")
          .eq("wo_item_id", item.id)
          .order("jo_number", { ascending: true });

        console.log(
          "[AssignmentModal] Found JOs:",
          jos?.length,
          "error:",
          joError?.message,
          "errorDetail:",
          joError,
        );
        if (jos && jos.length > 0) {
          console.log(
            "[AssignmentModal] First JO fields:",
            Object.keys(jos[0]),
          );
          console.log("[AssignmentModal] First JO values:", {
            id: jos[0].id,
            driver_id: jos[0].driver_id,
            fleet_id: jos[0].fleet_id,
          });
        }

        if (joError) {
          console.error("[AssignmentModal] Error fetching JOs:", joError);
        }

        setExistingJOs(jos || []);

        const assignedFleetIds = (jos || [])
          .map((j) => j.fleet_id)
          .filter(Boolean);
        const assignedDriverIds = (jos || [])
          .map((j) => j.driver_id)
          .filter(Boolean);

        const {
          activeFleetIds: activeJobFleets,
          activeDriverIds: activeJobDrivers,
        } = getActiveAssetIdsFromJos(jos || []);

        // 2. Fetch available assets and transporters
        // [AI] Also fetch already-assigned fleets/drivers separately so they always appear in dropdowns
        // even if their status is on_road/is_working=true (they were assigned by this WO item)
        console.log("[AssignmentModal] Fetching assets. tenantId:", tenantId);
        console.log("[AssignmentModal] assignedFleetIds:", assignedFleetIds);
        console.log("[AssignmentModal] assignedDriverIds:", assignedDriverIds);
        console.log("[AssignmentModal] activeJobFleets:", activeJobFleets);
        console.log("[AssignmentModal] activeJobDrivers:", activeJobDrivers);

        const [
          fleetRes,
          driverRes,
          transporterRes,
          tfRes,
          tdRes,
          assignedFleetRes,
          assignedDriverRes,
        ] = await Promise.all([
          // Only show available fleets (include on_duty for checked-in but unassigned)
          (async () => {
            let query = supabase
              .from("md_fleets")
              .select(
                `
              id,
              entity_id,
              fleet_code,
              plate_number,
              brand,
              model,
              status,
              fleet_type_id,
              md_fleet_types (type_name)
            `,
              )
              .eq("is_active", true)
              .eq("tenant_id", tenantId)
              .in("status", ["available", "maintenance", "on_duty"]);

            // Exclude fleets with active jobs if any exist
            if (activeJobFleets.length > 0) {
              const unquotedFleets = activeJobFleets.join(",");
              query = query.not("id", "in", `(${unquotedFleets})`);
            }
            return query;
          })(),

          // Only show drivers who are available or on_duty (checked in but not yet assigned)
          (async () => {
            let query = supabase
              .from("md_drivers")
              .select("*, md_entities(is_vendor)")
              .eq("is_active", true)
              .eq("tenant_id", tenantId)
              .in("status", ["available", "on_duty"]);

            // Exclude drivers with active jobs if any exist
            if (activeJobDrivers.length > 0) {
              const unquotedDrivers = activeJobDrivers.join(",");
              query = query.not("id", "in", `(${unquotedDrivers})`);
            }
            return query;
          })(),

          supabase
            .from("md_entities")
            .select("id, name, vendor_type, is_vendor, is_customer, is_own")
            .eq("tenant_id", tenantId)
            .eq("is_active", true),

          supabase
            .from("md_fleets")
            .select("id, plate_number, brand, model, status, entity_id"),
          supabase
            .from("md_drivers")
            .select("id, name, phone, entity_id, is_active")
            .eq("is_active", true),

          // [AI] Fetch already-assigned fleets by their IDs regardless of status
          // This ensures the dropdown always shows the currently-assigned fleet even if it's on_road
          assignedFleetIds.length > 0
            ? supabase
                .from("md_fleets")
                .select(
                  `
                id, entity_id, fleet_code, plate_number, brand, model, status, fleet_type_id,
                md_fleet_types (type_name)
              `,
                )
                .in("id", assignedFleetIds)
            : Promise.resolve({ data: [], error: null }),

          // [AI] Fetch already-assigned drivers by their IDs regardless of is_working status
          // This ensures the dropdown always shows the currently-assigned driver even if is_working=true
          assignedDriverIds.length > 0
            ? supabase
                .from("md_drivers")
                .select("*, md_entities(is_vendor)")
                .in("id", assignedDriverIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        console.log("[AssignmentModal] Promise.all results:", {
          fleetData: fleetRes.data?.length || 0,
          fleetError: fleetRes.error?.message,
          driverData: driverRes.data?.length || 0,
          driverError: driverRes.error?.message,
          transporterData: transporterRes.data?.length || 0,
          transporterError: transporterRes.error?.message,
          tfData: tfRes?.data?.length || 0,
          tfError: tfRes?.error?.message,
          tdData: tdRes?.data?.length || 0,
          tdError: tdRes?.error?.message,
          assignedFleetData: assignedFleetRes?.data?.length || 0,
          assignedFleetError: assignedFleetRes?.error?.message,
          assignedDriverData: assignedDriverRes?.data?.length || 0,
          assignedDriverError: assignedDriverRes?.error?.message,
        });

        if (fleetRes.error)
          console.error("[AssignmentModal] Error fetching fleets:", {
            code: fleetRes.error.code,
            message: fleetRes.error.message,
            details: fleetRes.error.details,
            hint: fleetRes.error.hint,
          });
        if (driverRes.error)
          console.error("[AssignmentModal] Error fetching drivers:", {
            code: driverRes.error.code,
            message: driverRes.error.message,
            details: driverRes.error.details,
            hint: driverRes.error.hint,
          });
        if (transporterRes.error)
          console.error("[AssignmentModal] Error fetching transporters:", {
            code: transporterRes.error.code,
            message: transporterRes.error.message,
            details: transporterRes.error.details,
            hint: transporterRes.error.hint,
          });
        if (tfRes?.error)
          console.error("[AssignmentModal] Error fetching all fleets:", {
            code: tfRes.error.code,
            message: tfRes.error.message,
          });
        if (tdRes?.error)
          console.error("[AssignmentModal] Error fetching all drivers:", {
            code: tdRes.error.code,
            message: tdRes.error.message,
          });
        if (assignedFleetRes?.error)
          console.error("[AssignmentModal] Error fetching assigned fleets:", {
            code: assignedFleetRes.error.code,
            message: assignedFleetRes.error.message,
          });
        if (assignedDriverRes?.error)
          console.error("[AssignmentModal] Error fetching assigned drivers:", {
            code: assignedDriverRes.error.code,
            message: assignedDriverRes.error.message,
          });

        // [AI] Merge assigned fleets/drivers into the available lists so dropdowns always show them
        let availableFleets = fleetRes.data || [];
        const assignedFleets = assignedFleetRes?.data || [];
        const availableFleetIds = new Set(availableFleets.map((f) => f.id));
        // Add assigned fleets that weren't in the available query (e.g. status=on_road)
        for (const af of assignedFleets) {
          if (!availableFleetIds.has(af.id)) {
            availableFleets.push(af);
            availableFleetIds.add(af.id);
          }
        }

        // Final deduplication for fleets just to be safe against duplicate keys
        availableFleets = availableFleets.filter(
          (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
        );

        let availableDrivers = driverRes.data || [];
        const assignedDriversList = assignedDriverRes?.data || [];
        const availableDriverIds = new Set(availableDrivers.map((d) => d.id));
        // Add assigned drivers that weren't in the available query (e.g. is_working=true)
        for (const ad of assignedDriversList) {
          if (!availableDriverIds.has(ad.id)) {
            availableDrivers.push(ad);
            availableDriverIds.add(ad.id);
          }
        }

        // Final deduplication for drivers just to be safe
        availableDrivers = availableDrivers.filter(
          (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
        );

        setFleets(availableFleets);
        setDrivers(availableDrivers);

        const tenantName = (profile?.tenants?.name || "").toUpperCase();
        const tenantCode = (profile?.tenant_code || "").toUpperCase();
        const trans = mapTransportersForTenant(
          transporterRes.data || [],
          tenantName,
          tenantCode,
        );

        // [AI] Check readiness for internal drivers (attendance + inspection today)
        const today = new Date().toISOString().split("T")[0];
        const readinessMap: Record<
          string,
          {
            ready: boolean;
            reason: string;
            hasAttendance: boolean;
            hasInspection: boolean;
            inspectionStatus: string;
          }
        > = {};

        for (const d of availableDrivers) {
          const transporter = trans.find((t) => t.id === d.entity_id);
          const isInternal = transporter?.is_own || !transporter?.is_vendor;

          if (isInternal && d.id) {
            const [attRes, inspRes] = await Promise.all([
              supabase
                .from("driver_attendance")
                .select("id")
                .eq("driver_id", d.id)
                .eq("status", "CHECK_IN")
                .gte("check_in", `${today}T00:00:00`)
                .limit(1),
              supabase
                .from("fleet_inspections")
                .select("status")
                .eq("driver_id", d.id)
                .gte("created_at", `${today}T00:00:00`)
                .order("created_at", { ascending: false })
                .limit(1),
            ]);

            readinessMap[d.id] = computeDriverReadiness({
              driverStatus: d.status,
              hasAttendance: !!(attRes.data && attRes.data.length > 0),
              hasInspection: !!(inspRes.data && inspRes.data.length > 0),
              inspectionStatus: inspRes.data?.[0]?.status || "N/A",
              isVendor: false,
            });
          } else {
            readinessMap[d.id] = computeDriverReadiness({
              isVendor: true,
              hasAttendance: true,
              hasInspection: true,
              inspectionStatus: "N/A",
            });
          }
        }

        setDriverReadiness(readinessMap);

        console.log("[AssignmentModal] Assets Fetched:", {
          fleetsCount: availableFleets.length,
          driversCount: availableDrivers.length,
          transportersCount: trans.length,
          mergedAssignedFleets: assignedFleets.length,
          mergedAssignedDrivers: assignedDriversList.length,
          allFleets: availableFleets.map((f) => f.id),
          allDrivers: availableDrivers.map((d) => d.id),
        });

        console.log(
          "[AssignmentModal] Vehicle type from itemData:",
          itemData?.vehicle_type_name,
        );

        setTransporters(trans);

        const internalHqId = trans.find((t) => t.is_own)?.id || "";
        const finalAssignments = buildInitialAssignmentSlots(
          (jos || []) as AssignmentSlot[],
          itemData,
          dealPrice,
          internalHqId,
        );
        setAssignments(finalAssignments);
        const missingFleetIds = activeJobFleets.filter(
          (id) => !availableFleets.some((f) => f.id === id),
        );
        if (missingFleetIds.length > 0) {
          const { data: missingFleets } = await supabase
            .from("md_fleets")
            .select(
              `
             id, entity_id, fleet_code, plate_number, brand, model, status, fleet_type_id,
             md_fleet_types (type_name)
           `,
            )
            .in("id", missingFleetIds);
          if (missingFleets) {
            setFleets((prev) => {
              const combined = [...prev, ...missingFleets];
              return combined.filter(
                (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
              );
            });
          }
        }

        // [AI] Fetch driver allowances (ignore 404 if table doesn't exist yet)
        try {
          const { data: allowances, error: allowErr } = await supabase
            .from("md_driver_allowances")
            .select("*, md_fleet_types(type_name)")
            .eq("tenant_id", tenantId)
            .eq("is_active", true);
          if (allowances && !allowErr) setDriverAllowances(allowances);
        } catch (e) {
          // Table probably doesn't exist, ignore
        }

        // [AI] Fetch COA for cost account selection
        try {
          const { data: coa } = await supabase
            .from("finance_coa")
            .select("id, account_number, account_name")
            .order("account_number");
          if (coa) setCoaList(coa);
        } catch (e) {
          console.error("Failed to fetch COA:", e);
        }
      } catch (err: any) {
        console.error("[AssignmentModal] Error:", err);
        toast.error("Gagal mengambil data referensi: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile?.tenant_id, item.id]);

  const handleAssignmentChange = (index: number, field: string, value: any) => {
    const updated = [...assignments];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "driver_id") {
      const driver = drivers.find((d) => d.id === value);
      if (driver) updated[index].driver_phone = driver.phone;
    }

    if (field === "fleet_id") {
      const fleet = fleets.find((f) => f.id === value);
      if (fleet) {
        const { origin, dest } = getRouteOriginDest(itemData);
        const found = matchDriverAllowance(
          driverAllowances,
          origin,
          dest,
          fleet.fleet_type_id,
        );

        if (found) {
          updated[index].advance_amount = Number(found.amount) || 0;
          updated[index].save_to_master = false;
        } else {
          if (!updated[index].advance_amount) {
            updated[index].advance_amount = 0;
          }
          updated[index].save_to_master = true;
        }
      }
    }

    if (field === "transporter_id") {
      updated[index].fleet_id = null;
      updated[index].driver_id = null;
      updated[index].driver_phone = "";
    }

    setAssignments(updated);
  };

  const handleRejectSlot = (index: number, reason: string, note: string) => {
    const updated = [...assignments];
    updated[index] = {
      ...updated[index],
      rejected: true,
      rejected_reason: reason as any,
      rejected_note: note,
      transporter_id: null,
      fleet_id: null,
      driver_id: null,
      driver_phone: "",
    };
    setAssignments(updated);
  };

  const handleCancelReject = (index: number) => {
    const updated = [...assignments];
    updated[index] = {
      ...updated[index],
      rejected: false,
      rejected_reason: undefined,
      rejected_note: undefined,
    };
    setAssignments(updated);
  };

  const handleUploadDocuments = async (
    index: number,
    filesList: FileList | null,
  ) => {
    if (!filesList || filesList.length === 0) return;
    setUploadingSlotIndex(index);
    try {
      const currentSlot = assignments[index];
      const currentDocs = [...(currentSlot.assignment_documents || [])];
      const joIdOrToken = currentSlot.id || `temp-${item.id}-${index}`;

      for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `assignment-docs/${joIdOrToken}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Upload gagal (${file.name}): ` + uploadError.message);
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("documents").getPublicUrl(filePath);

        const newDoc = {
          id: `doc_${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          type: "SURAT_JALAN",
          file_url: publicUrl,
          file_type: file.type || "application/octet-stream",
          file_size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          uploaded_at: new Date().toISOString(),
        };
        currentDocs.push(newDoc);

        if (currentSlot.id) {
          const { error: dbError } = await supabase
            .from("job_orders")
            .update({ assignment_documents: currentDocs })
            .eq("id", currentSlot.id);
          if (dbError) {
            console.error("Failed to persist document metadata:", dbError);
          }
        }
      }

      handleAssignmentChange(index, "assignment_documents", currentDocs);
      toast.success("Dokumen pengantar berhasil diunggah!");
    } catch (err: any) {
      toast.error("Gagal mengunggah dokumen: " + err.message);
    } finally {
      setUploadingSlotIndex(null);
    }
  };

  const handleRemoveAssignmentDoc = async (
    slotIndex: number,
    docIndex: number,
  ) => {
    const currentSlot = assignments[slotIndex];
    const currentDocs = [...(currentSlot.assignment_documents || [])];
    currentDocs.splice(docIndex, 1);
    handleAssignmentChange(slotIndex, "assignment_documents", currentDocs);
    if (currentSlot.id) {
      await supabase
        .from("job_orders")
        .update({ assignment_documents: currentDocs })
        .eq("id", currentSlot.id);
    }
  };

  const handleUpdateAssignmentDocType = async (
    slotIndex: number,
    docIndex: number,
    newType: string,
  ) => {
    const currentSlot = assignments[slotIndex];
    const currentDocs = [...(currentSlot.assignment_documents || [])];
    if (currentDocs[docIndex]) {
      currentDocs[docIndex].type = newType;
      handleAssignmentChange(slotIndex, "assignment_documents", currentDocs);
      if (currentSlot.id) {
        await supabase
          .from("job_orders")
          .update({ assignment_documents: currentDocs })
          .eq("id", currentSlot.id);
      }
    }
  };

  const handleClose = async () => {
    const hasChanges = assignments.some((a) => {
      return (
        a.transporter_id ||
        a.driver_id ||
        a.fleet_id ||
        (a.assignment_documents || []).length > 0
      );
    });
    if (hasChanges && profile?.tenant_id) {
      setAssigning(true);
      try {
        await saveAssignmentsAction({
          mode: "draft",
          woItem: {
            id: item.id,
            wo_id: item.wo_id,
            status: item.status,
            item_code: item.item_code,
            work_orders: item.work_orders,
            item_data: item.item_data,
          },
          tenantId: profile.tenant_id,
          assignments,
          dealPrice,
          transporters,
          drivers,
          fleets,
        });
      } catch (e) {
        // silent — best effort on close
      } finally {
        setAssigning(false);
      }
    }
    onClose();
  };

  const handleSaveDraft = async () => {
    if (assigning) return;

    const tenantId = profile?.tenant_id;
    if (!tenantId) {
      toast.error("Tenant ID tidak ditemukan. Harap refresh halaman.");
      return;
    }

    setAssigning(true);

    try {
      const result = await saveAssignmentsAction({
        tenantId,
        woItem: {
          id: item.id,
          wo_id: item.wo_id,
          status: item.status,
          item_code: item.item_code,
          work_orders: item.work_orders,
          item_data: item.item_data,
        },
        assignments,
        mode: "draft",
        dealPrice,
        transporters,
        drivers,
        fleets,
      });

      if (!result.success) {
        toast.error(`Gagal save draft: ${result.error}`);
        return;
      }

      toast.success("Draft saved — bisa lanjut edit nanti");
      onSuccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Gagal save draft: ${errorMessage}`);
    } finally {
      setAssigning(false);
    }
  };

  const remainingSlots = assignments.filter(
    (a) => !a.id && !a.transporter_id && !a.fleet_id && !a.driver_id,
  );

  const vendorOptions = transporters.filter((t) => t.is_vendor);

  const handleVendorReplyAssign = async () => {
    if (replySaving) return;
    if (!replyVendorId) {
      toast.error("Pilih nama vendor terlebih dahulu");
      return;
    }
    const qty = Math.min(
      Math.max(1, Number(replyQty) || 1),
      remainingSlots.length,
    );
    if (qty <= 0) {
      toast.error("Tidak ada unit tersisa untuk di-assign");
      return;
    }
    const price = Number(replyPrice.replace(/\D/g, "")) || 0;
    if (price <= 0) {
      toast.error("Harga dari vendor harus diisi (> 0)");
      return;
    }

    const tenantId = profile?.tenant_id;
    if (!tenantId) {
      toast.error("Tenant ID tidak ditemukan. Harap refresh halaman.");
      return;
    }

    setReplySaving(true);
    try {
      const updated = [...assignments];
      let filled = 0;
      for (let i = 0; i < updated.length && filled < qty; i++) {
        const a = updated[i];
        if (!a.id && !a.transporter_id && !a.fleet_id && !a.driver_id) {
          updated[i] = {
            ...a,
            transporter_id: replyVendorId,
            purchase_price: price,
            base_price:
              Number(a.base_price) > 0 ? Number(a.base_price) : dealPrice,
            status: "pending",
          };
          filled++;
        }
      }
      setAssignments(updated);

      const result = await saveAssignmentsAction({
        tenantId,
        woItem: {
          id: item.id,
          wo_id: item.wo_id,
          status: item.status,
          item_code: item.item_code,
          work_orders: item.work_orders,
          item_data: item.item_data,
        },
        assignments: updated,
        mode: "draft",
        dealPrice,
        transporters,
        drivers,
        fleets,
      });

      if (!result.success) {
        toast.error(`Gagal assign: ${result.error}`);
        return;
      }

      toast.success(`${filled} unit di-assign ke vendor`);
      setReplyQty(1);
      setReplyPrice("");
      onSuccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Gagal assign: ${errorMessage}`);
    } finally {
      setReplySaving(false);
    }
  };

  const handlePrintDN = async (index: number) => {
    const slot = assignments[index];
    if (!slot.id) {
      toast.error("Simpan dahulu penugasan sebelum mencetak Surat Jalan");
      return;
    }

    // 1. Open tab on same origin immediately to bypass popup blockers and avoid cross-origin SecurityError
    const targetUrl = `/sbu/trucking/delivery-note/${slot.id}`;
    const win = window.open(`${targetUrl}?wait=true`, "_blank");

    // 2. Save latest slot changes (container, notes, vendor, driver, fleet) to DB without closing modal
    const toastId = toast.loading(
      "Menyimpan perubahan & membuka Surat Jalan...",
    );
    try {
      const tenantId = profile?.tenant_id;
      if (tenantId) {
        await saveAssignmentsAction({
          tenantId,
          woItem: {
            id: item.id,
            wo_id: item.wo_id,
            status: item.status,
            item_code: item.item_code,
            work_orders: item.work_orders,
            item_data: item.item_data,
          },
          assignments,
          mode: "draft",
          dealPrice,
          transporters,
          drivers,
          fleets,
        });
      }
      toast.dismiss(toastId);
      toast.success("Surat Jalan siap dicetak!");

      // 3. Navigate the same-origin window to the clean URL without wait=true
      if (win && !win.closed) {
        win.location.replace(targetUrl);
      } else {
        window.open(targetUrl, "_blank");
      }
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error("Gagal menyimpan perubahan: " + (e.message || String(e)));
      if (win && !win.closed) {
        win.location.replace(targetUrl);
      } else {
        window.open(targetUrl, "_blank");
      }
    }
  };

  const handleSave = async (nextAction?: () => void) => {
    if (assigning) return;

    const tenantId = profile?.tenant_id;
    if (!tenantId) {
      toast.error("Tenant ID tidak ditemukan. Harap refresh halaman.");
      return;
    }

    setAssigning(true);

    try {
      const result = await saveAssignmentsAction({
        tenantId,
        woItem: {
          id: item.id,
          wo_id: item.wo_id,
          status: item.status,
          item_code: item.item_code,
          work_orders: item.work_orders,
          item_data: item.item_data,
        },
        assignments,
        mode: nextAction ? "handover" : "confirm",
        dealPrice,
        transporters,
        drivers,
        fleets,
      });

      if (!result.success) {
        toast.error(result.error || "Gagal menyimpan assignment");
        return;
      }

      if (result.isHandoverFlow) {
        toast.success(
          `${result.savedCount} JO(s) saved — proceeding to handover...`,
        );
        nextAction?.();
      } else {
        toast.success("Assignment berhasil disimpan");
        onSuccess();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Gagal menyimpan assignment: ${errorMessage}`);
    } finally {
      setAssigning(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const formatNumber = (val: any) => {
    if (val === undefined || val === null || val === "") return "";
    const num = val.toString().replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const totalJOCount = unitCount || assignments.length;
  const assignedCount = assignments.filter((a) =>
    Boolean(a.fleet_id || a.driver_id || a.transporter_id),
  ).length;
  const remainingCount = Math.max(0, totalJOCount - assignedCount);

  const getFleetOptions = (assign: any) => {
    const selectedTrans = transporters.find(
      (t) => t.id === assign.transporter_id,
    );
    let filteredFleets = fleets.filter((f) => {
      if (f.id === assign.fleet_id) return true;
      return selectedTrans?.is_own
        ? !f.entity_id || f.entity_id === selectedTrans.id
        : f.entity_id === assign.transporter_id;
    });
    const assignedFleet = fleets.find((f) => f.id === assign.fleet_id);
    if (
      assignedFleet &&
      !filteredFleets.find((f) => f.id === assignedFleet.id)
    ) {
      filteredFleets = [assignedFleet, ...filteredFleets];
    }
    return filteredFleets.map((f) => {
      const isBusy = f.status === "on_road" && assign.fleet_id !== f.id;
      return {
        value: f.id,
        label: `${f.md_fleet_types?.type_name || "Fleet"} - ${f.plate_number}`,
        description: isBusy
          ? "BUSY / ON ROAD"
          : f.status?.toUpperCase() || "AVAILABLE",
        disabled: isBusy,
      };
    });
  };

  const getDriverOptions = (assign: any) => {
    const selectedTrans = assign.transporter_id
      ? transporters.find((t) => t.id === assign.transporter_id)
      : null;
    const filteredDrivers = drivers.filter((d) => {
      if (d.id === assign.driver_id) return true;
      if (!assign.transporter_id) return true;
      return selectedTrans?.is_own
        ? !d.entity_id || d.entity_id === selectedTrans.id
        : d.entity_id === assign.transporter_id;
    });
    return filteredDrivers.map((d) => {
      const isBusy = d.status === "on_road" && assign.driver_id !== d.id;
      const readiness = driverReadiness[d.id];
      const notReady = readiness && !readiness.ready && !isBusy;
      return {
        value: d.id,
        label: d.name,
        description: isBusy
          ? "BUSY / ON ROAD"
          : notReady
            ? readiness.reason.toUpperCase()
            : d.status?.toUpperCase() || "AVAILABLE",
        disabled: isBusy || notReady,
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
        {/* Header Section */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center gap-3 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center border border-slate-200">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Assignment Console
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {item.work_orders.wo_number}
                </p>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span className="bg-slate-800 text-white px-2.5 py-0.5 rounded shadow-sm">
                    {totalJOCount} JO
                  </span>
                  <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded shadow-sm">
                    Assigned {assignedCount}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded shadow-sm ${remainingCount > 0 ? "bg-amber-500 text-white font-black" : "bg-slate-200 text-slate-600"}`}
                  >
                    Remaining {remainingCount} JO
                  </span>
                </div>
                {isHandoverApproved && (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 ml-1">
                    Locked ({maxJOCount})
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVendorSendOpen(true)}
              title="Send to Vendor via WhatsApp"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all text-xs font-bold"
            >
              <Send size={16} />
              Send to Vendor
            </button>
            <button
              onClick={() => setGroundStaffSendOpen(true)}
              title="Notify Ground Staff via WhatsApp"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all text-xs font-bold"
            >
              <Send size={16} />
              Send to Ground
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-slate-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 bg-slate-50/50">
          {/* WO Summary Card - FORMAL ENHANCED HEADER */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-3 bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col justify-center space-y-6">
              <div className="flex items-center gap-4">
                <div className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-semibold">
                  {itemData.vehicle_type_name || itemData.vehicle_type || "-"}
                </div>
                {isHandoverApproved && (
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold flex items-center gap-1.5">
                    <ShieldCheck size={14} /> HANDOVER APPROVED — {maxJOCount}{" "}
                    JO(s) LOCKED
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 text-slate-600 bg-white px-3 py-1 rounded border border-slate-200">
                  <MapPin size={14} className="text-slate-400" />
                  <div className="flex items-center gap-2 text-xs font-medium">
                    {(itemData.stops || []).map((stop: any, sIdx: number) => (
                      <span key={sIdx} className="flex items-center">
                        {stop.location_name || stop.name || "-"}
                        {sIdx < (itemData.stops?.length ?? 0) - 1 && (
                          <span className="mx-2 text-slate-300">→</span>
                        )}
                      </span>
                    ))}
                    {(!itemData.stops || itemData.stops.length === 0) && (
                      <span>
                        {itemData.origin_name ||
                          itemData.origin_location_name ||
                          "-"}
                        <span className="mx-2 text-slate-300">→</span>
                        {itemData.destination_name ||
                          itemData.destination_location_name ||
                          "-"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">
                  CUSTOMER / BILL TO
                </p>
                <div className="flex items-baseline gap-3">
                  <h3 className="text-xl font-bold text-slate-900">
                    {item.work_orders.md_entities.name}
                  </h3>
                  {item.work_orders.md_entities.legal_name && (
                    <span className="text-sm font-medium text-slate-500">
                      ({item.work_orders.md_entities.legal_name})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-center items-center text-center shadow-sm">
              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
                <DollarSign size={20} className="text-emerald-600" />
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-1">
                HARGA JUAL (DEALS)
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {formatRupiah(dealPrice)}
              </p>
              <p className="text-xs font-medium text-slate-400 mt-1">
                PER FLEET UNIT
              </p>
            </div>
          </div>

          {/* Vendor Reply (from WhatsApp broadcast) */}
          {remainingSlots.length > 0 && vendorOptions.length > 0 && (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Input Balasan Vendor (WhatsApp)
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Sisa {remainingSlots.length} unit
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Admin input manual hasil balasan WA vendor (nama vendor + jumlah
                truck + harga dari vendor).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Nama Vendor
                  </label>
                  <select
                    value={replyVendorId}
                    onChange={(e) => setReplyVendorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  >
                    <option value="">Pilih vendor...</option>
                    {vendorOptions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Jumlah Truck
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={remainingSlots.length}
                    value={replyQty}
                    onChange={(e) =>
                      setReplyQty(
                        Math.min(
                          Number(e.target.value) || 1,
                          remainingSlots.length,
                        ),
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Harga Vendor / unit
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={replyPrice}
                      onChange={(e) =>
                        setReplyPrice(e.target.value.replace(/[^\d]/g, ""))
                      }
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleVendorReplyAssign}
                    disabled={replySaving}
                    className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                  >
                    {replySaving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <MessageCircle size={14} />
                    )}
                    Tambah & Simpan
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                {isHandoverApproved
                  ? `Locked Units (${maxJOCount} of ${unitCount} Original)`
                  : "Deploy Units"}
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-slate-500">
                    Live Syncing
                  </span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-slate-400" size={40} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                  Loading data resources...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((assign, idx) => {
                  const selectedTransporter = assign.transporter_id
                    ? transporters.find((t) => t.id === assign.transporter_id)
                    : transporters.find((t) => t.is_own);
                  const driverEntity = drivers.find(
                    (d) => d.id === assign.driver_id,
                  )?.md_entities;
                  const isVendor = resolveIsVendor(
                    selectedTransporter,
                    driverEntity?.is_vendor,
                  );
                  const isOwn = selectedTransporter?.is_own;
                  const purchasePrice = Number(assign.purchase_price) || 0;
                  const effectiveBasePrice =
                    Number(assign.base_price) > 0
                      ? Number(assign.base_price)
                      : Number(dealPrice) > 0
                        ? Number(dealPrice)
                        : Number(itemData?.deal_price || 0);
                  const basePrice = effectiveBasePrice;
                  const sharePct = Number(assign.driver_share_percentage) || 0;

                  const { margin, percent: marginPercent } = computeMargin(
                    basePrice,
                    purchasePrice,
                  );
                  const driverPayout = basePrice * (sharePct / 100);

                  let marginStatus = "MARGIN AMAN";
                  let marginColor = "text-emerald-600 bg-emerald-50";
                  if (marginPercent <= 5) {
                    marginStatus = "MARGIN KRITIS";
                    marginColor =
                      "text-rose-600 bg-rose-50 border border-rose-100";
                  } else if (marginPercent <= 15) {
                    marginStatus = "MARGIN TIPIS";
                    marginColor =
                      "text-amber-600 bg-amber-50 border border-amber-100";
                  }

                  const getStatusFlag = (status: string, routes: any[]) => {
                    if (!status) return null;
                    if (status === "accepted")
                      return {
                        text: "MENUNGGU BERANGKAT",
                        color: "bg-amber-50 text-amber-700 border-amber-200",
                      };
                    if (status === "in_progress") {
                      const activeStop = routes?.find(
                        (r: any) => r.status === "arrived",
                      );
                      if (activeStop)
                        return {
                          text: `TIBA DI ${activeStop.location_name?.toUpperCase()}`,
                          color:
                            "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse",
                        };
                      const nextStop = routes?.find(
                        (r: any) => r.status === "pending",
                      );
                      if (nextStop)
                        return {
                          text: `MENUJU ${nextStop.location_name?.toUpperCase()}`,
                          color:
                            "bg-blue-50 text-blue-700 border-blue-200 animate-pulse",
                        };
                      return {
                        text: "MENUNGGU SELESAI",
                        color:
                          "bg-slate-50 text-slate-600 border-slate-200 animate-pulse",
                      };
                    }
                    if (status === "completed")
                      return {
                        text: "PEKERJAAN SELESAI",
                        color:
                          "bg-emerald-600 text-white border-emerald-500 shadow-sm",
                      };
                    return {
                      text: status.toUpperCase().replace(/_/g, " "),
                      color: "bg-slate-100 text-slate-500 border-slate-200",
                    };
                  };

                  const statusFlag = assign.id
                    ? getStatusFlag(assign.status || "", [])
                    : null;

                  const REJECT_REASONS = [
                    {
                      value: "truck_unavailable",
                      label: "Truk tidak tersedia",
                    },
                    { value: "vendor_cancelled", label: "Vendor batal" },
                    {
                      value: "driver_unavailable",
                      label: "Sopir tidak tersedia",
                    },
                    { value: "cost_too_high", label: "Biaya terlalu tinggi" },
                    { value: "other", label: "Lainnya" },
                  ];

                  if (assign.rejected) {
                    const reasonLabel =
                      REJECT_REASONS.find(
                        (r) => r.value === assign.rejected_reason,
                      )?.label || assign.rejected_reason;
                    return (
                      <div
                        key={idx}
                        className="bg-rose-50 border-2 border-dashed border-rose-300 rounded-lg p-4 shadow-sm relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 px-3 py-1 bg-rose-100 text-rose-700 border-r border-b border-rose-200 rounded-br-lg text-[10px] font-bold uppercase">
                          Unit {idx + 1} -{" "}
                          {itemData.vehicle_type_name || itemData.vehicle_type}
                        </div>
                        <div className="absolute top-0 right-0 px-3 py-1 bg-rose-600 text-white rounded-bl-lg text-[10px] font-black uppercase">
                          REJECTED
                        </div>
                        <div className="mt-8 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <X size={14} className="text-rose-500 shrink-0" />
                              <span className="text-xs font-bold text-rose-700">
                                {reasonLabel}
                              </span>
                            </div>
                            {assign.rejected_note && (
                              <p className="text-[11px] text-rose-600 truncate ml-5">
                                {assign.rejected_note}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleCancelReject(idx)}
                            className="shrink-0 px-3 py-1.5 bg-white text-rose-600 border border-rose-300 rounded-md text-[10px] font-bold uppercase hover:bg-rose-100 transition-colors"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:border-slate-300 transition-colors relative overflow-hidden"
                    >
                      {statusFlag && (
                        <div
                          className={`absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-[10px] font-semibold uppercase border-l border-b ${statusFlag.color}`}
                        >
                          {statusFlag.text}
                        </div>
                      )}

                      <div className="absolute top-0 left-0 px-3 py-1 bg-slate-100 text-slate-600 border-r border-b border-slate-200 rounded-br-lg text-[10px] font-semibold uppercase">
                        Unit {idx + 1} -{" "}
                        {itemData.vehicle_type_name || itemData.vehicle_type}
                      </div>

                      {assign.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
                          <div
                            className="h-full bg-blue-500 transition-all duration-1000"
                            style={{ width: "0%" }}
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap items-end gap-4 mt-8">
                        <div className="flex-1 min-w-[200px] space-y-1">
                          <label className="text-xs font-medium text-slate-500">
                            Vendor / Transporter
                          </label>
                          <SearchableSelect
                            value={assign.transporter_id || ""}
                            onChange={(value) =>
                              handleAssignmentChange(
                                idx,
                                "transporter_id",
                                value,
                              )
                            }
                            placeholder="Pilih Vendor / Transporter"
                            options={[
                              ...(assign.transporter_id &&
                              !transporters.some(
                                (t) => t.id === assign.transporter_id,
                              )
                                ? [
                                    {
                                      value: assign.transporter_id,
                                      label: `Legacy Transporter (ID: ${assign.transporter_id.substring(0, 6)}...)`,
                                    },
                                  ]
                                : []),
                              ...transporters.map((t) => ({
                                value: t.id,
                                label: t.name,
                                description: t.is_own
                                  ? "Internal (OWN)"
                                  : "Vendor",
                              })),
                            ]}
                          />
                        </div>

                        <div className="flex-1 min-w-[150px] space-y-1">
                          <label className="text-xs font-medium text-slate-500">
                            Fleet / Armada
                          </label>
                          <SearchableSelect
                            value={
                              assign.fleet_id ? String(assign.fleet_id) : ""
                            }
                            onChange={(value) =>
                              handleAssignmentChange(idx, "fleet_id", value)
                            }
                            placeholder="Pilih Armada"
                            options={getFleetOptions(assign)}
                          />
                        </div>

                        <div className="flex-1 min-w-[150px] space-y-1">
                          <label className="text-xs font-medium text-slate-500">
                            Driver / Sopir
                          </label>
                          <SearchableSelect
                            value={
                              assign.driver_id ? String(assign.driver_id) : ""
                            }
                            onChange={(value) =>
                              handleAssignmentChange(idx, "driver_id", value)
                            }
                            placeholder="Pilih Driver"
                            options={getDriverOptions(assign)}
                          />
                        </div>

                        <div
                          className={`flex-1 min-w-[200px] space-y-1 transition-opacity duration-300 ${isVendor ? "opacity-100" : "opacity-40 pointer-events-none"}`}
                        >
                          <div className="flex justify-between items-center w-full pb-1">
                            <label className="text-xs font-medium text-slate-500">
                              Harga Beli (Vendor)
                            </label>
                            {isVendor && purchasePrice > 0 && (
                              <div
                                className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase ${marginColor}`}
                              >
                                {marginStatus} {marginPercent.toFixed(1)}%
                              </div>
                            )}
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                              Rp
                            </span>
                            <input
                              type="text"
                              value={formatNumber(assign.purchase_price)}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, "");
                                handleAssignmentChange(
                                  idx,
                                  "purchase_price",
                                  raw ? parseInt(raw, 10) : 0,
                                );
                              }}
                              disabled={!isVendor}
                              className="w-full h-10 pl-8 pr-3 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors outline-none"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        {isVendor && (
                          <div className="flex-1 min-w-[200px] space-y-1 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center pb-1">
                              <label className="text-xs font-medium text-slate-500">
                                Harga Jual (Customer)
                              </label>
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                                Rp
                              </span>
                              <input
                                type="text"
                                value={formatNumber(assign.base_price)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/\D/g, "");
                                  handleAssignmentChange(
                                    idx,
                                    "base_price",
                                    raw ? parseInt(raw, 10) : 0,
                                  );
                                }}
                                className="w-full h-10 pl-8 pr-3 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors outline-none"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        )}

                        {isVendor && (
                          <div className="flex-1 min-w-[200px] space-y-1 animate-in slide-in-from-top-2 duration-300">
                            <label className="text-xs font-medium text-slate-500">
                              Akun Biaya (Cost COA)
                            </label>
                            <select
                              value={assign.cost_account_id || ""}
                              onChange={(e) =>
                                handleAssignmentChange(
                                  idx,
                                  "cost_account_id",
                                  e.target.value || null,
                                )
                              }
                              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors outline-none"
                            >
                              <option value="">
                                HPP Jasa Vendor (Default)
                              </option>
                              {coaList
                                .filter((c) =>
                                  c.account_number.startsWith("5-"),
                                )
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.account_number} - {c.account_name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}

                        {isOwn && (
                          <>
                            <div className="flex-1 min-w-[200px] space-y-1 animate-in slide-in-from-top-2 duration-300">
                              <div className="flex items-center pb-1">
                                <label className="text-xs font-medium text-slate-500">
                                  Uang Jalan (Bagi Hasil)
                                </label>
                              </div>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                                  Rp
                                </span>
                                <input
                                  type="text"
                                  value={formatNumber(assign.advance_amount)}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(
                                      /\D/g,
                                      "",
                                    );
                                    handleAssignmentChange(
                                      idx,
                                      "advance_amount",
                                      raw ? parseInt(raw, 10) : 0,
                                    );
                                  }}
                                  className="w-full h-10 pl-8 pr-3 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors outline-none"
                                  placeholder="0"
                                />
                              </div>
                            </div>

                            <div className="flex-1 min-w-[200px] space-y-1 animate-in slide-in-from-top-2 duration-300 flex flex-col justify-end">
                              <div className="h-10 flex items-center">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <div className="relative flex items-center justify-center">
                                    <input
                                      type="checkbox"
                                      checked={assign.save_to_master || false}
                                      onChange={(e) =>
                                        handleAssignmentChange(
                                          idx,
                                          "save_to_master",
                                          e.target.checked,
                                        )
                                      }
                                      className="peer appearance-none w-4 h-4 border border-slate-300 rounded checked:border-indigo-500 checked:bg-indigo-500 transition-all cursor-pointer"
                                    />
                                    <CheckCircle
                                      size={12}
                                      className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                                    />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                                      Simpan Master
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      Simpan tarif ini ke master data
                                    </span>
                                  </div>
                                </label>
                              </div>
                            </div>

                            <div className="flex-1 min-w-[200px] space-y-1 animate-in slide-in-from-top-2 duration-300">
                              <label className="text-xs font-medium text-slate-500">
                                Akun Biaya (Cost COA)
                              </label>
                              <select
                                value={assign.cost_account_id || ""}
                                onChange={(e) =>
                                  handleAssignmentChange(
                                    idx,
                                    "cost_account_id",
                                    e.target.value || null,
                                  )
                                }
                                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors outline-none"
                              >
                                <option value="">
                                  Beban Bagi Hasil Driver (Default)
                                </option>
                                {coaList
                                  .filter((c) =>
                                    c.account_number.startsWith("5-"),
                                  )
                                  .map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.account_number} - {c.account_name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </>
                        )}

                        <div className="flex-1 min-w-[40px] space-y-1 flex flex-col justify-end">
                          <div className="h-4"></div>
                          <div className="flex h-10 items-center">
                            {(assign.tracking_token ||
                              assign.id ||
                              assign.driver_id ||
                              assign.driver_phone ||
                              assign.transporter_id) && (
                              <button
                                onClick={async () => {
                                  setAssigning(true);
                                  try {
                                    const tenantId = profile?.tenant_id;
                                    if (tenantId) {
                                      const result =
                                        await saveAssignmentsAction({
                                          tenantId,
                                          woItem: {
                                            id: item.id,
                                            wo_id: item.wo_id,
                                            status: item.status,
                                            item_code: item.item_code,
                                            work_orders: item.work_orders,
                                            item_data: item.item_data,
                                          },
                                          assignments,
                                          mode: "confirm",
                                          dealPrice,
                                          transporters,
                                          drivers,
                                          fleets,
                                        });
                                      if (!result.success) {
                                        toast.error(
                                          result.error ||
                                            "Gagal menyimpan assignment",
                                        );
                                        setAssigning(false);
                                        return;
                                      }
                                    }
                                  } catch (err: unknown) {
                                    const errorMessage =
                                      err instanceof Error
                                        ? err.message
                                        : String(err);
                                    toast.error(`Gagal: ${errorMessage}`);
                                    setAssigning(false);
                                    return;
                                  }
                                  setAssigning(false);

                                  const driver = drivers.find(
                                    (d) => d.id === assign.driver_id,
                                  );
                                  const transporter = transporters.find(
                                    (t) => t.id === assign.transporter_id,
                                  );
                                  const driverName =
                                    driver?.name ||
                                    transporter?.name ||
                                    "Driver/Vendor";
                                  const phone =
                                    assign.driver_phone ||
                                    driver?.phone ||
                                    (transporter as any)?.phone ||
                                    "";
                                  if (!phone) {
                                    toast.error(
                                      "Nomor telepon driver/vendor tidak ditemukan untuk JO ini",
                                    );
                                    return;
                                  }
                                  const isInternal =
                                    driver?.md_entities?.is_vendor === false;
                                  const joNumber =
                                    assign.jo_number ||
                                    `${item.item_code}-${String(idx + 1).padStart(2, "0")}`;

                                  const token =
                                    assign.driver_link_token ||
                                    assign.id ||
                                    assign.tracking_token;
                                  const link = `https://www.sentralogis.com/jo/${token}`;

                                  const msg = buildDriverAssignmentMessage({
                                    driverName,
                                    isInternal: Boolean(isInternal && driver),
                                    link,
                                    joNumber,
                                  });
                                  window.open(
                                    buildWaLink(phone, msg),
                                    "_blank",
                                  );
                                }}
                                className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-md flex items-center justify-center hover:bg-emerald-100 transition-colors border border-emerald-200 shadow-sm"
                                title="Kirim Link WA Tugas ke Driver/Vendor"
                              >
                                <MessageCircle size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Container & Notes Section per JO Unit */}
                      <div className="mt-3 pt-3 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50/70 p-2.5 rounded-lg border">
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <Box size={13} className="text-blue-600" />
                            No. Container / Seal
                          </label>
                          <input
                            type="text"
                            value={assign.container_number || ""}
                            onChange={(e) =>
                              handleAssignmentChange(
                                idx,
                                "container_number",
                                e.target.value,
                              )
                            }
                            className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-md text-xs font-mono font-medium text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors outline-none placeholder:text-slate-400 placeholder:font-sans"
                            placeholder="Contoh: TGHU-123456-7"
                          />
                        </div>
                        <div className="md:col-span-6 space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <FileText size={13} className="text-blue-600" />
                            Catatan Khusus JO ini
                          </label>
                          <input
                            type="text"
                            value={assign.notes || ""}
                            onChange={(e) =>
                              handleAssignmentChange(
                                idx,
                                "notes",
                                e.target.value,
                              )
                            }
                            className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors outline-none placeholder:text-slate-400"
                            placeholder="Contoh: Masuk via Gate 2, muat malam..."
                          />
                        </div>
                        <div className="md:col-span-3 flex flex-col justify-end space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 md:opacity-0 hidden md:block">
                            Action
                          </label>
                          <div className="flex gap-2">
                            {assign.id ? (
                              <button
                                type="button"
                                onClick={() => handlePrintDN(idx)}
                                disabled={assigning}
                                className="flex-1 h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-md flex items-center justify-center gap-1.5 text-xs font-black transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                title="Simpan otomatis & Cetak Surat Jalan untuk JO ini"
                              >
                                <Printer size={13} /> SIMPAN & CETAK DN
                              </button>
                            ) : (
                              <div className="flex-1 h-9 px-3 bg-slate-100 text-slate-400 border border-slate-200 rounded-md flex items-center justify-center gap-1.5 text-[11px] font-medium cursor-not-allowed">
                                <Printer size={13} /> Simpan dahulu tkr DN
                              </div>
                            )}
                            {!assign.rejected && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingSlotIndex(
                                    rejectingSlotIndex === idx ? null : idx,
                                  );
                                  setRejectReason("truck_unavailable");
                                  setRejectNote("");
                                }}
                                className="h-9 px-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-md flex items-center justify-center gap-1.5 text-[11px] font-bold hover:bg-rose-100 transition-colors shrink-0"
                              >
                                <X size={13} /> Reject
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Reject Form (inline) */}
                        {rejectingSlotIndex === idx && !assign.rejected && (
                          <div className="mt-3 pt-3 border-t border-rose-200 bg-rose-50 p-3 rounded-lg">
                            <div className="flex flex-wrap items-end gap-3">
                              <div className="flex-1 min-w-[200px] space-y-1">
                                <label className="text-xs font-bold text-rose-700">
                                  Alasan Reject
                                </label>
                                <select
                                  value={rejectReason}
                                  onChange={(e) =>
                                    setRejectReason(e.target.value)
                                  }
                                  className="w-full h-10 px-3 bg-white border border-rose-300 rounded-md text-sm font-medium text-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                >
                                  <option value="truck_unavailable">
                                    Truk tidak tersedia
                                  </option>
                                  <option value="vendor_cancelled">
                                    Vendor batal
                                  </option>
                                  <option value="driver_unavailable">
                                    Sopir tidak tersedia
                                  </option>
                                  <option value="cost_too_high">
                                    Biaya terlalu tinggi
                                  </option>
                                  <option value="other">Lainnya</option>
                                </select>
                              </div>
                              <div className="flex-1 min-w-[200px] space-y-1">
                                <label className="text-xs font-semibold text-slate-500">
                                  Catatan (opsional)
                                </label>
                                <input
                                  type="text"
                                  value={rejectNote}
                                  onChange={(e) =>
                                    setRejectNote(e.target.value)
                                  }
                                  placeholder="Tulis catatan..."
                                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none placeholder:text-slate-400"
                                />
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRejectSlot(
                                      idx,
                                      rejectReason,
                                      rejectNote.trim() || "",
                                    );
                                    setRejectingSlotIndex(null);
                                    setRejectNote("");
                                  }}
                                  className="h-10 px-5 bg-rose-600 text-white rounded-md text-sm font-bold hover:bg-rose-700 transition-colors"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingSlotIndex(null);
                                    setRejectNote("");
                                  }}
                                  className="h-10 px-5 bg-white text-slate-600 border border-slate-300 rounded-md text-sm font-bold hover:bg-slate-50 transition-colors"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Multi-Document Dropzone & Manifest Manager for Driver */}
                      <div className="mt-3 pt-3 border-t border-slate-200/80 bg-blue-50/40 border border-blue-100 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FolderGit2 size={15} className="text-blue-600" />
                            <div>
                              <span className="text-[11px] font-black uppercase text-blue-950 tracking-wide">
                                Dokumen Pengantar & Manifest (Untuk Supir)
                              </span>
                              <p className="text-[10px] text-slate-500 font-medium">
                                Unggah Surat Jalan, Manifest Multidrop, atau
                                Instruksi Khusus yang akan dibuka supir di HP.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {uploadingSlotIndex === idx && (
                              <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1 animate-pulse">
                                <Loader2 size={12} className="animate-spin" />{" "}
                                Mengunggah...
                              </span>
                            )}
                            <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-md text-[11px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all shadow-sm">
                              <Upload size={13} /> Upload File / PDF
                              <input
                                type="file"
                                multiple
                                accept=".pdf,image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleUploadDocuments(idx, e.target.files)
                                }
                                disabled={uploadingSlotIndex === idx}
                              />
                            </label>
                          </div>
                        </div>

                        {/* Uploaded Documents List */}
                        {assign.assignment_documents &&
                        assign.assignment_documents.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {assign.assignment_documents.map(
                              (doc: any, dIdx: number) => (
                                <div
                                  key={doc.id || dIdx}
                                  className="bg-white border border-blue-200/80 rounded-lg p-2.5 flex items-center justify-between gap-2 shadow-sm"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                      {doc.name?.endsWith(".pdf") ||
                                      doc.file_type?.includes("pdf") ? (
                                        <FileText
                                          size={16}
                                          className="text-red-500"
                                        />
                                      ) : (
                                        <ImageIcon
                                          size={16}
                                          className="text-blue-500"
                                        />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p
                                        className="text-xs font-bold text-slate-800 truncate"
                                        title={doc.name}
                                      >
                                        {doc.name}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <select
                                          value={doc.type || "SURAT_JALAN"}
                                          onChange={(e) =>
                                            handleUpdateAssignmentDocType(
                                              idx,
                                              dIdx,
                                              e.target.value,
                                            )
                                          }
                                          className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                          <option value="SURAT_JALAN">
                                            SURAT JALAN
                                          </option>
                                          <option value="MANIFEST_CARGO">
                                            MANIFEST MULTIDROP
                                          </option>
                                          <option value="POD_BLANKO">
                                            BLANKO POD
                                          </option>
                                          <option value="INSTRUKSI_KERJA">
                                            INSTRUKSI KERJA / K3
                                          </option>
                                          <option value="LAINNYA">
                                            LAINNYA
                                          </option>
                                        </select>
                                        <span className="text-[9px] text-slate-400 font-medium">
                                          {doc.file_size || ""}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewDocUrl(doc.file_url)
                                      }
                                      className="w-7 h-7 rounded bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors border border-slate-200"
                                      title="Preview Dokumen"
                                    >
                                      <Eye size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveAssignmentDoc(idx, dIdx)
                                      }
                                      className="w-7 h-7 rounded bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors border border-red-200"
                                      title="Hapus Dokumen"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <div className="border border-dashed border-blue-200 rounded-lg py-3 text-center bg-white/60">
                            <p className="text-[11px] font-bold text-slate-400 italic">
                              Belum ada dokumen yang diunggah untuk supir di
                              unit ini.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-200 bg-white sticky bottom-0 z-10 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-4 text-slate-600">
            <ShieldCheck size={20} className="text-slate-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Status Penugasan:{" "}
                <span className="text-emerald-600 font-bold">
                  Assigned {assignedCount}
                </span>{" "}
                /{" "}
                <span className="text-amber-600 font-bold">
                  Remaining {remainingCount} JO
                </span>
              </p>
              <p className="text-xs text-slate-500">
                Total {totalJOCount} Job Orders dalam Work Order ini
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <button
              onClick={handleSaveDraft}
              disabled={assigning}
              className="flex-1 md:flex-none px-6 h-10 rounded-md font-medium text-sm bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Save size={16} /> Save Draft
            </button>
            {onHandover && (
              <button
                type="button"
                onClick={() => handleSave(onHandover)}
                disabled={assigning}
                className="flex-1 md:flex-none px-6 h-10 rounded-md font-medium text-sm bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <AlertTriangle size={16} /> Handover to HQ
              </button>
            )}
            <button
              onClick={handleClose}
              className="flex-1 md:flex-none px-8 h-11 sm:h-14 rounded-xl sm:rounded-2xl font-bold sm:font-black text-xs uppercase tracking-widest bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all border border-slate-200"
              disabled={assigning}
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave()}
              disabled={assigning}
              className="flex-1 md:flex-none px-8 h-11 sm:h-14 rounded-xl sm:rounded-2xl font-bold sm:font-black text-xs uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_20px_rgba(79,70,229,0.25)] hover:shadow-[0_4px_30px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {assigning ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Processing...
                </>
              ) : (
                <>
                  <CheckCircle size={18} /> Confirm Assignments
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <VendorSendBox
        open={vendorSendOpen}
        onClose={() => setVendorSendOpen(false)}
        woNumber={item?.work_orders?.wo_number || ""}
        tenantName={profile?.tenants?.name || ""}
        items={item ? [item] : []}
      />

      <GroundStaffSendBox
        open={groundStaffSendOpen}
        onClose={() => setGroundStaffSendOpen(false)}
        woNumber={item?.work_orders?.wo_number || ""}
        tenantName={profile?.tenants?.name || ""}
        executionDate={item?.work_orders?.execution_date || ""}
        executionTime={item?.work_orders?.execution_time || ""}
        tenantId={profile?.tenant_id || ""}
        origin={(itemData as any)?.shipper_name || ""}
        destination={(itemData as any)?.recipient_name || ""}
        truckCount={itemData?.unit_count || existingJOs.length || 1}
        jobOrderIds={(existingJOs || []).map((j: any) => j.id)}
      />

      {/* Document Preview Modal */}
      {previewDocUrl && (
        <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative bg-slate-900 rounded-3xl p-4 w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-white">
              <span className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Eye className="text-blue-400" size={18} /> Preview Dokumen
              </span>
              <div className="flex items-center gap-3">
                <a
                  href={previewDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all"
                >
                  <Download size={14} /> Download
                </a>
                <button
                  onClick={() => setPreviewDocUrl(null)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-950 rounded-2xl flex items-center justify-center min-h-[60vh]">
              {previewDocUrl.toLowerCase().includes(".pdf") ? (
                <iframe
                  src={previewDocUrl}
                  className="w-full h-[75vh] rounded-xl border-0"
                  title="PDF Preview"
                />
              ) : (
                <img
                  src={previewDocUrl}
                  alt="Preview"
                  className="max-w-full max-h-[75vh] object-contain rounded-xl"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

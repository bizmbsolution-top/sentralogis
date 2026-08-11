/**
 * Shared status taxonomy & display labels for reporting (HQ & SBU).
 * Single source of truth so HQ rollup and per-SBU reports agree.
 */
import {
  JO_DONE_STATUSES,
  JO_REJECTED_STATUSES,
  JO_ACTIVE_STATUSES,
  JO_PENDING_ASSIGNMENT_STATUSES,
} from "../domain/jo/status";

export const COMPLETED_STATUSES = [
  ...JO_DONE_STATUSES,
  "delivered",
  "finished",
  "received",
  "paid",
] as const;

export const REJECTED_STATUSES = [...JO_REJECTED_STATUSES] as const;

/** Expand a short filter key (done/rejected/...) into the full set of raw statuses. */
export function getMappedStatuses(filters: string[]): string[] {
  const expanded: string[] = [];
  filters.forEach((f) => {
    const lower = f.toLowerCase();
    if (lower === "done" || lower === "selesai" || lower === "completed") {
      expanded.push(
        "completed",
        "done",
        "finished",
        "delivered",
        "selesai",
        "received",
        "paid",
        "verified",
        "ready_for_billing",
      );
    } else if (lower === "rejected" || lower === "dibatalkan" || lower === "cancelled") {
      expanded.push("rejected", "cancelled", "dibatalkan", "handover_rejected");
    } else if (lower === "on_journey" || lower === "dalam perjalanan" || lower === "in_progress") {
      expanded.push("in_progress", "on_journey", "on_road", "picking_up", "delivering", "dalam perjalanan", "berangkat dari lokasi muat");
    } else if (lower === "pending" || lower === "menunggu berangkat" || lower === "assigned" || lower === "idle" || lower === "new") {
      expanded.push("pending", "assigned", "accepted", "new", "idle", "draft", "menunggu berangkat", "order diterima");
    } else {
      expanded.push(lower);
    }
  });
  return Array.from(new Set(expanded.map((s) => s.toLowerCase())));
}

/** Indonesian display label for a raw JO status (used in both HQ & SBU tables). */
export function formatJoStatus(status: string | null | undefined): string {
  if (!status) return "-";
  const upper = status.toUpperCase().trim();
  if ((JO_PENDING_ASSIGNMENT_STATUSES as readonly string[]).includes(upper) ||
      ["ASSIGNED", "ACCEPTED", "MENUNGGU BERANGKAT", "ORDER DITERIMA", "NEW", "IDLE", "DRAFT"].includes(upper)) {
    return "MENUNGGU BERANGKAT";
  }
  if ((JO_ACTIVE_STATUSES as readonly string[]).includes(upper) ||
      ["IN_PROGRESS", "ON_JOURNEY", "ON ROAD", "PICKING_UP", "DELIVERING", "DALAM PERJALANAN", "BERANGKAT DARI LOKASI MUAT"].includes(upper)) {
    return "DALAM PERJALANAN";
  }
  if ((JO_DONE_STATUSES as readonly string[]).includes(upper) ||
      ["DELIVERED", "FINISHED", "RECEIVED", "PAID"].includes(upper)) {
    return "SELESAI";
  }
  if ((JO_REJECTED_STATUSES as readonly string[]).includes(upper) ||
      ["CANCELLED", "DIBATALKAN"].includes(upper)) {
    return "DIBATALKAN";
  }
  return upper.replace(/_/g, " ");
}

/** Simple badge status used by HQ (raw uppercase + REJECTED). */
export function simpleJoStatus(status: string | null | undefined): string {
  const lower = (status || "").toLowerCase();
  if (REJECTED_STATUSES.includes(lower as any)) return "REJECTED";
  if (COMPLETED_STATUSES.includes(lower as any)) return "DONE";
  return (status || "").toUpperCase();
}

export function isCompletedStatus(status: string | null | undefined): boolean {
  return COMPLETED_STATUSES.includes((status || "").toLowerCase() as any);
}

export function isRejectedStatus(status: string | null | undefined): boolean {
  return REJECTED_STATUSES.includes((status || "").toLowerCase() as any);
}

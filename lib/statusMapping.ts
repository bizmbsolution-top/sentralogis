// lib/statusMapping.ts
/**
 * Centralised status mapping between internal English codes and Indonesian display strings.
 * All parts of the system (API, UI, DB migrations) must import this module.
 */
export const STATUS_MAP: Record<string, { id: string; label: string }> = {
  accepted: { id: 'accepted', label: 'ORDER DITERIMA' },
  in_progress: { id: 'in_progress', label: 'DALAM PERJALANAN' },
  completed: { id: 'completed', label: 'PEKERJAAN SELESAI' },
  // add further mappings as needed
};

export const toIndonesian = (english: string): string =>
  STATUS_MAP[english]?.label ?? english;

export const toEnglish = (indonesian: string): string => {
  const entry = Object.values(STATUS_MAP).find(e => e.label === indonesian);
  return entry?.id ?? indonesian;
};

export {
  JO_DONE_STATUSES,
  JO_REJECTED_STATUSES,
  JO_ACTIVE_STATUSES,
  categorizeJoStatus,
  isJoDone,
  isJoRejected,
  isJoActive,
  isJoBlockingAsset,
  filterActiveJobOrders,
} from './domain/jo/status';

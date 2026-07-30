export function parseUTC(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && dateStr.includes('T')) {
    return new Date(dateStr + '+00:00');
  }
  return new Date(dateStr);
}

export function formatTimeUTC(dateStr: string | null | undefined, locale: string = 'id-ID'): string {
  const d = parseUTC(dateStr);
  if (!d) return '-';
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function formatDateUTC(dateStr: string | null | undefined, locale: string = 'id-ID'): string {
  const d = parseUTC(dateStr);
  if (!d) return '--:--';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) + ', ' +
    d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function getTimeUTC(dateStr: string | null | undefined): number | null {
  const d = parseUTC(dateStr);
  return d ? d.getTime() : null;
}

export function diffDurationUTC(start: string | null | undefined, end: string | null | undefined = null): string | null {
  const startMs = getTimeUTC(start);
  if (startMs === null) return null;
  const endMs = end ? getTimeUTC(end) : Date.now();
  if (endMs === null) return null;
  const diffMs = endMs - startMs;
  if (diffMs < 0) return null;
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (hours > 0) return `${hours} jam ${mins} mnt`;
  return `${mins} mnt`;
}

// [AI] Correlation ID system — trace single workflow end-to-end

let counter = 0;

function pad(num: number, len: number): string {
  return String(num).padStart(len, '0');
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1, 2);
  const d = pad(date.getDate(), 2);
  return `${y}${m}${d}`;
}

export function generateCorrelationId(prefix: string = 'REQ'): string {
  counter = (counter + 1) % 99999;
  const datePart = formatDate(new Date());
  const seqPart = pad(counter, 5);
  return `${prefix}-${datePart}-${seqPart}`;
}

export function generateWorkflowId(prefix: string = 'WF'): string {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${now}${rand}`;
}

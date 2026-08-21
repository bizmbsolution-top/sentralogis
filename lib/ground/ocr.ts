import Tesseract from 'tesseract.js';

let workerInstance: Tesseract.Worker | null = null;
let simWorkerInstance: Tesseract.Worker | null = null;

async function getWorker(): Promise<Tesseract.Worker> {
  if (workerInstance) return workerInstance;
  const worker = await Tesseract.createWorker('ind+eng', 1, {
    logger: () => {},
  });
  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789- ',
  });
  workerInstance = worker;
  return worker;
}

async function getSimWorker(): Promise<Tesseract.Worker> {
  if (simWorkerInstance) return simWorkerInstance;
  const worker = await Tesseract.createWorker('ind+eng', 1, {
    logger: () => {},
  });
  await worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
  });
  simWorkerInstance = worker;
  return worker;
}

function normalizePlate(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const parts = cleaned.match(/^([A-Z]{1,3})(\d{1,4})([A-Z]{1,3})$/);
  if (parts) {
    return `${parts[1]} ${parts[2]} ${parts[3]}`;
  }
  return cleaned;
}

function normalizeContainer(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function extractNameFromSimText(rawText: string): string {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  let name = '';
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes('nama') || lower.includes('name')) {
      const nextLine = lines[i + 1];
      if (nextLine && !nextLine.toLowerCase().includes('nama') && !nextLine.match(/^\d+$/)) {
        name = nextLine.replace(/[^A-Za-z\s\.]/g, '').trim();
        break;
      }
    }
  }
  if (!name) {
    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();
      if (lower.includes('sim') && i + 1 < lines.length) {
        const candidate = lines[i + 1].replace(/[^A-Za-z\s\.]/g, '').trim();
        if (candidate.length > 3 && !candidate.match(/^\d+$/)) {
          name = candidate;
          break;
        }
      }
    }
  }
  if (!name) {
    for (const line of lines) {
      const cleaned = line.replace(/[^A-Za-z\s]/g, '').trim();
      const words = cleaned.split(/\s+/);
      if (words.length >= 2 && words.every(w => w.length > 1) && cleaned.length > 5) {
        name = cleaned;
        break;
      }
    }
  }
  return name;
}

function extractSimNumber(rawText: string): string {
  const cleaned = rawText.replace(/\s+/g, '');
  const match = cleaned.match(/(\d{12,16})/);
  return match ? match[1] : '';
}

export async function recognizeLicensePlate(imageSource: string | File): Promise<{
  rawText: string;
  normalizedPlate: string;
  confidence: number;
}> {
  const worker = await getWorker();
  const { data } = await worker.recognize(imageSource);
  const rawText = data.text.trim();
  const normalizedPlate = normalizePlate(rawText);

  return {
    rawText,
    normalizedPlate,
    confidence: data.confidence,
  };
}

export async function recognizeContainerNumber(imageSource: string | File): Promise<{
  rawText: string;
  normalizedNumber: string;
  confidence: number;
}> {
  const worker = await getWorker();
  const { data } = await worker.recognize(imageSource);
  const rawText = data.text.trim();
  const normalizedNumber = normalizeContainer(rawText);

  return {
    rawText,
    normalizedNumber,
    confidence: data.confidence,
  };
}

export function matchPlate(ocrPlate: string, expectedPlate: string): boolean {
  const a = ocrPlate.replace(/\s+/g, '').toUpperCase();
  const b = expectedPlate.replace(/\s+/g, '').toUpperCase();
  if (a === b) return true;
  if (a.length >= 5 && b.length >= 5 && a.includes(b)) return true;
  if (b.includes(a) && a.length >= 5) return true;
  return false;
}

export function matchContainer(ocrContainer: string, expectedContainer: string): boolean {
  const a = ocrContainer.replace(/\s+/g, '').toUpperCase();
  const b = expectedContainer.replace(/\s+/g, '').toUpperCase();
  return a === b;
}

export async function recognizeSimCard(imageSource: string | File): Promise<{
  rawText: string;
  extractedName: string;
  extractedSimNumber: string;
  confidence: number;
}> {
  const worker = await getSimWorker();
  const { data } = await worker.recognize(imageSource);
  const rawText = data.text.trim();

  return {
    rawText,
    extractedName: extractNameFromSimText(rawText),
    extractedSimNumber: extractSimNumber(rawText),
    confidence: data.confidence,
  };
}

export function matchDriverName(ocrName: string, expectedName: string): { match: boolean; score: number } {
  const a = ocrName.toUpperCase().replace(/[^A-Z\s]/g, '').trim();
  const b = expectedName.toUpperCase().replace(/[^A-Z\s]/g, '').trim();
  if (!a || !b) return { match: false, score: 0 };

  const aParts = a.split(/\s+/).filter(Boolean);
  const bParts = b.split(/\s+/).filter(Boolean);

  const common = aParts.filter(p => bParts.includes(p)).length;
  const maxLen = Math.max(aParts.length, bParts.length);
  const score = maxLen > 0 ? common / maxLen : 0;

  return {
    match: score >= 0.5 || a.includes(b) || b.includes(a),
    score,
  };
}

export async function terminateWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.terminate();
    workerInstance = null;
  }
  if (simWorkerInstance) {
    await simWorkerInstance.terminate();
    simWorkerInstance = null;
  }
}

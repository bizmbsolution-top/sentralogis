import Tesseract from 'tesseract.js';

let workerInstance: Tesseract.Worker | null = null;

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

export async function terminateWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.terminate();
    workerInstance = null;
  }
}

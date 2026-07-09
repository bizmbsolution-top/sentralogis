'use client';

let compressionWorker: Worker | null = null;

export function initCompressionWorker(): Worker | null {
  if (typeof window === 'undefined') return null;
  if (!compressionWorker) {
    try {
      // Only use worker if OffscreenCanvas is available (older Android WebViews lack it)
      if (typeof OffscreenCanvas !== 'undefined') {
        const testCanvas = new OffscreenCanvas(1, 1);
        if (testCanvas instanceof OffscreenCanvas) {
          compressionWorker = new Worker(new URL('./compression-worker.js', import.meta.url));
        }
      }
    } catch (e) {
      console.warn('Worker init failed', e);
      compressionWorker = null;
    }
  }
  return compressionWorker;
}

export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<File> {
  // Skip compression for small files or when quality is already high
  if (file.size < 100 * 1024 && quality >= 0.8) {
    return file;
  }

  const worker = initCompressionWorker();
  if (!worker) {
    return compressMainThread(file, maxWidth, maxHeight, quality);
  }

  return new Promise((resolve) => {
    const onMessage = (e: MessageEvent) => {
      worker.removeEventListener('message', onMessage);
      const result = e.data;
      if (result?.file) {
        resolve(result.file instanceof File ? result.file : file);
      } else if (result?.error) {
        console.warn(`Worker compression error: ${result.error}, falling back to main thread`);
        resolve(compressMainThread(file, maxWidth, maxHeight, quality));
      } else {
        resolve(file);
      }
    };
    const onError = () => {
      worker.removeEventListener('error', onError);
      console.warn('Worker error, falling back to main thread');
      resolve(compressMainThread(file, maxWidth, maxHeight, quality));
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage({ file, maxWidth, maxHeight, quality });
  });
}

function compressMainThread(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      resolve(file);
      return;
    }
    img.onload = () => {
      let targetWidth = img.width;
      let targetHeight = img.height;
      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
        targetWidth = Math.round(targetWidth * ratio);
        targetHeight = Math.round(targetHeight * ratio);
      }
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}
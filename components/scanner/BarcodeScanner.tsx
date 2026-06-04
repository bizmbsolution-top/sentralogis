'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, SwitchCamera } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScanSuccess, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>('');
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    // Check available cameras
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameras(devices);
        // Default to rear camera if available
        const rearCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
        setActiveCameraId(rearCamera ? rearCamera.id : devices[0].id);
      }
    }).catch(err => {
      console.error("Error getting cameras", err);
    });

    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (activeCameraId && !isStarted) {
      startScanner(activeCameraId);
    }
  }, [activeCameraId]);

  const startScanner = async (cameraId: string) => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }

      scannerRef.current = new Html5Qrcode("reader");
      
      await scannerRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Play beep sound (optional)
          if (navigator.vibrate) navigator.vibrate(200);
          onScanSuccess(decodedText);
          stopScanner();
          onClose();
        },
        (errorMessage) => {
          // ignore scan errors, they happen continuously until a code is found
        }
      );
      setIsStarted(true);
    } catch (err) {
      console.error("Error starting scanner", err);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.error("Error stopping scanner", e);
      }
    }
    setIsStarted(false);
  };

  const switchCamera = () => {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      setActiveCameraId(cameras[nextIndex].id);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="p-4 flex items-center justify-between text-white border-b border-white/20 bg-black/50 backdrop-blur-md">
        <h2 className="font-bold flex items-center gap-2"><Camera size={18} /> Scan Barcode</h2>
        <button onClick={() => { stopScanner(); onClose(); }} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        <div id="reader" className="w-full max-w-md bg-black"></div>
      </div>

      <div className="p-6 pb-safe bg-black/90 border-t border-white/10 flex justify-center">
        {cameras.length > 1 && (
          <button 
            onClick={switchCamera}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-full font-bold hover:bg-white/20 transition-colors"
          >
            <SwitchCamera size={20} />
            Switch Camera
          </button>
        )}
      </div>
    </div>
  );
}

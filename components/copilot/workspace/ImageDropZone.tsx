'use client';

import React, { useState, useCallback } from 'react';
import { UploadCloud, FileImage, Image as ImageIcon, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export interface ImageUpload {
  id: string;
  fileName: string;
  fileType: 'POD' | 'Container' | 'Seal' | 'Surat Jalan' | 'WhatsApp Screenshot' | 'Unknown';
  previewUrl: string;
  ocrStatus: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  extractedData?: Record<string, string>;
}

export interface ImageDropZoneProps {
  onUpload: (file: File) => void;
  uploads: ImageUpload[];
}

export default function ImageDropZone({ onUpload, uploads }: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(file => {
        if (file.type.startsWith('image/')) {
          onUpload(file);
        }
      });
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) onUpload(file);
      }
    }
  }, [onUpload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => {
        onUpload(file);
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'PENDING': return <div className="w-4 h-4 rounded-full bg-amber-400 animate-pulse" />;
      case 'PROCESSING': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'DONE': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'FAILED': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-4" onPaste={handlePaste}>
      {/* Drop Zone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden ${
          isDragging 
            ? 'border-blue-500 bg-blue-50 scale-[1.02] shadow-md' 
            : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
        }`}
      >
        <input 
          type="file" 
          accept="image/*" 
          multiple 
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
        />
        
        <div className="flex flex-col items-center text-center gap-3 z-0 pointer-events-none">
          <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400 mb-2">
            <UploadCloud className={`w-7 h-7 ${isDragging ? 'text-blue-500' : ''}`} />
          </div>
          <h3 className="font-semibold text-slate-800 text-lg">Drop images here or Ctrl+V to paste</h3>
          <p className="text-slate-500 text-sm max-w-sm">
            Upload PODs, delivery notes, or container photos. Our AI will automatically extract text and details.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {['POD', 'Surat Jalan', 'Container', 'Seal', 'WA Screenshot'].map(type => (
              <span key={type} className="text-[10px] font-medium px-2 py-1 bg-slate-200 text-slate-600 rounded">
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Uploaded Cards Grid */}
      {uploads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {uploads.map(upload => (
            <div key={upload.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col group">
              <div className="relative h-32 bg-slate-100 border-b border-slate-100 overflow-hidden">
                <img 
                  src={upload.previewUrl} 
                  alt={upload.fileName} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur text-[10px] font-bold px-2 py-0.5 rounded shadow-sm border border-slate-200">
                  {upload.fileType}
                </div>
              </div>
              
              <div className="p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm font-medium text-slate-700 truncate">{upload.fileName}</span>
                  </div>
                  <div className="shrink-0" title={`OCR: ${upload.ocrStatus}`}>
                    {getStatusIcon(upload.ocrStatus)}
                  </div>
                </div>

                {upload.extractedData && Object.keys(upload.extractedData).length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Extracted Data</span>
                    {Object.entries(upload.extractedData).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-slate-500">{key}:</span>
                        <span className="font-medium text-slate-800 text-right truncate pl-2">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

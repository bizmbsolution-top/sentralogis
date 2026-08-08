import React from 'react';
import { FileImage, FileText, FileSpreadsheet, Maximize2 } from 'lucide-react';

interface FilePreviewCardProps {
  fileName: string;
  fileType: 'IMAGE' | 'PDF' | 'EXCEL';
  previewUrl?: string;
  ocrStatus?: 'PENDING' | 'DONE' | 'FAILED';
  extractedData?: Record<string, string>;
}

export default function FilePreviewCard({ fileName, fileType, previewUrl, ocrStatus, extractedData }: FilePreviewCardProps) {
  
  const iconMap = {
    'IMAGE': <FileImage className="w-8 h-8 text-blue-500" />,
    'PDF': <FileText className="w-8 h-8 text-rose-500" />,
    'EXCEL': <FileSpreadsheet className="w-8 h-8 text-emerald-500" />
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 w-64 shadow-sm my-2">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-slate-50 rounded-lg shrink-0">
          {iconMap[fileType]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 truncate" title={fileName}>{fileName}</p>
          <p className="text-xs text-slate-500">{fileType}</p>
        </div>
      </div>
      
      {previewUrl && fileType === 'IMAGE' && (
        <div className="relative rounded-md overflow-hidden bg-slate-100 h-24 mb-3 group">
          <img src={previewUrl} alt={fileName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
            <Maximize2 className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      {ocrStatus && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Analysis</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ocrStatus === 'DONE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {ocrStatus}
            </span>
          </div>
          
          {extractedData && Object.keys(extractedData).length > 0 && (
            <div className="space-y-1">
              {Object.entries(extractedData).map(([key, val]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-slate-500 truncate mr-2">{key}</span>
                  <span className="text-slate-900 font-medium truncate">{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

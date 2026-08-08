import React from 'react';
import { X, FileImage, FileText, FileSpreadsheet } from 'lucide-react';

interface UploadPreviewCardProps {
  fileName: string;
  fileType: 'IMAGE' | 'PDF' | 'EXCEL';
  onRemove: () => void;
}

export default function UploadPreviewCard({ fileName, fileType, onRemove }: UploadPreviewCardProps) {
  const iconMap = {
    'IMAGE': <FileImage className="w-5 h-5 text-blue-500" />,
    'PDF': <FileText className="w-5 h-5 text-rose-500" />,
    'EXCEL': <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
  };

  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md p-1.5 pr-2 w-max max-w-xs shadow-sm mb-2 group">
      <div className="p-1 bg-slate-50 rounded">
        {iconMap[fileType]}
      </div>
      <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]" title={fileName}>
        {fileName}
      </span>
      <button 
        onClick={onRemove}
        className="ml-auto text-slate-400 hover:text-slate-600 p-0.5 rounded-sm hover:bg-slate-100 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

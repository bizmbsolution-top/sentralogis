import React from 'react';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

export default function GlassInput({ label, icon, className = '', ...props }: GlassInputProps) {
  return (
    <div className="space-y-2 w-full">
      {label && <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{label}</label>}
      <div className="relative group">
        {icon && (
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
            {icon}
          </div>
        )}
        <input 
          className={`w-full bg-slate-900/50 border border-white/5 p-4 ${icon ? 'pl-14' : 'pl-5'} rounded-2xl text-white text-sm font-bold placeholder:text-slate-700 outline-none focus:border-blue-500/50 focus:bg-slate-900 transition-all ${className}`}
          {...props}
        />
      </div>
    </div>
  );
}

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, helperText, icon, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="text-sm font-semibold text-slate-700 ml-0.5">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full bg-white border rounded-lg py-2.5 transition-all outline-none text-sm
            ${icon ? 'pl-11 pr-4' : 'px-4'}
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
              : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
            }
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs font-medium text-red-500 ml-0.5">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 ml-0.5">{helperText}</p>}
    </div>
  );
}

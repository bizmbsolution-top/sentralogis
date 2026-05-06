import React from 'react';

// 🏷️ Badge Component
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    default: "bg-slate-100 text-slate-700 border-slate-200"
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// 📊 ProgressBar Component
interface ProgressBarProps {
  value: number;
  max: number;
  variant?: 'primary' | 'success' | 'warning';
  className?: string;
}

export function ProgressBar({ value, max, variant = 'primary', className = '' }: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const variants = {
    primary: "bg-blue-600",
    success: "bg-emerald-500",
    warning: "bg-amber-500"
  };

  return (
    <div className={`w-full h-2 bg-slate-100 rounded-full overflow-hidden ${className}`}>
      <div 
        className={`h-full transition-all duration-500 ease-out rounded-full ${variants[variant]}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

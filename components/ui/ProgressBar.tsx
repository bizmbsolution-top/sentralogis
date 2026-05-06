import React from 'react';

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

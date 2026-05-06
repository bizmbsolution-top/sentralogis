import React from 'react';

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
}

export default function GradientButton({ children, variant = 'primary', className = '', ...props }: GradientButtonProps) {
  const variants = {
    primary: 'from-blue-600 to-indigo-600 shadow-blue-500/20',
    secondary: 'from-slate-700 to-slate-800 shadow-slate-500/10',
    danger: 'from-rose-600 to-red-600 shadow-rose-500/20',
    success: 'from-emerald-600 to-teal-600 shadow-emerald-500/20'
  };

  return (
    <button 
      className={`px-6 py-3 bg-gradient-to-r ${variants[variant]} text-white rounded-2xl text-xs font-black uppercase italic tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

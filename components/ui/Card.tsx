import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 shadow-sm transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 border-b border-slate-100 ${className}`}>{children}</div>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-xl ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-lg font-semibold text-slate-900 ${className}`}>{children}</h3>;
}

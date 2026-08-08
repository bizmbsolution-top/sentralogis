import React from 'react';

interface ConfidenceBadgeProps {
  score: number; // 0 to 1
}

export default function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const percentage = Math.round(score * 100);
  
  let color = 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (score < 0.9) color = 'bg-amber-100 text-amber-700 border-amber-200';
  if (score < 0.7) color = 'bg-rose-100 text-rose-700 border-rose-200';

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {percentage}% Confidence
    </span>
  );
}

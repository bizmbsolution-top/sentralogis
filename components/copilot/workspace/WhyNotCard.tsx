'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, XCircle } from 'lucide-react';

export interface AlternativeAction {
  action: string;
  reason: string;
}

interface WhyNotCardProps {
  alternatives: AlternativeAction[];
}

export default function WhyNotCard({ alternatives }: WhyNotCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!alternatives || alternatives.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-sm text-slate-300 hover:bg-slate-700/30 transition-colors"
      >
        <span className="font-medium">Why not other actions?</span>

        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 border-t border-slate-700/30 bg-slate-900/20">
              <div className="space-y-3 mt-3">
                {alternatives.map((alt, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-xs"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />

                    <div>
                      <div className="font-medium text-slate-300 line-through decoration-rose-500/30">
                        {alt.action}
                      </div>

                      <div className="text-slate-500 mt-0.5">
                        {alt.reason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

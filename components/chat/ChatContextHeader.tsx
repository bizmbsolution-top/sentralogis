"use client";

import { useState, useEffect } from 'react';
import { useChat } from '@/lib/contexts/ChatContext';
import { FileText, Truck, Package, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

interface ChatContextHeaderProps {
  contextType: 'job_order' | 'work_order' | 'direct' | 'group';
  contextId: string;
  title?: string | null;
}

interface WOJOContext {
  work_order: any;
  items: {
    id: string;
    wo_id: string;
    item_code: string;
    sbu_type: string;
    status: string;
    job_orders: any[];
  }[];
}

export default function ChatContextHeader({ contextType, contextId, title }: ChatContextHeaderProps) {
  const { fetchWOJOContext } = useChat();
  const [woContext, setWoContext] = useState<WOJOContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (contextType === 'work_order' && contextId) {
      setLoading(true);
      fetchWOJOContext(contextId).then((ctx) => {
        setWoContext(ctx);
        setLoading(false);
      });
    }
  }, [contextType, contextId, fetchWOJOContext]);

  if (contextType === 'direct' || contextType === 'group') return null;
  if (loading) {
    return (
      <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
        <Loader2 size={14} className="text-white/40 animate-spin" />
        <span className="text-white/40 text-xs">Loading context...</span>
      </div>
    );
  }

  if (contextType === 'job_order') {
    return (
      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <div className="flex items-center gap-2">
          <Truck size={14} className="text-blue-400" />
          <span className="text-white text-sm font-semibold">{title || contextId.slice(0, 8)}</span>
        </div>
        <p className="text-white/40 text-xs mt-1">Job Order Context</p>
      </div>
    );
  }

  if (contextType === 'work_order' && woContext) {
    const wo = woContext.work_order;
    return (
      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={14} className="text-amber-400" />
          <span className="text-white text-sm font-semibold">{wo?.wo_number || title}</span>
          <span className="text-white/30 text-xs">•</span>
          <span className="text-white/50 text-xs">{wo?.customer?.name}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/40 mb-2">
          <span>Status: <span className="text-white/60">{wo?.status}</span></span>
          <span>{woContext.items.length} item{woContext.items.length !== 1 ? 's' : ''}</span>
        </div>

        {woContext.items.map((item) => {
          const isExpanded = expandedItems.has(item.id);
          return (
            <div key={item.id} className="mt-2">
              <button
                onClick={() => {
                  setExpandedItems((prev) => {
                    const next = new Set(prev);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  });
                }}
                className="flex items-center gap-2 text-xs text-white/60 hover:text-white/80 transition-colors"
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <Package size={12} className="text-blue-400" />
                <span>{item.item_code}</span>
                <span className="text-white/30">•</span>
                <span>{item.sbu_type}</span>
                <span className="text-white/30">•</span>
                <span>{item.job_orders.length} JO{item.job_orders.length !== 1 ? 's' : ''}</span>
              </button>

              {isExpanded && item.job_orders.length > 0 && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.job_orders.map((jo) => (
                    <div key={jo.id} className="flex items-center gap-2 text-xs text-white/50">
                      <Truck size={10} className="text-blue-400" />
                      <span>{jo.jo_number}</span>
                      {jo.fleet && <span>• {jo.fleet.plate_number}</span>}
                      {jo.driver && <span>• {jo.driver.name}</span>}
                      <span className="text-white/30">•</span>
                      <span className="text-white/40">{jo.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

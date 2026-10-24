"use client";

import React from "react";
import { Bot } from "lucide-react";
import { useCopilotV2 } from "./CopilotV2Provider";
import type { EntityReference } from "./types";

const IS_PRODUCTION = typeof process !== "undefined" && process.env.NODE_ENV === "production";

export function ContextPanel() {
  const { selectEntity, activeEntityRefs } = useCopilotV2();

  const items = IS_PRODUCTION
    ? (Array.isArray(activeEntityRefs) ? activeEntityRefs : [])
    : [];

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2" aria-label="Active context">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Active Context</div>
        {items.length === 0 ? (
          <div className="text-[10px] text-slate-400 px-1 py-2">No active context</div>
        ) : (
          items.map((entity: EntityReference) => (
            <button
              key={entity.id}
              onClick={() =>
                selectEntity({
                  type: entity.type as EntityReference["type"],
                  id: entity.id,
                  label: entity.label,
                  status: entity.status,
                })
              }
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              <span className="text-xs text-slate-700 truncate flex-1">{entity.label}</span>
              {entity.status ? <span className="text-[9px] text-slate-400 shrink-0">{entity.status}</span> : null}
            </button>
          ))
        )}
      </div>
      <div className="border-t border-slate-100 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <Bot className="w-3 h-3" />
          <span>Powered by Sentralogis Intelligence</span>
        </div>
      </div>
    </div>
  );
}

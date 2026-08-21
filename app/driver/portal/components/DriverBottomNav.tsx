"use client";

import React from "react";
import { Home, ClipboardList, User } from "lucide-react";
import { DriverPortalTab } from "./types";

interface DriverBottomNavProps {
  activeTab: DriverPortalTab;
  onTabChange: (tab: DriverPortalTab) => void;
  isDark: boolean;
}

export const DriverBottomNav: React.FC<DriverBottomNavProps> = ({
  activeTab,
  onTabChange,
  isDark,
}) => {
  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 border-t transition-all backdrop-blur-xl ${
        isDark
          ? "bg-slate-950/90 border-slate-850 text-slate-400 shadow-2xl"
          : "bg-white/90 border-slate-200 text-slate-500 shadow-xl"
      }`}
    >
      <div className="max-w-md mx-auto grid grid-cols-3 h-18 px-4 items-center">
        {/* Tab 1: HOME */}
        <button
          type="button"
          onClick={() => onTabChange("home")}
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-all rounded-2xl cursor-pointer ${
            activeTab === "home"
              ? "text-indigo-600 dark:text-indigo-400 font-black scale-105"
              : "hover:text-slate-700 dark:hover:text-slate-200 font-semibold"
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === "home"
                ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                : ""
            }`}
          >
            <Home size={20} />
          </div>
          <span className="text-[10px] uppercase tracking-wider">Home</span>
        </button>

        {/* Tab 2: HISTORI */}
        <button
          type="button"
          onClick={() => onTabChange("history")}
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-all rounded-2xl cursor-pointer ${
            activeTab === "history"
              ? "text-indigo-600 dark:text-indigo-400 font-black scale-105"
              : "hover:text-slate-700 dark:hover:text-slate-200 font-semibold"
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === "history"
                ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                : ""
            }`}
          >
            <ClipboardList size={20} />
          </div>
          <span className="text-[10px] uppercase tracking-wider">Histori</span>
        </button>

        {/* Tab 3: PROFILE */}
        <button
          type="button"
          onClick={() => onTabChange("profile")}
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-all rounded-2xl cursor-pointer ${
            activeTab === "profile"
              ? "text-indigo-600 dark:text-indigo-400 font-black scale-105"
              : "hover:text-slate-700 dark:hover:text-slate-200 font-semibold"
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === "profile"
                ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                : ""
            }`}
          >
            <User size={20} />
          </div>
          <span className="text-[10px] uppercase tracking-wider">Profil</span>
        </button>
      </div>
    </nav>
  );
};

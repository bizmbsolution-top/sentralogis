"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

const THEME_KEY = "sentralogis-driver-theme";
const THEME_CHANGE_EVENT = "sentralogis:theme-changed";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {}
  return "system";
}

function applyThemeClass(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const dark = mode === "dark" || (mode === "system" && getSystemDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const m = readStoredMode();
    setModeState(m);
    applyThemeClass(m);
    setIsDark(m === "dark" || (m === "system" && getSystemDark()));
  }, []);

  // Follow system preference changes when in "system" mode
  useEffect(() => {
    if (mode !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      applyThemeClass(mode);
      setIsDark(getSystemDark());
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [mode]);

  // Sync with external theme changes (e.g. Driver Portal's own toggle)
  useEffect(() => {
    const onThemeChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "light" || detail === "dark" || detail === "system") {
        setModeState(detail);
        applyThemeClass(detail);
        setIsDark(detail === "dark" || (detail === "system" && getSystemDark()));
      }
    };
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChanged);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChanged);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem(THEME_KEY, m);
    } catch {}
    applyThemeClass(m);
    setIsDark(m === "dark" || (m === "system" && getSystemDark()));
  }, []);

  const toggle = useCallback(() => {
    setMode(isDark ? "light" : "dark");
  }, [isDark, setMode]);

  return (
    <ThemeContext.Provider value={{ mode, isDark, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

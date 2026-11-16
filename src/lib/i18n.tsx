import React, { createContext, useContext, useEffect, useState } from "react";
import en from "../locales/en.json";
import fa from "../locales/fa.json";

export type Locale = "en" | "fa";

const dicts: Record<Locale, any> = { en, fa };

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  weekdayName: (day: number) => string;
  weekdayShortName: (day: number) => string;
  formatTime: (minutes: number | null | undefined) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_SHORT_KEYS = [
  "sunShort",
  "monShort",
  "tueShort",
  "wedShort",
  "thuShort",
  "friShort",
  "satShort",
];

function get(obj: any, path: string): any {
  return path.split(".").reduce((a, k) => (a == null ? undefined : a[k]), obj);
}

function interpolate(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s;
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem("cookplans.locale");
      return saved === "fa" ? "fa" : "en";
    } catch {
      return "en";
    }
  });

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("cookplans.locale", l);
    } catch {}
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
  }, [locale]);

  const t = (key: string, vars?: Record<string, string | number>) => {
    const d = dicts[locale];
    const val = get(d, key) ?? get(dicts.en, key) ?? key;
    return interpolate(String(val), vars);
  };

  const weekdayName = (day: number) =>
    t(`weekdays.${WEEKDAY_KEYS[((day % 7) + 7) % 7]}`);
  const weekdayShortName = (day: number) =>
    t(`weekdays.${WEEKDAY_SHORT_KEYS[((day % 7) + 7) % 7]}`);

  const formatTime = (minutes: number | null | undefined) => {
    if (minutes == null) return "—";
    const mm = ((Math.round(minutes) % 1440) + 1440) % 1440;
    const h = Math.floor(mm / 60);
    const m = mm % 60;
    if (locale === "fa") {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    const ampm = h < 12 ? "AM" : "PM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  return (
    <Ctx.Provider value={{ locale, setLocale, t, weekdayName, weekdayShortName, formatTime }}>
      {children}
    </Ctx.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

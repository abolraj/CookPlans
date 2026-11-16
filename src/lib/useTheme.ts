import { useEffect, useState } from "react";

export type Theme = "neobrutalism" | "neobrutalism-dark";

const STORAGE_KEY = "cookplans.theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "neobrutalism" || stored === "neobrutalism-dark") {
        return stored;
      }
    } catch {}
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "neobrutalism-dark"
      : "neobrutalism";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) =>
      t === "neobrutalism" ? "neobrutalism-dark" : "neobrutalism"
    );
  };

  return { theme, toggleTheme, setTheme };
}
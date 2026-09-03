import { createContext, useEffect, useMemo, useState } from "react";

const KEY = "nexusbank.theme";

function systemTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolve(theme) {
  return theme === "system" ? systemTheme() : theme;
}

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem(KEY);
    return ["dark", "light", "system"].includes(saved) ? saved : "system";
  });

  useEffect(() => {
    const apply = (value) => {
      document.documentElement.setAttribute("data-theme", resolve(value));
      document.documentElement.setAttribute("data-theme-preference", value);
      window.localStorage.setItem(KEY, value);
    };

    apply(theme);

    const onExternalThemeChange = (event) => {
      const next = event.detail;
      if (["dark", "light", "system"].includes(next)) setTheme(next);
    };

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (theme === "system") apply("system");
    };

    window.addEventListener("nexusbank:theme-change", onExternalThemeChange);
    media?.addEventListener?.("change", onSystemChange);

    return () => {
      window.removeEventListener("nexusbank:theme-change", onExternalThemeChange);
      media?.removeEventListener?.("change", onSystemChange);
    };
  }, [theme]);

  const setThemePreference = (next) => {
    if (!["dark", "light", "system"].includes(next)) return;
    setTheme(next);
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemePreference,
      toggle: () => setTheme((current) => resolve(current) === "dark" ? "light" : "dark"),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
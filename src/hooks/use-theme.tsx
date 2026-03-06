import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
type ColorScheme = "cosmic" | "classic";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  colorScheme: "cosmic",
  setColorScheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    return (localStorage.getItem("color-scheme") as ColorScheme) || "cosmic";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-cosmic", "theme-classic");
    root.classList.add(`theme-${colorScheme}`);
    localStorage.setItem("color-scheme", colorScheme);
  }, [colorScheme]);

  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.add("transitioning");
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
    setTimeout(() => root.classList.remove("transitioning"), 500);
  };

  const setColorScheme = (scheme: ColorScheme) => {
    const root = document.documentElement;
    root.classList.add("transitioning");
    setColorSchemeState(scheme);
    setTimeout(() => root.classList.remove("transitioning"), 500);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

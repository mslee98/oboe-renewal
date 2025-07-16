import React from "react";
import { createContext, useState, useContext, useEffect } from "react";

const ThemeContext = createContext(undefined);

export const ThemeProvider = ({
  children,
}) => {
  const [theme, setTheme] = useState("light");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    const savedTheme = localStorage.getItem("theme");
    const initialTheme = savedTheme || "light";

    setTheme(initialTheme);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("theme", theme);
      
      // document가 존재하는지 확인 후 클래스 조작
      if (typeof document !== 'undefined') {
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    }
  }, [theme, isInitialized]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

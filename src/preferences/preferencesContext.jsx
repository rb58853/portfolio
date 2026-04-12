import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY_THEME = 'portfolio.theme';
const DEFAULT_THEME = 'dark';

const PreferencesContext = createContext(null);

function getSafeStoredTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const value = window.localStorage.getItem(STORAGE_KEY_THEME);
  return ['dark', 'light'].includes(value) ? value : DEFAULT_THEME;
}

export function PreferencesProvider({ children }) {
  const [theme, setTheme] = useState(getSafeStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
}

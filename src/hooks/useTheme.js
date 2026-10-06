import { useCallback, useEffect, useState } from 'react';
import { THEME_KEY } from '../lib/constants.js';

const ORDER = ['system', 'light', 'dark'];

function readTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return ORDER.includes(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage can be unavailable in private modes; the theme still applies */
    }
  }, [theme]);

  const cycleTheme = useCallback(
    () => setTheme((t) => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length]),
    [],
  );

  return { theme, setTheme, cycleTheme };
}

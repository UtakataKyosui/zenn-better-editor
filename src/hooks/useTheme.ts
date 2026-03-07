import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
        return window.localStorage.getItem('theme') !== 'light';
      }
    } catch {
      // ignore
    }
    return false;
  });

  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    // shadcn/ui uses .dark class; zenn-content-css uses [data-theme^=dark]
    html.classList.toggle('dark', isDark);
    html.classList.toggle('light', !isDark);
    try {
      if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
        window.localStorage.setItem('theme', theme);
      }
    } catch {
      // ignore
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((d) => !d);

  return { isDark, toggleTheme };
};

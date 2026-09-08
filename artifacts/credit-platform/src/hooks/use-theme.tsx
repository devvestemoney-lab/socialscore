import React from 'react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'social-score-theme';

/** Applied before React mounts too — see the inline script in index.html. */
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* storage unavailable */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const ThemeContext = React.createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: 'light', toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>(readTheme);

  React.useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* storage unavailable */ }
  }, [theme]);

  // Follow the operating system only while the user has not chosen for themselves.
  React.useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => {
      let chosen = null;
      try { chosen = localStorage.getItem(STORAGE_KEY); } catch { /* storage unavailable */ }
      if (!chosen) setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = React.useCallback(() => setTheme(t => (t === 'dark' ? 'light' : 'dark')), []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => React.useContext(ThemeContext);

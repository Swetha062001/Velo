import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

/** Kept in sync with the pre-paint script in index.html. */
const STORAGE_KEY = 'velo-theme';
const THEME_COLOR: Record<ResolvedTheme, string> = { light: '#f7f6f3', dark: '#0f0f0e' };
const media = window.matchMedia('(prefers-color-scheme: dark)');

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system'; // storage blocked (private mode, disabled site data)
  }
}

const resolve = (p: ThemePreference): ResolvedTheme =>
  p === 'system' ? (media.matches ? 'dark' : 'light') : p;

function apply(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  /** Header shortcut: flip whatever is showing now. */
  toggle: () => void;
}

export const useTheme = create<ThemeState>()((set, get) => {
  const preference = readPreference();
  return {
    preference,
    resolved: resolve(preference),
    setPreference: (next) => {
      try {
        if (next === 'system') localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* preference still applies for this visit */
      }
      const resolved = resolve(next);
      apply(resolved);
      set({ preference: next, resolved });
    },
    toggle: () => get().setPreference(get().resolved === 'dark' ? 'light' : 'dark'),
  };
});

// Follow the OS while the preference is "system".
media.addEventListener('change', () => {
  const { preference } = useTheme.getState();
  if (preference !== 'system') return;
  const resolved = resolve('system');
  apply(resolved);
  useTheme.setState({ resolved });
});

apply(useTheme.getState().resolved);

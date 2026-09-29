import { describe, expect, it, vi } from 'vitest';

async function loadTheme({ saved, osDark = false }: { saved?: string; osDark?: boolean } = {}) {
  if (saved) localStorage.setItem('velo-theme', saved);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: osDark, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  vi.resetModules();
  return (await import('./theme.ts')).useTheme;
}

const htmlTheme = () => document.documentElement.dataset.theme;

describe('theme store', () => {
  it('follows the device when nothing is saved', async () => {
    expect((await loadTheme({ osDark: true })).getState()).toMatchObject({
      preference: 'system',
      resolved: 'dark',
    });
    expect(htmlTheme()).toBe('dark');
  });

  it('uses a saved preference over the device', async () => {
    const useTheme = await loadTheme({ saved: 'light', osDark: true });
    expect(useTheme.getState().resolved).toBe('light');
    expect(htmlTheme()).toBe('light');
  });

  it('ignores tampered storage values', async () => {
    expect((await loadTheme({ saved: 'neon' })).getState().preference).toBe('system');
  });

  it('toggle flips, saves and applies; system clears the saved value', async () => {
    const useTheme = await loadTheme();
    useTheme.getState().toggle();
    expect(htmlTheme()).toBe('dark');
    expect(localStorage.getItem('velo-theme')).toBe('dark');
    useTheme.getState().setPreference('system');
    expect(localStorage.getItem('velo-theme')).toBeNull();
    expect(htmlTheme()).toBe('light');
  });
});

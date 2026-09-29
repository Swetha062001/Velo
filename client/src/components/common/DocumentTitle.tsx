/**
 * Sets the browser tab title. React 19 hoists <title> into <head>.
 * Render exactly one per page (layouts must not render one).
 */
export function DocumentTitle({ title }: { title?: string }) {
  return <title>{title ? `${title} — VELO` : 'VELO — Engineered for motion'}</title>;
}

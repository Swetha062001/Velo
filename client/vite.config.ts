import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Named vendor chunks: libraries change far less often than app code, so they stay cached
 * across releases. Form libraries get their own chunk, loaded only by pages with forms.
 */
const VENDOR_GROUPS: Array<[name: string, test: RegExp]> = [
  ['vendor-react', /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/],
  ['vendor-query', /node_modules[\\/]@tanstack[\\/]/],
  ['vendor-forms', /node_modules[\\/](zod|react-hook-form|@hookform)[\\/]/],
];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: VENDOR_GROUPS.map(([name, test]) => ({ name, test })),
        },
      },
    },
  },
});

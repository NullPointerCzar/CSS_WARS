import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/targets': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Diff and render endpoints live on the isolated render service
      // (process :4001) so a Playwright crash can never take down the
      // main API.
      '/render': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
      '/diff': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
});

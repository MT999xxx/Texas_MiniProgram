import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 4173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
});

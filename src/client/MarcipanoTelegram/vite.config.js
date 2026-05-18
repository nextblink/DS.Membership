import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5182,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:5147', changeOrigin: true },
    },
  },
});

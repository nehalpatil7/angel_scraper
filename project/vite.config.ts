import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/serp': {
        target: 'https://serpapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/serp/, '')
      },
      '/api/apollo': {
        target: 'https://api.apollo.io/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/apollo/, '/v1'),
        headers: {}
      }
    }
  }
});

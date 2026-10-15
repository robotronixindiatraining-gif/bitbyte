import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:4000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      // One origin in development too: the browser talks to Vite, Vite forwards to Express.
      proxy: {
        '/api': { target: apiTarget },
        '/sitemap.xml': { target: apiTarget },
        '/robots.txt': { target: apiTarget },
      },
    },
    preview: { port: 4173, strictPort: true },
    build: { outDir: 'dist', sourcemap: false },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      include: ['src/**/*.test.{js,jsx}'],
      css: false,
    },
  };
});

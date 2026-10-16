import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/** Fonts preloaded on every page (§3: heading + body only; the mono accent font loads lazily). */
const PRELOADED_FONTS = [
  /plus-jakarta-sans-latin-wght-normal-.*\.woff2$/,
  /inter-latin-wght-normal-.*\.woff2$/,
];

/** Adds <link rel="preload"> for the hashed font files of the production build. */
function preloadFonts() {
  return {
    name: 'bitbyte-preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const files = Object.keys(ctx.bundle ?? {}).filter((file) =>
          PRELOADED_FONTS.some((pattern) => pattern.test(file)),
        );
        return files.map((file) => ({
          tag: 'link',
          attrs: {
            rel: 'preload',
            href: `/${file}`,
            as: 'font',
            type: 'font/woff2',
            crossorigin: '',
          },
          injectTo: 'head',
        }));
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:4000';

  return {
    plugins: [react(), tailwindcss(), preloadFonts()],
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

// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const isArtifact = process.env.ARTIFACT === '1';

export default defineConfig({
  site: 'https://lessthan7.studio',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Keep generated asset names short and predictable.
    assets: '_astro',
    inlineStylesheets: 'auto',
  },
  // HTML-aware whitespace compression (Astro 7 defaults to JSX rules).
  compressHTML: true,
  // No server entrypoint: this is a static site; the AI lab runs on Netlify Functions.
  fetchFile: null,
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/lab/'),
      changefreq: 'monthly',
    }),
  ],
  vite: {
    define: {
      __ARTIFACT__: JSON.stringify(isArtifact),
    },
    build: {
      // Small, cacheable chunks; GSAP gets its own.
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/gsap')) return 'gsap';
            if (id.includes('node_modules/lenis')) return 'lenis';
          },
        },
      },
    },
  },
});

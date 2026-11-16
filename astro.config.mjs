// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';

// Every v0 page is prerendered, so this builds a fully static site. The
// Cloudflare adapter is installed now so that a later page needing D1 or R2
// can opt into on-demand rendering with `export const prerender = false`
// without changing the hosting setup.
export default defineConfig({
  // imageService 'compile' resolves images at build time instead of relying on
  // the Cloudflare Images binding, which a fully static site doesn't need.
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [svelte(), mdx()],
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
});

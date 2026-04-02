import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
// @ts-expect-error – vite-plugin-prerender ships no types bundle
import VitePluginPrerender from 'vite-plugin-prerender'
// @ts-expect-error – renderer ships no types bundle
import Renderer from '@prerenderer/renderer-jsdom'

/**
 * Static routes to pre-render at build time.
 * Dynamic product slugs (/products/:slug) are handled separately:
 * the script scripts/fetch-slugs.ts writes them to dist at build time
 * via the `postbuild` npm script so crawlers get real HTML per product.
 */
const STATIC_ROUTES = [
  '/',
  '/products',
  '/shop-by-farms',
  '/about-us',
  '/blog',
  '/careers',
  '/contact',
  '/become-a-seller',
  '/farmer-stories',
  '/certifications',
]

export default defineConfig({
  plugins: [
    react(),
    VitePluginPrerender({
      // Must match vite's `build.outDir`
      staticDir: path.join(__dirname, 'dist'),
      routes: STATIC_ROUTES,
      renderer: new Renderer({
        // Give the SPA time to mount before snapshotting
        renderAfterDocumentEvent: 'render-event',
        // Hard timeout per route (ms) in case the event never fires
        timeout: 10000,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      }),
      postProcess(renderedRoute: { html: string; route: string }) {
        // Strip the dev-mode HMR websocket script injected by Vite
        renderedRoute.html = renderedRoute.html
          .replace(/<script[^>]*__vite[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<script[^>]*vite\/client[^>]*>[\s\S]*?<\/script>/gi, '')
        return renderedRoute
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://localhost:49268',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          state: ['zustand'],
        }
      }
    }
  }
})
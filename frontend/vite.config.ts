import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss({
      // Keep SVGs inline to preserve interactivity (hover events on chart segments).
      // Without this, Tailwind extracts SVG elements with currentColor fills into <img>
      // tags, breaking Voronoi hover detection and tooltip functionality.
      dangerouslyUseInlineSVG: true,
    }),
  ],
  server: {
    host: true,
    allowedHosts: ['nas.home', '.nas.home'],
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // BUG-005: Serve local property images from data/images/ via backend
      // /data/images/{id}/{file} → proxied to /api/images/{id}/{file} (backend serves from data/images/)
      '/data/images': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => '/api' + path,  // /data/images/x/y → /api/data/images/x/y
      },
    }
  }
})

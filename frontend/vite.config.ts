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
      }
    }
  }
})

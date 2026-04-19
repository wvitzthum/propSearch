import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars — in test mode, API_PROXY is set to a test server URL
  const env = loadEnv(mode, process.cwd(), '')

  // Test/dev server: allow non-default API port via VITE_API_PORT env var
  const apiPort = env.VITE_API_PORT || '3001'
  const apiProxy = `http://localhost:${apiPort}`

  return {
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
      port: parseInt(env.VITE_PORT || '5173'),
      strictPort: true,
      proxy: {
        '/api': {
          target: apiProxy,
          changeOrigin: true,
        },
        // BUG-005: Serve local property images from data/images/ via backend
        // /data/images/{id}/{file} → proxied to /api/images/{id}/{file} (backend serves from data/images/)
        '/data/images': {
          target: apiProxy,
          changeOrigin: true,
          rewrite: (path) => '/api' + path,  // /data/images/x/y → /api/data/images/x/y
        },
      }
    }
  }
})

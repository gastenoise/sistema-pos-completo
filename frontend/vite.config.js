import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const trimTrailingSlash = (value) => value.replace(/\/+$/, '')

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = trimTrailingSlash(env.VITE_BACKEND_URL || env.VITE_API_TARGET || 'http://localhost:8080')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        },
        '/sanctum': {
          target: apiTarget,
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})

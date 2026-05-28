import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    // Disable source maps in production to prevent code exposure
    sourcemap: false,
    // Drop console.log and debugger in production builds
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // logger.ts already guards dev-only logs; strip any accidentals in prod
        drop_debugger: true,
      },
    },
    chunkSizeWarningLimit: 1800,
  },
})

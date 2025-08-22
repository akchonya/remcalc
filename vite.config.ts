import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: ['d9f89d86a505.ngrok-free.app'],
  },
})

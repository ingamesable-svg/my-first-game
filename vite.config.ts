import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  server: {
    port: 8080,
    host: true,
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser']
        }
      }
    }
  }
})

import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// The web app lives in web/ and imports the library straight from src/.
export default defineConfig({
  root: resolve(__dirname, 'web'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'web-dist'),
    emptyOutDir: true,
  },
  server: {
    // Allow importing the library source (../src) which is outside the web/ root.
    fs: { allow: [resolve(__dirname)] },
  },
})

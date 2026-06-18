import { defineConfig, resolveConfig } from 'vite';
import { dirname, resolve } from 'node:path'

export default defineConfig({
  server: { port: 3334 },
  build: {
    rolldownOptions: {
      input: {
        'ad-1': resolve(import.meta.dirname, './ad-1.html'),
        'ad-2': resolve(import.meta.dirname, './ad-2.html'),
        'ad-3': resolve(import.meta.dirname, './ad-3.html')
      }
    }
  }
});

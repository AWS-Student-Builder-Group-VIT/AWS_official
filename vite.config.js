import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const rootReactPath = fileURLToPath(new URL('./node_modules/react', import.meta.url))
const rootReactDomPath = fileURLToPath(new URL('./node_modules/react-dom', import.meta.url))
const rootTestingLibraryPath = fileURLToPath(new URL('./node_modules/@testing-library/react', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    environment: 'jsdom',
    exclude: ['tmp/**', 'node_modules/**'],
  },
  resolve: {
    // Embedded games keep their own development dependencies. Force every
    // imported game component to share the application's React dispatcher.
    alias: {
      '@testing-library/react': rootTestingLibraryPath,
      react: rootReactPath,
      'react-dom': rootReactDomPath,
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})

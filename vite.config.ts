/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

/** Builds sw.js from its template with this build's files, so every release gets a fresh cache. */
function serviceWorker(): Plugin {
  return {
    name: 'lestari-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter((f) => /\.(js|css)$/.test(f))
      const version = createHash('sha256').update(files.sort().join()).digest('hex').slice(0, 12)
      const source = readFileSync('scripts/sw-template.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(['/', ...files.map((f) => `/${f}`), '/manifest.webmanifest', '/icons/icon-192.png']))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorker()],
  // docs/supabase.md: the Supabase values keep their documented names.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  server: { proxy: { '/api': 'http://localhost:8787' } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('src/data/peribahasa.json')) return 'peribahasa-data'
          if (id.includes('node_modules/gsap')) return 'gsap'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})

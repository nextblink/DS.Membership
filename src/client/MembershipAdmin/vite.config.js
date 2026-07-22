import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

function autoBumpVersion() {
  return {
    name: 'auto-bump-version',
    resolveId(id) {
      if (id === 'virtual:app-version') {
        return id
      }
    },
    load(id) {
      if (id === 'virtual:app-version') {
        const pkgPath = resolve('./package.json')
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
        return `export const APP_VERSION = '${pkg.version}';`
      }
    },
    closeBundle() {
      const pkgPath = resolve('./package.json')
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      const parts = pkg.version.split('.').map(Number)
      parts[parts.length - 1]++
      pkg.version = parts.join('.')
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
      console.log(`✓ Version bumped to ${pkg.version}`)
    },
  }
}

export default defineConfig({
  define: {
    __BUILD_DATE__: JSON.stringify((() => { const d = new Date(); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}` })()),
  },
  plugins: [react(), tailwindcss(), autoBumpVersion()],
  server: {
    port: 5185,
    strictPort: true,
  },
  preview: {
    port: 5185,
  },
})

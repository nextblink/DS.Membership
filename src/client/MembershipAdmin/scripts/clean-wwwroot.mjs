// Clears the previous client build out of Marsipan.Membership.Web/wwwroot before a
// fresh `build:wwwroot`. Vite's --emptyOutDir can't be used here: wwwroot also holds
// runtime data (uploads/, mail-pickup/) that must survive a rebuild, so we delete only
// the paths the build itself produces.
import { rmSync } from 'fs'
import { resolve } from 'path'

const wwwroot = resolve(import.meta.dirname, '../../../backend/Marsipan.Membership.Web/wwwroot')

// Everything the build regenerates: hashed bundles/fonts in assets/, the entry HTML,
// and the files copied from public/.
const buildOutputs = ['assets', 'index.html', 'favicon.svg']

for (const name of buildOutputs) {
  rmSync(resolve(wwwroot, name), { recursive: true, force: true })
}

console.log(`✓ Cleaned previous build from ${wwwroot} (uploads/ and mail-pickup/ preserved)`)

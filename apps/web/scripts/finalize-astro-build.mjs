import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const serverDir = path.join(process.cwd(), 'dist', 'server')
const buildDevVarsPath = path.join(serverDir, '.dev.vars')
const wranglerPath = path.join(serverDir, 'wrangler.json')

await rm(buildDevVarsPath, { force: true })

const wranglerJson = JSON.parse(await readFile(wranglerPath, 'utf8'))

wranglerJson.kv_namespaces = (wranglerJson.kv_namespaces ?? []).filter(
  (binding) => binding.binding !== 'SESSION',
)

if (wranglerJson.kv_namespaces.length === 0) {
  delete wranglerJson.kv_namespaces
}

if (wranglerJson.images?.binding === 'IMAGES') {
  delete wranglerJson.images
}

if (wranglerJson.previews?.images?.binding === 'IMAGES') {
  delete wranglerJson.previews.images
}

await writeFile(wranglerPath, `${JSON.stringify(wranglerJson, null, 2)}\n`)

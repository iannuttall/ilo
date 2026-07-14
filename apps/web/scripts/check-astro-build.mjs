import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const serverDir = path.join(root, 'dist', 'server')
const entryPath = path.join(serverDir, 'entry.mjs')
const wranglerPath = path.join(serverDir, 'wrangler.json')
const devVarsPath = path.join(serverDir, '.dev.vars')

const fail = (message) => {
  throw new Error(`Astro build check failed: ${message}`)
}
const exists = (filePath) =>
  stat(filePath).then(
    () => true,
    () => false,
  )

if (await exists(devVarsPath)) {
  fail('dist/server/.dev.vars must not be emitted')
}

const entry = await readFile(entryPath, 'utf8')
for (const snippet of ['createIloWorker', 'async fetch(request, env, ctx)']) {
  if (!entry.includes(snippet)) fail(`entry.mjs is missing ${snippet}`)
}

const wrangler = JSON.parse(await readFile(wranglerPath, 'utf8'))
if (wrangler.main !== 'entry.mjs') fail('main must point at entry.mjs')
if (wrangler.assets?.binding !== 'ASSETS') fail('ASSETS binding is missing')
if (wrangler.assets?.directory !== '../client') {
  fail('asset directory must point at ../client')
}
if (wrangler.assets?.run_worker_first) {
  fail('run_worker_first must stay disabled')
}

const forbiddenBindings = [
  ['D1', wrangler.d1_databases],
  ['KV', wrangler.kv_namespaces],
  ['R2', wrangler.r2_buckets],
  ['queues', wrangler.queues?.producers],
  ['queue consumers', wrangler.queues?.consumers],
]
for (const [name, bindings] of forbiddenBindings) {
  if ((bindings ?? []).length > 0)
    fail(`generated config must not include ${name}`)
}

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

const roots = ['apps', 'packages', 'scripts']
const excludedDirectories = new Set([
  '.astro',
  '.turbo',
  '.wrangler',
  'coverage',
  'dist',
  'node_modules',
])
const extensions = new Set([
  '.astro',
  '.cjs',
  '.css',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
])
const maxLines = Number(process.env.LOC_MAX_LINES ?? 1_000)
const top = Number(process.env.LOC_TOP ?? 25)

if (!Number.isInteger(maxLines) || maxLines < 1) {
  throw new Error('LOC_MAX_LINES must be a positive integer.')
}
if (!Number.isInteger(top) || top < 1) {
  throw new Error('LOC_TOP must be a positive integer.')
}

const walk = (directory, files = []) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) {
        walk(join(directory, entry.name), files)
      }
      continue
    }

    const path = join(directory, entry.name)
    if (entry.isFile() && extensions.has(extname(path))) files.push(path)
  }
  return files
}

const files = roots
  .filter((root) => statSync(root, { throwIfNoEntry: false })?.isDirectory())
  .flatMap((root) => walk(root))
  .map((path) => ({
    path,
    lines: readFileSync(path, 'utf8').split('\n').length,
  }))
  .sort((left, right) => right.lines - left.lines)

for (const file of files.slice(0, top)) {
  process.stdout.write(`${String(file.lines).padStart(5)} ${file.path}\n`)
}

const oversized = files.filter((file) => file.lines > maxLines)
if (oversized.length > 0) {
  process.stderr.write(
    `\n${oversized.length} file(s) exceed LOC_MAX_LINES=${maxLines}.\n`,
  )
  process.exit(1)
}

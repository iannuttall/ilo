#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const SEARCH_ROOTS = ['apps/web/content', 'apps/web/src']

// Paths under these prefixes are external quoted content and intentionally
// preserve their source punctuation.
const ALLOWLIST_PREFIXES = []

const EXTENSIONS = new Set(['.md', '.mdx'])
const EM_DASH = '\u2014'

const isAllowlisted = (relativePath) =>
  ALLOWLIST_PREFIXES.some(
    (prefix) =>
      relativePath === prefix || relativePath.startsWith(`${prefix}/`),
  )

const collectFiles = async (root) => {
  const absoluteRoot = path.join(REPO_ROOT, root)
  let entries
  try {
    entries = await readdir(absoluteRoot, { withFileTypes: true })
  } catch (err) {
    if (err.code === 'ENOENT') return []
    throw err
  }
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = path.join(root, entry.name)
      if (entry.isDirectory()) {
        return collectFiles(relativePath)
      }
      if (!EXTENSIONS.has(path.extname(entry.name))) return []
      if (isAllowlisted(relativePath)) return []
      return [relativePath]
    }),
  )
  return files.flat()
}

const scanFile = async (relativePath) => {
  const source = await readFile(path.join(REPO_ROOT, relativePath), 'utf8')
  const hits = []
  const lines = source.split('\n')
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (line.includes(EM_DASH)) {
      hits.push({ line: i + 1, text: line.trim() })
    }
  }
  return hits
}

const run = async () => {
  const allFiles = (
    await Promise.all(SEARCH_ROOTS.map((root) => collectFiles(root)))
  ).flat()

  const violations = []
  for (const file of allFiles) {
    const hits = await scanFile(file)
    if (hits.length > 0) violations.push({ file, hits })
  }

  if (violations.length === 0) {
    return
  }

  console.error(
    `Em-dash (\u2014) found in ${violations.length} markdown file(s):`,
  )
  for (const { file, hits } of violations) {
    for (const hit of hits) {
      console.error(`  ${file}:${hit.line}  ${hit.text}`)
    }
  }
  console.error(
    '\nReplace em-dashes with a period, comma, colon, or parentheses to match the house style.',
  )
  console.error(
    'If the file intentionally preserves external quoted content, add its prefix to ALLOWLIST_PREFIXES in scripts/check-emdashes.mjs.',
  )
  process.exit(1)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

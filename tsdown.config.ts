import { resolve } from 'node:path'
import { defineConfig } from 'tsdown'

const bundledPackages = [/^@ilo\//]
const sourceAliases = {
  '@ilo/core': resolve('packages/core/src/index.ts'),
  '@ilo/mcp': resolve('packages/mcp/src/index.ts'),
}

export default defineConfig([
  {
    entry: {
      index: 'packages/core/src/index.ts',
      mcp: 'packages/mcp/src/index.ts',
    },
    format: ['esm'],
    platform: 'node',
    target: 'node22',
    fixedExtension: false,
    dts: true,
    sourcemap: true,
    clean: true,
    alias: sourceAliases,
    deps: { alwaysBundle: bundledPackages, onlyBundle: false },
  },
  {
    entry: { cli: 'packages/cli/src/index.ts' },
    format: ['esm'],
    platform: 'node',
    target: 'node22',
    fixedExtension: false,
    dts: false,
    sourcemap: true,
    clean: false,
    minify: true,
    alias: sourceAliases,
    deps: { alwaysBundle: bundledPackages, onlyBundle: false },
    banner: { js: '#!/usr/bin/env node' },
  },
])

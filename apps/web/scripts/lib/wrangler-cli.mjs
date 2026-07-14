import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const pnpmBinary = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

export const wranglerArgs = (args = []) => ['exec', 'wrangler', ...args]

export const execWrangler = (args, options = {}) =>
  execFileAsync(pnpmBinary, wranglerArgs(args), options)

export const spawnWrangler = (args, options = {}) =>
  spawn(pnpmBinary, wranglerArgs(args), options)

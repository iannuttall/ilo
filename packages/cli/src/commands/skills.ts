import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineCommand } from 'citty'
import { printJson, printLine } from '../utils.js'

const skillsDirectory = () => {
  let current = dirname(fileURLToPath(import.meta.url))
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = join(current, 'skills')
    if (existsSync(join(candidate, 'ilo', 'SKILL.md'))) return candidate
    current = dirname(current)
  }
  throw new Error('packaged_skill_not_found')
}

export const skillCommand = defineCommand({
  meta: {
    name: 'skill',
    description: 'Inspect or install the packaged ilo agent skill',
  },
  subCommands: {
    list: defineCommand({
      meta: { name: 'list', description: 'Show packaged agent skills' },
      args: {
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: ({ args }) => {
        const skill = { name: 'ilo', path: join(skillsDirectory(), 'ilo') }
        if (args.json) printJson({ skills: [skill] })
        else printLine(`ilo  ${skill.path}`)
      },
    }),
    path: defineCommand({
      meta: { name: 'path', description: 'Print the packaged ilo skill path' },
      run: () => printLine(join(skillsDirectory(), 'ilo')),
    }),
    install: defineCommand({
      meta: {
        name: 'install',
        description: 'Install the ilo skill for coding agents',
      },
      args: {
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: ({ args }) => {
        const result = spawnSync(
          'npx',
          ['-y', 'skills', 'add', 'iannuttall/ilo'],
          { stdio: args.json ? 'ignore' : 'inherit' },
        )
        if (result.error || result.status !== 0) {
          const error =
            result.error?.message ??
            `skills_install_failed_${result.status ?? 'unknown'}`
          if (args.json) {
            printJson({ installed: false, error })
            process.exitCode = 1
            return
          }
          throw new Error(error)
        }
        if (args.json) printJson({ installed: true, skill: 'ilo' })
        else printLine('ilo skill installed.')
      },
    }),
  },
})

import { runScheduler } from '@ilo/core'
import { defineCommand } from 'citty'
import { printJson, printLine } from '../utils.js'

export const schedulerCommand = defineCommand({
  meta: { name: 'scheduler', description: 'Run scheduled local drafts' },
  subCommands: {
    run: defineCommand({
      meta: { name: 'run', description: 'Publish drafts that are due' },
      args: {
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const result = await runScheduler()
        if (args.json) printJson(result)
        else
          printLine(
            `Checked ${result.checked}. Published ${result.published.length}. Failed ${result.failed.length}.`,
          )
      },
    }),
    watch: defineCommand({
      meta: { name: 'watch', description: 'Keep the local scheduler running' },
      args: {
        interval: {
          type: 'string',
          default: '60',
          description: 'Seconds between checks.',
        },
        json: {
          type: 'boolean',
          default: false,
          description: 'Print each result as JSON.',
        },
      },
      run: async ({ args }) => {
        const intervalSeconds = Number(args.interval)
        if (!Number.isFinite(intervalSeconds) || intervalSeconds < 5)
          throw new Error('invalid_scheduler_interval')
        printLine(
          `Scheduler running every ${intervalSeconds} seconds. Press Ctrl+C to stop.`,
        )
        const tick = async () => {
          const result = await runScheduler()
          if (args.json || result.checked > 0) printJson(result)
        }
        await tick()
        await new Promise<void>((resolve) => {
          const timer = setInterval(
            () => void tick().catch((error) => printLine(String(error))),
            intervalSeconds * 1000,
          )
          process.once('SIGINT', () => {
            clearInterval(timer)
            resolve()
          })
          process.once('SIGTERM', () => {
            clearInterval(timer)
            resolve()
          })
        })
      },
    }),
  },
})

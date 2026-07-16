import {
  createXMonitor,
  deleteXMonitor,
  listXMonitors,
  setXMonitorEnabled,
  type XMonitor,
} from '@ilo/core'
import { defineCommand } from 'citty'
import Table from 'cli-table3'
import pc from 'picocolors'
import { terminalColumns, wrapTerminalText } from '../terminal.js'
import { printJson, printLine } from '../utils.js'
import { resolveXAccountHandle } from './x-account.js'

const accountArg = {
  type: 'string' as const,
  description: 'X handle. Defaults to the connected account.',
}

const lastChecked = (monitor: XMonitor) => {
  if (!monitor.lastCheckedAt) return 'never'
  return new Date(monitor.lastCheckedAt).toLocaleString('en-GB')
}

const renderWideMonitors = (monitors: XMonitor[], columns: number) => {
  const targetWidth = Math.min(columns - 4, 150)
  const table = new Table({
    head: [
      pc.bold('ID'),
      pc.bold('Status'),
      pc.bold('Name'),
      pc.bold('Query'),
      pc.bold('Last checked'),
    ],
    colWidths: [10, 10, 22, targetWidth - 70, 22],
    wordWrap: true,
    style: { head: [], border: [] },
  })
  for (const monitor of monitors) {
    table.push([
      monitor.id.slice(0, 8),
      monitor.enabled ? pc.green('active') : pc.dim('paused'),
      monitor.name,
      monitor.query,
      monitor.lastError
        ? `${lastChecked(monitor)}\n${pc.red(monitor.lastError)}`
        : lastChecked(monitor),
    ])
  }
  return table.toString()
}

const renderStackedMonitors = (monitors: XMonitor[], columns: number) => {
  const contentWidth = Math.max(24, columns - 4)
  const divider = pc.dim('─'.repeat(Math.min(contentWidth, 88)))
  return monitors
    .map((monitor) =>
      [
        `${monitor.enabled ? pc.green('active') : pc.dim('paused')} ${pc.dim('·')} ${pc.bold(monitor.name)} ${pc.dim('·')} ${monitor.id.slice(0, 8)}`,
        wrapTerminalText(monitor.query, contentWidth),
        pc.dim(`Last checked: ${lastChecked(monitor)}`),
        monitor.lastError ? pc.red(monitor.lastError) : '',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join(`\n${divider}\n`)
}

export const renderMonitors = (
  monitors: XMonitor[],
  requestedColumns = process.stdout.columns ?? 120,
) => {
  const columns = terminalColumns(requestedColumns)
  return columns >= 132
    ? renderWideMonitors(monitors, columns)
    : renderStackedMonitors(monitors, columns)
}

export const resolveMonitor = (monitors: XMonitor[], identifier: string) => {
  const value = identifier.trim().toLowerCase()
  const matches = monitors.filter(
    (monitor) =>
      monitor.id.toLowerCase() === value ||
      monitor.id.toLowerCase().startsWith(value) ||
      monitor.name.toLowerCase() === value,
  )
  if (matches.length === 0) throw new Error('x_monitor_not_found')
  if (matches.length > 1) throw new Error('x_monitor_identifier_ambiguous')
  return matches[0] as XMonitor
}

const changeMonitorArgs = {
  id: {
    type: 'positional' as const,
    required: true,
    description: 'Monitor name, UUID, or unique UUID prefix.',
  },
  account: accountArg,
  json: {
    type: 'boolean' as const,
    default: false,
    description: 'Print structured JSON.',
  },
}

export const monitorsCommand = defineCommand({
  meta: {
    name: 'monitors',
    description: 'Save X searches that feed the local inbox',
  },
  subCommands: {
    add: defineCommand({
      meta: {
        name: 'add',
        description: 'Add an X advanced-search monitor',
      },
      args: {
        name: {
          type: 'positional',
          required: true,
          description: 'Short monitor name.',
        },
        query: {
          type: 'string',
          required: true,
          description: 'X advanced-search query.',
        },
        account: accountArg,
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const monitor = createXMonitor({
          accountHandle: await resolveXAccountHandle(args.account),
          name: String(args.name),
          query: String(args.query),
        })
        if (args.json) return printJson({ monitor })
        printLine(`Added ${monitor.name} (${monitor.id.slice(0, 8)}).`)
        printLine(`Refresh it with \`ilo x inbox refresh\`.`)
      },
    }),
    list: defineCommand({
      meta: { name: 'list', description: 'List local X monitors' },
      args: {
        account: accountArg,
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const accountHandle = await resolveXAccountHandle(args.account)
        const monitors = listXMonitors({
          accountHandle,
          includeDisabled: true,
        })
        if (args.json) return printJson({ accountHandle, monitors })
        if (!monitors.length)
          return printLine(`No monitors for @${accountHandle}.`)
        printLine(pc.bold(`X monitors for @${accountHandle}`))
        printLine(renderMonitors(monitors))
      },
    }),
    enable: defineCommand({
      meta: { name: 'enable', description: 'Resume a paused monitor' },
      args: changeMonitorArgs,
      run: async ({ args }) => {
        const accountHandle = await resolveXAccountHandle(args.account)
        const monitor = resolveMonitor(
          listXMonitors({ accountHandle, includeDisabled: true }),
          String(args.id),
        )
        const enabled = setXMonitorEnabled({ id: monitor.id, enabled: true })
        if (args.json) return printJson({ monitor: enabled })
        printLine(`Enabled ${enabled.name}.`)
      },
    }),
    disable: defineCommand({
      meta: { name: 'disable', description: 'Pause a monitor' },
      args: changeMonitorArgs,
      run: async ({ args }) => {
        const accountHandle = await resolveXAccountHandle(args.account)
        const monitor = resolveMonitor(
          listXMonitors({ accountHandle, includeDisabled: true }),
          String(args.id),
        )
        const disabled = setXMonitorEnabled({ id: monitor.id, enabled: false })
        if (args.json) return printJson({ monitor: disabled })
        printLine(`Paused ${disabled.name}.`)
      },
    }),
    remove: defineCommand({
      meta: { name: 'remove', description: 'Delete a local monitor' },
      args: changeMonitorArgs,
      run: async ({ args }) => {
        const accountHandle = await resolveXAccountHandle(args.account)
        const monitor = resolveMonitor(
          listXMonitors({ accountHandle, includeDisabled: true }),
          String(args.id),
        )
        deleteXMonitor({ id: monitor.id })
        if (args.json) return printJson({ deleted: true, monitor })
        printLine(`Removed ${monitor.name}.`)
      },
    }),
  },
})

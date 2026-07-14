import { Copy, CopyCheck } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const MCP_NOTE =
  'The MCP server runs on your machine and uses the same local database as the CLI.'
const CLI_NOTE =
  'Run `ilo start` once to connect your own X developer app and account.'
const CLI_COMMAND = 'npm i -g iloso && ilo start'
const buildStdioConfig = () =>
  JSON.stringify(
    { mcpServers: { ilo: { command: 'iloso', args: ['mcp', 'serve'] } } },
    null,
    2,
  )

const clients = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    command: 'claude mcp add ilo -- iloso mcp serve',
    helper: 'Install iloso globally, then run this command in your terminal.',
  },
  {
    id: 'codex',
    label: 'Codex',
    command: 'codex mcp add ilo -- iloso mcp serve',
    helper: 'This adds ilo as a local stdio server in Codex.',
  },
  {
    id: 'claude-desktop',
    label: 'Claude Desktop',
    command: buildStdioConfig(),
    helper: 'Add this local server to your Claude Desktop MCP config.',
  },
  {
    id: 'cursor',
    label: 'Cursor',
    command: buildStdioConfig(),
    helper: 'Paste this into Cursor MCP settings.',
  },
  {
    id: 'other',
    label: 'Other stdio client',
    command: buildStdioConfig(),
    helper: 'Use this in any MCP client that can start a local command.',
  },
] as const

type Mode = 'cli' | 'mcp'
type ClientId = (typeof clients)[number]['id']
type InstallPickerProps = { standalone?: boolean }

export function InstallPicker({ standalone = false }: InstallPickerProps) {
  const [mode, setMode] = useState<Mode>('cli')
  const [client, setClient] = useState<ClientId>('claude-code')
  const [copied, setCopied] = useState(false)
  const selectedClient =
    clients.find((item) => item.id === client) ?? clients[0]
  const command = mode === 'cli' ? CLI_COMMAND : selectedClient.command

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = command
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section
      className={cn(
        'border-border bg-card p-5 shadow-[0_8px_44px_-12px_rgba(0,0,0,0.1)]',
        standalone ? 'rounded-xl border' : 'rounded-t-xl border-x border-t',
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <fieldset
            aria-label="Install method"
            className="inline-flex h-8 w-fit items-center justify-center gap-1 rounded-lg bg-muted p-0.5 text-foreground-muted"
          >
            {(
              [
                ['cli', 'Install CLI'],
                ['mcp', 'Add MCP'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={cn(
                  'inline-flex h-7 min-w-7 items-center justify-center gap-2 rounded-md border border-transparent px-2.5 text-sm font-medium outline-none transition-colors',
                  'hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20',
                  mode === value && 'bg-card text-foreground shadow-xs',
                )}
              >
                {label}
              </button>
            ))}
          </fieldset>
          <a
            className="text-sm text-foreground-muted underline decoration-border underline-offset-4 hover:text-foreground"
            href={mode === 'cli' ? '/docs/cli' : '/docs/mcp'}
          >
            {mode === 'cli' ? 'CLI docs' : 'MCP docs'}
          </a>
        </div>

        {mode === 'mcp' ? (
          <div className="space-y-3">
            <label className="text-sm font-medium" htmlFor="mcp-client">
              MCP client
            </label>
            <div className="relative w-full">
              <select
                id="mcp-client"
                name="mcp-client"
                value={client}
                onChange={(event) => setClient(event.target.value as ClientId)}
                className="h-11 w-full min-w-0 appearance-none rounded-lg border border-input bg-card px-3 py-2 pr-9 text-sm text-foreground transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
              >
                {clients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-foreground-muted opacity-60"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
            <p className="text-foreground-muted">{selectedClient.helper}</p>
          </div>
        ) : (
          <p className="leading-7 text-foreground-muted">
            Install the CLI, then connect your X account through a local browser
            callback. Your tokens stay in the system keychain.
          </p>
        )}

        <div className="space-y-2">
          <div className="relative min-w-0 overflow-hidden rounded-lg bg-muted">
            <pre className="m-0 min-h-9 min-w-0 overflow-x-auto px-3 py-3 pr-12 font-mono text-sm leading-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <code>{command}</code>
            </pre>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-r from-transparent via-muted/95 to-muted"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={copy}
              className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md bg-muted text-foreground-muted transition-colors hover:text-foreground"
              aria-label={copied ? 'Copied' : 'Copy install command'}
            >
              {copied ? (
                <CopyCheck className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
          <p className="text-sm leading-6 text-foreground-muted">
            {mode === 'cli' ? CLI_NOTE : MCP_NOTE}
          </p>
        </div>
      </div>
    </section>
  )
}

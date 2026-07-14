import {
  createDraft,
  listDrafts,
  publishDraft,
  publishPost,
  readXCredentials,
  runScheduler,
  scheduleDraft,
} from '@ilo/core'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import * as z from 'zod/v4'

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent?: Record<string, unknown>
  isError?: boolean
}

const success = (summary: string, data: unknown): ToolResult => ({
  content: [{ type: 'text', text: summary }],
  structuredContent: data as Record<string, unknown>,
})
const failure = (error: unknown): ToolResult => {
  const message = error instanceof Error ? error.message : String(error)
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    structuredContent: { error: message },
    isError: true,
  }
}
const openOutputSchema = z.looseObject({})

export const registerIloTools = (server: McpServer) => {
  server.registerTool(
    'ilo_status',
    {
      description: 'Check the local ilo installation and connected X account',
      inputSchema: {},
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async () => {
      try {
        const credentials = await readXCredentials()
        return success(`Connected @${credentials.username}.`, {
          connected: true,
          provider: 'x',
          username: credentials.username,
          accountId: credentials.accountId,
          scopes: credentials.scopes,
        })
      } catch {
        return success('No X account is connected.', { connected: false })
      }
    },
  )

  server.registerTool(
    'ilo_create_draft',
    {
      description: 'Create a local X post draft without publishing it',
      inputSchema: { text: z.string().trim().min(1).max(25_000) },
      outputSchema: openOutputSchema,
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async ({ text }) => {
      try {
        const draft = createDraft(text)
        return success(`Draft created: ${draft.id}`, { draft })
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_list_drafts',
    {
      description:
        'List local ilo drafts and their scheduling or publishing status',
      inputSchema: {},
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async () => {
      const drafts = listDrafts()
      return success(`${drafts.length} drafts found.`, { drafts })
    },
  )

  server.registerTool(
    'ilo_schedule_draft',
    {
      description:
        'Schedule a local draft using an ISO time or plain language such as tomorrow at 9am',
      inputSchema: {
        id: z.string().uuid(),
        at: z.string().trim().min(1).max(100),
      },
      outputSchema: openOutputSchema,
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async ({ id, at }) => {
      try {
        const draft = await scheduleDraft(id, at)
        return success(
          `Draft scheduled for ${new Date(draft.scheduledAt ?? 0).toISOString()}.`,
          { draft },
        )
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_publish_draft',
    {
      description:
        'Publish one local draft to the connected X account. Requires confirm=true.',
      inputSchema: { id: z.string().uuid(), confirm: z.literal(true) },
      outputSchema: openOutputSchema,
      annotations: { destructiveHint: true, idempotentHint: false },
    },
    async ({ id }) => {
      try {
        const published = await publishDraft(id)
        return success(`Published ${published.providerUrl}`, { published })
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_publish_post',
    {
      description:
        'Publish a new post to the connected X account. Requires confirm=true.',
      inputSchema: {
        text: z.string().trim().min(1).max(25_000),
        confirm: z.literal(true),
      },
      outputSchema: openOutputSchema,
      annotations: { destructiveHint: true, idempotentHint: false },
    },
    async ({ text }) => {
      try {
        const published = await publishPost(text)
        return success(`Published ${published.providerUrl}`, { published })
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_run_scheduler',
    {
      description: 'Publish local drafts whose scheduled time has passed',
      inputSchema: { confirm: z.literal(true) },
      outputSchema: openOutputSchema,
      annotations: { destructiveHint: true, idempotentHint: false },
    },
    async () => {
      try {
        const result = await runScheduler()
        return success(
          `Checked ${result.checked} drafts and published ${result.published.length}.`,
          result,
        )
      } catch (error) {
        return failure(error)
      }
    },
  )
}

export const createServer = () => {
  const server = new McpServer(
    { name: 'ilo', version: '0.1.0' },
    { capabilities: { logging: {} } },
  )
  registerIloTools(server)
  return server
}

export const startMcpServer = async () => {
  const server = createServer()
  await server.connect(new StdioServerTransport())
}

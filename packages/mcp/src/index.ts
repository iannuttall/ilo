import {
  createDraft,
  getXFollowerProfile,
  getXFollowersStatus,
  ILO_VERSION,
  listDrafts,
  publishDraft,
  publishPost,
  readXCredentials,
  runScheduler,
  scheduleDraft,
  searchXFollowers,
  syncXFollowers,
} from '@ilo/core'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import * as z from 'zod/v4'
import { failure, openOutputSchema, success } from './tool-result.js'
import { registerInboxTools } from './tools/inbox.js'

const postDestinationInput = {
  replyToPostId: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .optional()
    .describe('X post ID or URL to reply to'),
  images: z
    .array(
      z.object({
        path: z.string().trim().min(1).max(4_096),
        altText: z.string().trim().max(1_000).optional(),
      }),
    )
    .max(4)
    .optional()
    .describe('Local JPEG, PNG, or WebP files to attach'),
}

export const registerIloTools = (server: McpServer) => {
  registerInboxTools(server)
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
    'ilo_sync_x_followers',
    {
      description:
        'Import public X followers into ilo local search. Progress is resumable, and large accounts usually need repeated calls.',
      inputSchema: {
        handle: z.string().trim().min(1).max(100),
        maxPages: z.number().int().min(1).max(200).default(20),
        restart: z.boolean().default(false),
      },
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async ({ handle, maxPages, restart }) => {
      try {
        const sync = await syncXFollowers({ handle, maxPages, restart })
        return success(
          sync.complete
            ? `${sync.importedProfiles} follower profiles are searchable for @${sync.handle}; the full available list was imported.`
            : `${sync.importedProfiles} follower profiles are searchable for @${sync.handle}; the import has not reached a confirmed end.`,
          { sync },
        )
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_x_follower_sync_status',
    {
      description:
        'Check how much public follower data ilo has indexed locally',
      inputSchema: { handle: z.string().trim().min(1).max(100) },
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ handle }) => {
      try {
        const sync = getXFollowersStatus({ handle })
        return success(
          sync
            ? `${sync.importedProfiles} follower profiles are searchable for @${sync.handle}; ${sync.complete ? 'the full available list was imported' : 'the import has not reached a confirmed end'}.`
            : 'No follower data has been indexed for this account.',
          { sync },
        )
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_search_x_followers',
    {
      description:
        'Search imported X follower names, handles, bios, and locations. Accepts natural employer questions or pipe-separated alternatives and returns current, former, and unclear matches with bio evidence.',
      inputSchema: {
        handle: z.string().trim().min(1).max(100),
        query: z.string().trim().min(1).max(500),
        resultLimit: z.number().int().min(1).max(100).default(20),
        candidateLimit: z.number().int().min(1).max(10_000).default(10_000),
      },
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ handle, query, resultLimit, candidateLimit }) => {
      try {
        const search = searchXFollowers({
          handle,
          query,
          resultLimit,
          candidateLimit,
        })
        const counts = search.groups
          .map((group) => `${group.term}: ${group.current} current`)
          .join(', ')
        const coverage = search.coverage.complete
          ? 'full available list imported'
          : 'import has not reached a confirmed end'
        return success(
          `Searched ${search.coverage.importedProfiles} follower profiles (${coverage}). ${counts}.`,
          { search },
        )
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_get_x_follower_profile',
    {
      description:
        'Read the complete public FxTwitter record stored for one imported follower, including bio, location, website, account counts, join date, verification, images, and raw provider data',
      inputSchema: {
        handle: z.string().trim().min(1).max(100),
        followerHandle: z.string().trim().min(1).max(100),
      },
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ handle, followerHandle }) => {
      try {
        const result = getXFollowerProfile({ handle, followerHandle })
        return success(
          `Read @${result.profile.handle}'s stored public profile from @${result.handle}'s follower index.`,
          { result },
        )
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'ilo_create_draft',
    {
      description:
        'Create a local X post or reply draft, with up to four static images, without publishing it',
      inputSchema: {
        text: z.string().trim().min(1).max(25_000),
        ...postDestinationInput,
      },
      outputSchema: openOutputSchema,
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async ({ text, replyToPostId, images }) => {
      try {
        const draft = createDraft(text, { replyToPostId, images })
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
        'Publish one local post or reply draft, including its images, to the connected X account. Show the exact draft and destination first. Requires confirm=true.',
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
        'Publish a top-level post or reply, with up to four static images, to the connected X account. Show the exact text, destination, and images first. Requires confirm=true.',
      inputSchema: {
        text: z.string().trim().min(1).max(25_000),
        ...postDestinationInput,
        confirm: z.literal(true),
      },
      outputSchema: openOutputSchema,
      annotations: { destructiveHint: true, idempotentHint: false },
    },
    async ({ text, replyToPostId, images }) => {
      try {
        const published = await publishPost(text, { replyToPostId, images })
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
    { name: 'ilo', version: ILO_VERSION },
    { capabilities: { logging: {} } },
  )
  registerIloTools(server)
  return server
}

export const startMcpServer = async () => {
  const server = createServer()
  await server.connect(new StdioServerTransport())
}

import {
  createDraft,
  getDefaultPublishingAccount,
  getXFollowerProfile,
  getXFollowersStatus,
  ILO_VERSION,
  listDrafts,
  listPublishingAccounts,
  publishDraft,
  publishPost,
  readTypefullyCredentials,
  readXCredentials,
  runScheduler,
  scheduleDraft,
  searchXFollowers,
  setDefaultPublishingAccount,
  syncXFollowers,
} from '@ilo/core'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import * as z from 'zod/v4'
import { failure, openOutputSchema, success } from './tool-result.js'
import { registerArticleTools } from './tools/articles.js'
import { registerFollowingTools } from './tools/following.js'
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

const publishingAccountInput = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .optional()
  .describe('Publishing account alias, X handle, or account id')

export const registerIloTools = (server: McpServer) => {
  registerArticleTools(server)
  registerFollowingTools(server)
  registerInboxTools(server)
  server.registerTool(
    'ilo_status',
    {
      description: 'Check ilo and its default X publishing account',
      inputSchema: {},
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async () => {
      const [accounts, defaultAccount] = await Promise.all([
        listPublishingAccounts(),
        getDefaultPublishingAccount(),
      ])
      if (!defaultAccount) {
        return success('No X publishing account is connected.', {
          connected: false,
          accounts,
        })
      }
      try {
        if (defaultAccount.provider === 'x') {
          await readXCredentials(defaultAccount.id)
        } else {
          await readTypefullyCredentials(defaultAccount.id)
        }
      } catch (error) {
        return success(
          `@${defaultAccount.username} is the default publishing account, but its ${defaultAccount.provider === 'x' ? 'direct X credentials are' : 'Typefully API key is'} unavailable.`,
          {
            connected: false,
            configured: true,
            defaultAccount,
            accounts,
            error: error instanceof Error ? error.message : String(error),
          },
        )
      }
      return success(
        `Default publishing account: @${defaultAccount.username} via ${defaultAccount.provider === 'x' ? 'direct X' : 'Typefully'}.`,
        {
          connected: true,
          configured: true,
          defaultAccount,
          accounts,
        },
      )
    },
  )

  server.registerTool(
    'ilo_list_publishing_accounts',
    {
      description:
        'List locally connected X publishing accounts and the current default',
      inputSchema: {},
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async () => {
      const [accounts, defaultAccount] = await Promise.all([
        listPublishingAccounts(),
        getDefaultPublishingAccount(),
      ])
      return success(`${accounts.length} publishing accounts connected.`, {
        accounts,
        defaultAccount,
      })
    },
  )

  server.registerTool(
    'ilo_set_default_publishing_account',
    {
      description:
        'Change the local default publishing account. Existing bound drafts keep their original account.',
      inputSchema: { account: z.string().trim().min(1).max(200) },
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({ account }) => {
      try {
        const defaultAccount = await setDefaultPublishingAccount(account)
        return success(
          `Default publishing account set to @${defaultAccount.username}.`,
          { defaultAccount },
        )
      } catch (error) {
        return failure(error)
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
            : `${sync.importedProfiles} follower profiles are searchable for @${sync.handle}; the saved import is unfinished.`,
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
            ? `${sync.importedProfiles} follower profiles are searchable for @${sync.handle}; ${sync.complete ? 'the full available list was imported' : 'the saved import is unfinished'}.`
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
        'Search imported X follower names, handles, bios, and locations. Returns current matches with bio evidence by default and keeps counts for current, former, and unclear matches.',
      inputSchema: {
        handle: z.string().trim().min(1).max(100),
        query: z.string().trim().min(1).max(500),
        resultLimit: z
          .number()
          .int()
          .min(1)
          .max(10_000)
          .optional()
          .describe(
            'Maximum listed results per term. Omit to return every included match.',
          ),
        includeFormer: z
          .boolean()
          .default(false)
          .describe('Include former matches in the returned profiles.'),
        includeUnclear: z
          .boolean()
          .default(false)
          .describe('Include unclear matches in the returned profiles.'),
        candidateLimit: z.number().int().min(1).max(10_000).default(10_000),
      },
      outputSchema: openOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async ({
      handle,
      query,
      resultLimit,
      includeFormer,
      includeUnclear,
      candidateLimit,
    }) => {
      try {
        const search = searchXFollowers({
          handle,
          query,
          resultLimit,
          candidateLimit,
          includeFormer,
          includeUnclear,
        })
        const counts = search.groups
          .map(
            (group) =>
              `${group.term}: ${group.current} current, ${group.former} former, ${group.unclear} unclear`,
          )
          .join(', ')
        const coverage = search.coverage.complete
          ? 'full available list imported'
          : 'saved import is unfinished'
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
        account: publishingAccountInput,
      },
      outputSchema: openOutputSchema,
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async ({ text, replyToPostId, images, account }) => {
      try {
        const draft = await createDraft(text, {
          replyToPostId,
          images,
          account,
        })
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
        account: publishingAccountInput,
      },
      outputSchema: openOutputSchema,
      annotations: { destructiveHint: false, idempotentHint: false },
    },
    async ({ id, at, account }) => {
      try {
        const draft = await scheduleDraft(id, at, { account })
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
        'Publish one local post or reply draft through its bound account. Show the exact account, provider, draft, destination, and images first. Requires confirm=true.',
      inputSchema: {
        id: z.string().uuid(),
        account: publishingAccountInput,
        confirm: z.literal(true),
      },
      outputSchema: openOutputSchema,
      annotations: { destructiveHint: true, idempotentHint: false },
    },
    async ({ id, account }) => {
      try {
        const published = await publishDraft(id, { account })
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
        'Publish a top-level post or reply through a selected or default account, with up to four static images. Show the exact account, provider, text, destination, and images first. Requires confirm=true.',
      inputSchema: {
        text: z.string().trim().min(1).max(25_000),
        ...postDestinationInput,
        account: publishingAccountInput,
        confirm: z.literal(true),
      },
      outputSchema: openOutputSchema,
      annotations: { destructiveHint: true, idempotentHint: false },
    },
    async ({ text, replyToPostId, images, account }) => {
      try {
        const published = await publishPost(text, {
          replyToPostId,
          images,
          account,
        })
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

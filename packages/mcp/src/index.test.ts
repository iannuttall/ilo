import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { refreshXMonitor, syncXFollowers } from '@ilo/core'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createServer } from './index.js'

test('exposes follower research, inbox monitors, and reply drafts through MCP', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-mcp-'))
  const previousHome = process.env.ILO_HOME
  process.env.ILO_HOME = directory
  const server = createServer()
  const client = new Client({ name: 'ilo-test', version: '1.0.0' })
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair()

  try {
    await server.connect(serverTransport)
    await client.connect(clientTransport)

    const tools = await client.listTools()
    const names = tools.tools.map((tool) => tool.name)
    assert.equal(names.includes('ilo_search_x_followers'), true)
    assert.equal(names.includes('ilo_get_x_follower_profile'), true)
    assert.equal(names.includes('ilo_create_x_monitor'), true)
    assert.equal(names.includes('ilo_refresh_x_inbox'), true)
    assert.equal(names.includes('ilo_list_x_inbox'), true)
    assert.equal(names.includes('ilo_sync_x_following'), true)

    const followerSearch = tools.tools.find(
      (tool) => tool.name === 'ilo_search_x_followers',
    )
    const followerSearchProperties = followerSearch?.inputSchema.properties as
      | Record<string, { type?: string }>
      | undefined
    assert.equal(followerSearchProperties?.includeFormer?.type, 'boolean')
    assert.equal(followerSearchProperties?.includeUnclear?.type, 'boolean')

    const publishPost = tools.tools.find(
      (tool) => tool.name === 'ilo_publish_post',
    )
    assert.equal(publishPost?.inputSchema.required?.includes('confirm'), true)
    assert.deepEqual(publishPost?.inputSchema.properties?.confirm, {
      type: 'boolean',
      const: true,
    })

    await syncXFollowers(
      { handle: 'subject', maxPages: 1 },
      {
        profile: async () => ({
          id: 'subject-id',
          name: 'Subject',
          screen_name: 'subject',
          followers: 3,
        }),
        followers: async () => ({
          profiles: [
            {
              id: 'follower-id',
              name: 'Follower',
              screen_name: 'follower',
              description: 'Software Engineer @getsentry',
            },
            {
              id: 'former-id',
              name: 'Former follower',
              screen_name: 'former_follower',
              description: 'Ex-@getsentry. Building something new.',
            },
            {
              id: 'unclear-id',
              name: 'Sentry fan',
              screen_name: 'sentry_fan',
              description: 'Sentry user and fan.',
            },
          ],
          nextCursor: null,
        }),
      },
    )

    const search = await client.callTool({
      name: 'ilo_search_x_followers',
      arguments: { handle: 'subject', query: 'works at sentry' },
    })
    assert.equal(search.isError, undefined)
    const searchContent = search.structuredContent as {
      search: {
        includedMatchKinds: string[]
        groups: Array<{
          current: number
          former: number
          unclear: number
          results: Array<{ match: string }>
        }>
      }
    }
    assert.equal(searchContent.search.groups[0]?.current, 1)
    assert.equal(searchContent.search.groups[0]?.former, 1)
    assert.equal(searchContent.search.groups[0]?.unclear, 1)
    assert.deepEqual(searchContent.search.includedMatchKinds, ['current'])
    assert.deepEqual(
      searchContent.search.groups[0]?.results.map((match) => match.match),
      ['current'],
    )

    const expandedSearch = await client.callTool({
      name: 'ilo_search_x_followers',
      arguments: {
        handle: 'subject',
        query: 'works at sentry',
        includeFormer: true,
        includeUnclear: true,
      },
    })
    const expandedSearchContent = expandedSearch.structuredContent as {
      search: {
        groups: Array<{ results: Array<{ match: string }> }>
      }
    }
    assert.deepEqual(
      expandedSearchContent.search.groups[0]?.results.map(
        (match) => match.match,
      ),
      ['current', 'former', 'unclear'],
    )

    const createdMonitor = await client.callTool({
      name: 'ilo_create_x_monitor',
      arguments: {
        accountHandle: 'subject',
        name: 'Product questions',
        query: '"ilo" OR @subject',
      },
    })
    assert.equal(createdMonitor.isError, undefined)
    const monitorContent = createdMonitor.structuredContent as {
      monitor: { id: string }
    }
    await refreshXMonitor(
      { id: monitorContent.monitor.id },
      {
        search: async () => ({
          posts: [
            {
              type: 'status',
              id: '456',
              url: 'https://x.com/follower/status/456',
              text: 'Has anyone used ilo?',
              created_at: 'Wed Jul 16 07:00:00 +0000 2026',
              created_timestamp: 1_784_185_200,
              likes: 3,
              reposts: 1,
              quotes: 0,
              replies: 2,
              author: {
                id: 'follower-id',
                name: 'Follower',
                screen_name: 'follower',
                description: 'Software Engineer @getsentry',
                verification: { verified: true, type: 'blue' },
              },
            },
          ],
          nextCursor: null,
        }),
      },
    )

    const inbox = await client.callTool({
      name: 'ilo_list_x_inbox',
      arguments: { accountHandle: 'subject', verified: true },
    })
    assert.equal(inbox.isError, undefined)
    const inboxContent = inbox.structuredContent as {
      items: Array<{
        postId: string
        relationship: { followsMe: boolean }
      }>
    }
    assert.equal(inboxContent.items[0]?.postId, '456')
    assert.equal(inboxContent.items[0]?.relationship.followsMe, true)

    const read = await client.callTool({
      name: 'ilo_update_x_inbox_item',
      arguments: {
        accountHandle: 'subject',
        postId: 'https://x.com/follower/status/456',
        action: 'read',
      },
    })
    assert.equal(read.isError, undefined)

    const created = await client.callTool({
      name: 'ilo_create_draft',
      arguments: {
        text: 'A reply to inspect',
        replyToPostId: 'https://x.com/follower/status/456',
      },
    })
    assert.equal(created.isError, undefined)
    const createdContent = created.structuredContent as {
      draft: { replyToPostId: string }
    }
    assert.equal(createdContent.draft.replyToPostId, '456')
  } finally {
    await client.close()
    await server.close()
    if (previousHome === undefined) delete process.env.ILO_HOME
    else process.env.ILO_HOME = previousHome
    rmSync(directory, { recursive: true, force: true })
  }
})

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { syncXFollowers } from '@ilo/core'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createServer } from './index.js'

test('exposes follower research and reply drafts through MCP', async () => {
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
          followers: 1,
        }),
        followers: async () => ({
          profiles: [
            {
              id: 'follower-id',
              name: 'Follower',
              screen_name: 'follower',
              description: 'Software Engineer @getsentry',
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
      search: { groups: Array<{ current: number }> }
    }
    assert.equal(searchContent.search.groups[0]?.current, 1)

    const created = await client.callTool({
      name: 'ilo_create_draft',
      arguments: {
        text: 'A reply to inspect',
        replyToPostId: 'https://x.com/example/status/123',
      },
    })
    assert.equal(created.isError, undefined)
    const createdContent = created.structuredContent as {
      draft: { replyToPostId: string }
    }
    assert.equal(createdContent.draft.replyToPostId, '123')
  } finally {
    await client.close()
    await server.close()
    if (previousHome === undefined) delete process.env.ILO_HOME
    else process.env.ILO_HOME = previousHome
    rmSync(directory, { recursive: true, force: true })
  }
})

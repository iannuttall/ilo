import type { Hono } from 'hono'
import type { Env } from '@/env'
import {
  getXProfileAnalytics,
  getXProfileByHandle,
  getXProfileById,
  getXThread,
  getXVideo,
  searchXPosts,
} from '@/lib/x/public-tools'
import { apiError, json, parseJson } from '../../http'

type JsonBody = Record<string, unknown>

const toolError = (error: unknown, status = 400) =>
  apiError({
    status,
    error: status >= 500 ? 'internal_error' : 'bad_request',
    reason: 'tool_request_failed',
    message: error instanceof Error ? error.message : String(error),
    whatBroke: 'The public X tool could not complete the lookup.',
    howToFix: [
      {
        title: 'Check the input',
        reason: 'Confirm the handle, URL, id, or search query and retry.',
      },
    ],
  })

export const registerXToolRoutes = (app: Hono<{ Bindings: Env }>) => {
  app.get('/tools/x/profile/:handle', async (c) => {
    try {
      return json({
        profile: await getXProfileByHandle(c.env, c.req.param('handle')),
      })
    } catch (error) {
      return toolError(error)
    }
  })

  app.get('/tools/x/profile-id/:id', async (c) => {
    try {
      return json({ profile: await getXProfileById(c.env, c.req.param('id')) })
    } catch (error) {
      return toolError(error)
    }
  })

  app.post('/tools/x/profile-analytics', async (c) => {
    const body = await parseJson<JsonBody>(c.req.raw)
    try {
      return json({
        lookup: await getXProfileAnalytics(
          c.env,
          typeof body?.handle === 'string' ? body.handle : '',
        ),
      })
    } catch (error) {
      return toolError(error)
    }
  })

  app.get('/tools/x/search', async (c) => {
    const url = new URL(c.req.url)
    try {
      return json({
        search: await searchXPosts(c.env, {
          q: url.searchParams.get('q') ?? '',
          feed: url.searchParams.get('feed'),
          count: Number(url.searchParams.get('count') ?? 20),
          cursor: url.searchParams.get('cursor'),
        }),
      })
    } catch (error) {
      return toolError(error)
    }
  })

  app.post('/tools/x/thread', async (c) => {
    const body = await parseJson<JsonBody>(c.req.raw)
    try {
      return json({
        thread: await getXThread(
          c.env,
          typeof body?.url === 'string' ? body.url : '',
        ),
      })
    } catch (error) {
      return toolError(error)
    }
  })

  app.post('/tools/x/video', async (c) => {
    const body = await parseJson<JsonBody>(c.req.raw)
    try {
      return json({
        post: await getXVideo(
          c.env,
          typeof body?.url === 'string' ? body.url : '',
        ),
      })
    } catch (error) {
      return toolError(error)
    }
  })
}

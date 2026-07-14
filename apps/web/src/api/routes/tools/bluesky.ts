import type { Hono } from 'hono'
import type { Env } from '@/env'
import {
  getBlueskyProfile,
  getBlueskySignupNumber,
} from '@/lib/bluesky/public-tools'
import { apiError, json, parseJson } from '../../http'

type BlueskyBody = {
  username?: unknown
  password?: unknown
}

const toolError = (error: unknown, status = 400) =>
  apiError({
    status,
    error: status >= 500 ? 'internal_error' : 'bad_request',
    reason: 'tool_request_failed',
    message: error instanceof Error ? error.message : String(error),
    whatBroke: 'The public Bluesky tool could not complete the lookup.',
    howToFix: [
      {
        title: 'Check the input',
        reason: 'Confirm the handle or credentials and retry the tool.',
      },
    ],
  })

export const registerBlueskyToolRoutes = (app: Hono<{ Bindings: Env }>) => {
  app.get('/tools/bluesky/profile/:handle', async (c) => {
    try {
      return json({ profile: await getBlueskyProfile(c.req.param('handle')) })
    } catch (error) {
      return toolError(error)
    }
  })

  app.post('/tools/bluesky/signup-number', async (c) => {
    const body = await parseJson<BlueskyBody>(c.req.raw)
    try {
      return json({
        number: await getBlueskySignupNumber({
          username: typeof body?.username === 'string' ? body.username : '',
          password: typeof body?.password === 'string' ? body.password : '',
        }),
      })
    } catch (error) {
      return toolError(error)
    }
  })
}

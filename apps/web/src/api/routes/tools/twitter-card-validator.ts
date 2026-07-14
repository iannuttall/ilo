import type { Context, Hono } from 'hono'
import type { Env } from '@/env'
import {
  buildBlueskyPreview,
  buildThreadsPreview,
  buildTwitterPreview,
} from '@/lib/tools/twitter-card-preview'
import { badRequestError, json, parseJson } from '../../http'

type TwitterCardValidatorBody = {
  url?: unknown
}

type ToolContext = Context<{ Bindings: Env }>

export const registerTwitterCardValidatorRoutes = (
  app: Hono<{ Bindings: Env }>,
) => {
  const handlePreview = async (
    c: ToolContext,
    variant: 'twitter' | 'threads' | 'bluesky',
  ) => {
    const body = await parseJson<TwitterCardValidatorBody>(c.req.raw)
    const url = typeof body?.url === 'string' ? body.url : ''

    try {
      if (variant === 'threads') return json(await buildThreadsPreview(url))
      if (variant === 'bluesky') return json(await buildBlueskyPreview(url))
      return json(await buildTwitterPreview(url))
    } catch (error) {
      return badRequestError(
        'preview_fetch_failed',
        error instanceof Error
          ? `Error fetching URL: ${error.message}`
          : 'Error fetching URL.',
        {
          whatBroke: 'The card validator could not fetch or parse the URL.',
          howToFix: [
            {
              title: 'Check the URL',
              reason:
                'Use a public absolute URL that returns HTML and retry the preview.',
            },
          ],
        },
      )
    }
  }

  app.post('/tools/twitter-card-validator', (c) => handlePreview(c, 'twitter'))
  app.post('/tools/threads-link-preview', (c) => handlePreview(c, 'threads'))
  app.post('/tools/bluesky-link-preview', (c) => handlePreview(c, 'bluesky'))
}

import { Hono } from 'hono'
import type { Env } from '@/env'
import { registerToolRoutes } from './routes/tools'

export const isWebsiteToolRequest = (request: Request) => {
  const url = new URL(request.url)
  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase()
  const fetchMode = request.headers.get('sec-fetch-mode')?.toLowerCase()
  const fetchDest = request.headers.get('sec-fetch-dest')?.toLowerCase()
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  if (fetchSite && fetchSite !== 'same-origin') return false
  if (!fetchSite && !origin && !referer) return false
  if (fetchDest && fetchDest !== 'empty') return false
  if (fetchMode && !['cors', 'same-origin'].includes(fetchMode)) return false

  for (const value of [origin, referer]) {
    if (!value) continue
    try {
      if (new URL(value).origin !== url.origin) return false
    } catch {
      return false
    }
  }

  return true
}

export const createApiRouter = () => {
  const app = new Hono<{ Bindings: Env }>().basePath('/api')
  app.use('/tools/*', async (c, next) => {
    if (!isWebsiteToolRequest(c.req.raw)) return c.notFound()
    await next()
  })
  registerToolRoutes(app)
  return app
}

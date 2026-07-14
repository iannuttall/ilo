import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from '@/env'
import { json } from './http'
import { registerToolRoutes } from './routes/tools'

export const createApiRouter = () => {
  const app = new Hono<{ Bindings: Env }>().basePath('/api')
  app.use(
    '*',
    cors({
      origin: '*',
      allowHeaders: ['Content-Type'],
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      maxAge: 86400,
    }),
  )
  app.get('/health', () => json({ ok: true, now: Date.now() }))
  registerToolRoutes(app)
  return app
}

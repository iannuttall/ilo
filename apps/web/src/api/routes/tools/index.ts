import type { Hono } from 'hono'
import type { Env } from '@/env'
import { registerBlueskyToolRoutes } from './bluesky'
import { registerTwitterCardValidatorRoutes } from './twitter-card-validator'
import { registerXToolRoutes } from './x'

export const registerToolRoutes = (app: Hono<{ Bindings: Env }>) => {
  registerTwitterCardValidatorRoutes(app)
  registerXToolRoutes(app)
  registerBlueskyToolRoutes(app)
}

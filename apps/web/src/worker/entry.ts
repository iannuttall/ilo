import { handle } from '@astrojs/cloudflare/handler'
import type { Env } from '@/env'
import { createIloWorker } from './runtime'

type CloudflareAdapterEnv = Parameters<typeof handle>[1]

const renderAstroPage = (request: Request, env: Env, ctx: ExecutionContext) =>
  handle(request, env as unknown as CloudflareAdapterEnv, ctx)

export default createIloWorker(renderAstroPage)

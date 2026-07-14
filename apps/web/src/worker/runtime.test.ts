import { describe, expect, it } from 'vitest'
import type { Env } from '@/env'
import { createIloWorker } from './runtime'

const worker = createIloWorker(async () => new Response('rendered'))
const context = {} as ExecutionContext

const fetchWorker = (pathname: string) =>
  worker.fetch(new Request(`https://ilo.so${pathname}`), {} as Env, context)

describe('legacy redirects', () => {
  it.each([
    '/api',
    '/docs/api',
  ])('redirects %s to the homepage with an exact 301', async (pathname) => {
    const response = await fetchWorker(pathname)
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('https://ilo.so/')
  })

  it('keeps other permanent route migrations on 308', async () => {
    const response = await fetchWorker('/login')
    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe('https://ilo.so/docs/start')
  })
})

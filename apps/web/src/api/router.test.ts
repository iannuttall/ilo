import { describe, expect, it } from 'vitest'
import { isWebsiteToolRequest } from './router'

const request = (headers: Record<string, string> = {}) =>
  new Request('https://ilo.so/api/tools/x/profile/ilo_so', { headers })

describe('isWebsiteToolRequest', () => {
  it('allows a same-origin browser fetch', () => {
    expect(
      isWebsiteToolRequest(
        request({
          'sec-fetch-site': 'same-origin',
          'sec-fetch-mode': 'cors',
          'sec-fetch-dest': 'empty',
          referer: 'https://ilo.so/twitter-profile-analytics',
        }),
      ),
    ).toBe(true)
  })

  it('rejects direct and cross-site callers', () => {
    expect(isWebsiteToolRequest(request())).toBe(false)
    expect(
      isWebsiteToolRequest(
        request({
          'sec-fetch-site': 'cross-site',
          origin: 'https://example.com',
        }),
      ),
    ).toBe(false)
  })

  it('allows older browsers when the referrer proves same origin', () => {
    expect(
      isWebsiteToolRequest(
        request({ referer: 'https://ilo.so/twitter-profile-analytics' }),
      ),
    ).toBe(true)
  })

  it('rejects a forged same-origin fetch with a foreign referrer', () => {
    expect(
      isWebsiteToolRequest(
        request({
          'sec-fetch-site': 'same-origin',
          'sec-fetch-mode': 'cors',
          referer: 'https://example.com/tool',
        }),
      ),
    ).toBe(false)
  })
})

export const CLICKY_SITE_ID = '101499732'

const CLICKY_PRODUCTION_HOSTS = new Set(['ilo.so', 'www.ilo.so'])

export const shouldLoadClickyAnalytics = (hostname: string) =>
  CLICKY_PRODUCTION_HOSTS.has(hostname.toLowerCase())

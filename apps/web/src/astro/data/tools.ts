export type AstroTool = {
  href: string
  title: string
  description: string
}

export const ASTRO_TOOLS: AstroTool[] = [
  {
    href: '/twitter-advanced-search',
    title: 'Twitter Advanced Search Builder',
    description:
      'Build an 𝕏 search URL with operators for accounts, dates, engagement, media, links, language, and replies.',
  },
  {
    href: '/twitter-search-without-account',
    title: 'Twitter Search Without Account',
    description:
      'Search public Twitter and 𝕏 posts without logging in. Supports text, media, and 𝕏 search operators.',
  },
  {
    href: '/twitter-profile-analytics',
    title: 'Twitter Profile Analytics',
    description:
      'Look up any public 𝕏 profile. Followers, post count, recent views, and engagement rate, with no login.',
  },
  {
    href: '/twitter-thread-reader',
    title: 'Twitter Thread Reader',
    description:
      'Unroll a public Twitter or 𝕏 thread into one clean page, with Markdown and JSON export options.',
  },
  {
    href: '/twitter-video-downloader',
    title: 'Twitter Video Downloader',
    description:
      'Find public video variants from an 𝕏 post URL and choose the file you need.',
  },
  {
    href: '/twitter-id',
    title: 'Twitter ID Lookup',
    description:
      'Find the numeric Twitter/𝕏 user ID for a public username or profile URL.',
  },
  {
    href: '/twitter-id-to-username',
    title: 'Twitter ID to Username',
    description:
      'Resolve a numeric Twitter/𝕏 user ID back to a public username when public data is available.',
  },
  {
    href: '/twitter-profile-picture-downloader',
    title: 'Twitter Profile Picture Downloader',
    description:
      'Download the highest resolution public profile image for an 𝕏 account.',
  },
  {
    href: '/twitter-follower-count',
    title: 'Twitter Follower Count',
    description:
      'Check a public 𝕏 account follower count and basic profile stats without signing in.',
  },
  {
    href: '/twitter-card-validator',
    title: 'Twitter Card Validator',
    description:
      'Preview the X/Twitter card metadata for any public URL and catch missing image, title, or description tags.',
  },
  {
    href: '/threads-link-preview',
    title: 'Threads Link Preview',
    description:
      'Check how a public URL is likely to appear when shared on Threads.',
  },
  {
    href: '/bluesky-link-preview',
    title: 'Bluesky Link Preview',
    description:
      'Preview a public URL card for Bluesky and inspect title, description, and image metadata.',
  },
  {
    href: '/bluesky-id',
    title: 'Bluesky ID Lookup',
    description:
      'Look up the DID and profile information for a public Bluesky handle.',
  },
  {
    href: '/bluesky-did',
    title: 'Bluesky DID Lookup',
    description:
      'Resolve a Bluesky DID to the public handle/profile data currently available.',
  },
]

export const getAstroToolBySlug = (slug: string) =>
  ASTRO_TOOLS.find((tool) => tool.href === `/${slug}`) ?? null

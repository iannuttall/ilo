import type { ComponentType } from 'react'

export type BlogDate = string | Date

export type BlogFrontmatter = {
  title: string
  description: string
  date: BlogDate
  author?: string
  cover?: string
  status?: 'published' | 'draft'
}

export type BlogEntry = BlogFrontmatter & { slug: string }

/* ------------------------------------------------------------------ */
/*  Eager frontmatter imports                                         */
/* ------------------------------------------------------------------ */

const frontmatterModules = import.meta.glob<{ frontmatter: BlogFrontmatter }>(
  '../../../content/blog/*.mdx',
  { eager: true },
)

const componentModules = import.meta.glob<{ default: ComponentType }>(
  '../../../content/blog/*.mdx',
  { eager: true },
)

/* ------------------------------------------------------------------ */
/*  Manifest                                                          */
/* ------------------------------------------------------------------ */

const dateToTime = (value: BlogDate) => {
  const date = value instanceof Date ? value : new Date(value)
  const time = date.getTime()
  return Number.isNaN(time) ? 0 : time
}

function buildManifest(): BlogEntry[] {
  const entries: BlogEntry[] = []
  for (const [path, mod] of Object.entries(frontmatterModules)) {
    const fm = mod.frontmatter
    if (!fm?.title || !fm.date) continue
    if (fm.status === 'draft' && !import.meta.env.DEV) continue
    const match = path.match(/\/([^/]+)\.mdx$/)
    if (!match) continue
    entries.push({
      slug: match[1],
      title: fm.title,
      description: fm.description,
      date: fm.date,
      author: fm.author,
      cover: fm.cover,
      status: fm.status,
    })
  }
  entries.sort((a, b) => dateToTime(b.date) - dateToTime(a.date))
  return entries
}

export const BLOG_MANIFEST = buildManifest()

export function getBlogEntry(slug: string): BlogEntry | null {
  return BLOG_MANIFEST.find((e) => e.slug === slug) ?? null
}

export function getBlogComponent(slug: string): ComponentType | null {
  const key = `../../../content/blog/${slug}.mdx`
  return componentModules[key]?.default ?? null
}

export function getBlogNavigation(slug: string): {
  prev: BlogEntry | null
  next: BlogEntry | null
} {
  const index = BLOG_MANIFEST.findIndex((entry) => entry.slug === slug)
  if (index === -1) return { prev: null, next: null }

  return {
    prev: BLOG_MANIFEST[index - 1] ?? null,
    next: BLOG_MANIFEST[index + 1] ?? null,
  }
}

const ordinalSuffix = (day: number) => {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

export function formatBlogDate(value: BlogDate): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const day = date.getUTCDate()
  const month = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    timeZone: 'UTC',
  }).format(date)

  return `${day}${ordinalSuffix(day)} ${month}, ${date.getUTCFullYear()}`
}

export function listBlogEntries(): BlogEntry[] {
  return BLOG_MANIFEST
}

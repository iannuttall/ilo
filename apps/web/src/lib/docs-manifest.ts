/* ------------------------------------------------------------------ */
/*  Frontmatter types                                                 */
/* ------------------------------------------------------------------ */

export type DocCategory = 'start' | 'agent' | 'reference'

export type DocFrontmatter = {
  title: string
  description: string
  category: DocCategory
  order: number
  status?: 'published' | 'draft'
  seoTitle?: string
  seoDescription?: string
  h1?: string
}

export type DocEntry = DocFrontmatter & { slug: string }

export const CATEGORY_ORDER: DocCategory[] = ['start', 'agent', 'reference']

export const CATEGORY_LABELS: Record<DocCategory, string> = {
  start: 'Start',
  agent: 'Agent setup',
  reference: 'Reference',
}

/* ------------------------------------------------------------------ */
/*  Glob imports (resolved at build time by Vite)                     */
/* ------------------------------------------------------------------ */

// Eager: frontmatter only (tiny, all inlined in the bundle)
const modules = import.meta.glob<{ frontmatter: DocFrontmatter }>(
  '../../content/docs/*.mdx',
  { eager: true },
)

/* ------------------------------------------------------------------ */
/*  Build manifest from frontmatter                                   */
/* ------------------------------------------------------------------ */

function buildManifest(): DocEntry[] {
  const entries: DocEntry[] = []

  for (const [path, mod] of Object.entries(modules)) {
    const fm = mod.frontmatter
    if (!fm?.title) continue
    if (fm.status === 'draft') continue

    // Extract slug from path: ../../content/docs/extension.mdx -> extension
    const match = path.match(/\/([^/]+)\.mdx$/)
    if (!match) continue

    entries.push({
      slug: match[1],
      title: fm.title,
      description: fm.description,
      category: fm.category,
      order: fm.order,
      status: fm.status,
      seoTitle: fm.seoTitle,
      seoDescription: fm.seoDescription,
      h1: fm.h1,
    })
  }

  // Sort by category order, then by order within category
  entries.sort((a, b) => {
    const catDiff =
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    if (catDiff !== 0) return catDiff
    return a.order - b.order
  })

  return entries
}

export const DOCS_MANIFEST = buildManifest()

/* ------------------------------------------------------------------ */
/*  Lookup helpers                                                    */
/* ------------------------------------------------------------------ */

export function getDocMeta(slug: string): DocEntry | undefined {
  return DOCS_MANIFEST.find((d) => d.slug === slug)
}

/* ------------------------------------------------------------------ */
/*  Flat list for prev/next navigation                                */
/* ------------------------------------------------------------------ */

export function getDocNavigation(slug: string) {
  const idx = DOCS_MANIFEST.findIndex((d) => d.slug === slug)
  return {
    current: idx >= 0 ? DOCS_MANIFEST[idx] : null,
    prev: idx > 0 ? DOCS_MANIFEST[idx - 1] : null,
    next: idx < DOCS_MANIFEST.length - 1 ? DOCS_MANIFEST[idx + 1] : null,
  }
}

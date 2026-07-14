declare module '*.mdx' {
  import type { ComponentType } from 'react'

  export const frontmatter: {
    title: string
    description: string
    category: string
    order: number
    status?: 'published' | 'draft'
  }

  const MDXContent: ComponentType
  export default MDXContent
}

const slugify = (value: string) =>
  value
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

const clampSlug = (value: string, maxLength: number) =>
  value.slice(0, maxLength).replace(/^-+|-+$/g, '')

export const buildMarkdownFilename = ({
  title,
  id,
  maxLength = 80,
}: {
  title?: string | null
  id?: string | null
  maxLength?: number
}) => {
  const safeMax = Math.max(1, Math.floor(maxLength))
  const titleSlug = clampSlug(slugify(String(title || '')), safeMax)
  if (titleSlug) return `${titleSlug}.md`

  const idSlug = clampSlug(slugify(String(id || '')), safeMax)
  if (idSlug) return `${idSlug}.md`

  return 'saved-item.md'
}

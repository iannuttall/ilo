// Normalize user-pasted URLs from public tool pages. Accepts bare domains by
// prepending https:// and rejects anything that is not http(s).
export const normalizeInputUrl = (raw: string): string | null => {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  try {
    const parsed = new URL(withProto)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

export const getOriginUrl = (url: string): string | null => {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

// Derive the .md variant of a URL. Preserves query and fragment.
// - /path        -> /path.md
// - /path/       -> /path/index.md
// - /            -> /index.md
// - /path.html   -> /path.md
export const deriveMdVariant = (url: string): string | null => {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname
    if (path.endsWith('.md')) return parsed.toString()
    if (path.endsWith('/')) {
      parsed.pathname = `${path}index.md`
    } else {
      const htmlMatch = path.match(/^(.*)\.(?:html?|xhtml)$/i)
      parsed.pathname = htmlMatch ? `${htmlMatch[1]}.md` : `${path}.md`
    }
    return parsed.toString()
  } catch {
    return null
  }
}

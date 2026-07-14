// Line-based parser and validator for AnswerDotAI llms.txt files.
// Spec shape:
//   # Site name                           (required, exactly one H1)
//   > optional blockquote summary         (zero or one)
//   optional prose paragraphs
//   ## Section name                       (zero or more H2 sections)
//   - [name](url): optional description   (list items inside H2 sections)
//   ...
//
// The validator emits issues with 1-based line numbers so the UI can highlight
// the offending line.

export type IssueSeverity = 'error' | 'warning' | 'info'

export type Issue = {
  severity: IssueSeverity
  line: number
  message: string
  hint: string | null
}

export type LlmsTxtLink = {
  line: number
  name: string
  url: string
  description: string | null
}

export type LlmsTxtSection = {
  heading: string
  line: number
  links: LlmsTxtLink[]
  isOptional: boolean
}

export type LlmsTxtDocument = {
  h1: { value: string; line: number } | null
  summary: { value: string; line: number } | null
  intro: string
  sections: LlmsTxtSection[]
}

export type ValidationReport = {
  document: LlmsTxtDocument
  issues: Issue[]
  stats: {
    linkCount: number
    sectionCount: number
    duplicateUrls: number
  }
}

const LINK_LINE = /^-\s+\[([^\]]+)\]\(([^)]+)\)(?:\s*:\s*(.*))?\s*$/
const H1_LINE = /^#\s+(.+?)\s*$/
const H2_LINE = /^##\s+(.+?)\s*$/
const BLOCKQUOTE_LINE = /^>\s?(.*)$/
const ANY_HEADING_LINE = /^#{1,6}\s+/

export const parseLlmsTxt = (raw: string): ValidationReport => {
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = text.split('\n')
  const issues: Issue[] = []

  let h1: LlmsTxtDocument['h1'] = null
  let summary: LlmsTxtDocument['summary'] = null
  const introParts: string[] = []
  const sections: LlmsTxtSection[] = []
  let currentSection: LlmsTxtSection | null = null

  const pushIssue = (
    severity: IssueSeverity,
    line: number,
    message: string,
    hint: string | null = null,
  ) => {
    issues.push({ severity, line, message, hint })
  }

  // Walk lines once. Track phases: before-h1, post-h1-pre-section, inside-section.
  let phase: 'pre-h1' | 'post-h1' | 'in-section' = 'pre-h1'

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i]
    const line = rawLine ?? ''
    const lineNo = i + 1
    const trimmed = line.trim()

    if (!trimmed) continue

    const h1Match = H1_LINE.exec(line)
    if (h1Match) {
      if (h1) {
        pushIssue(
          'error',
          lineNo,
          'Second H1 found. An llms.txt file must have exactly one H1 at the top.',
          'Change this to an H2 (## ...) or remove it.',
        )
      } else {
        h1 = { value: h1Match[1], line: lineNo }
        phase = 'post-h1'
      }
      continue
    }

    const h2Match = H2_LINE.exec(line)
    if (h2Match) {
      if (!h1) {
        pushIssue(
          'error',
          lineNo,
          'H2 section found before the H1. The file must start with an H1.',
          'Add a single "# Site name" heading at the top of the file.',
        )
      }
      const heading = h2Match[1]
      const section: LlmsTxtSection = {
        heading,
        line: lineNo,
        links: [],
        isOptional: heading.trim().toLowerCase() === 'optional',
      }
      sections.push(section)
      currentSection = section
      phase = 'in-section'
      continue
    }

    // H3+ headings are allowed by the spec for subsections, so we do not flag
    // them. The parser just skips past them and keeps walking the document.
    if (ANY_HEADING_LINE.test(line) && !h1Match && !h2Match) continue

    if (phase === 'pre-h1') {
      pushIssue(
        'warning',
        lineNo,
        'Content appears before the H1 heading. Anything before the H1 is outside the spec.',
        'Move this below the "# Site name" heading or delete it.',
      )
      continue
    }

    const bqMatch = BLOCKQUOTE_LINE.exec(line)
    if (bqMatch && phase === 'post-h1' && !summary) {
      const value = bqMatch[1].trim()
      if (!value) {
        pushIssue(
          'warning',
          lineNo,
          'Blockquote summary is empty. The summary should describe what the site is.',
          'Write one short sentence inside the blockquote, or remove it.',
        )
      }
      summary = { value, line: lineNo }
      continue
    }

    if (phase === 'in-section') {
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const normalized = line.replace(/^\*\s/, '- ')
        const linkMatch = LINK_LINE.exec(normalized)
        if (!linkMatch) {
          pushIssue(
            'error',
            lineNo,
            'List item does not match the spec shape.',
            'Format: "- [name](url): optional description".',
          )
          continue
        }
        const [, name, url, description] = linkMatch
        try {
          const parsed = new URL(url)
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            pushIssue(
              'warning',
              lineNo,
              `Link uses ${parsed.protocol} which agents may not follow.`,
              'Use https:// where possible.',
            )
          } else if (parsed.protocol === 'http:') {
            pushIssue(
              'info',
              lineNo,
              'Link uses http:// instead of https://.',
              'Switch to https:// if the site supports it.',
            )
          }
        } catch {
          pushIssue(
            'error',
            lineNo,
            `"${url}" is not a valid URL.`,
            'Use a full URL including the scheme, for example https://example.com.',
          )
          continue
        }
        if (!name.trim()) {
          pushIssue(
            'error',
            lineNo,
            'Link name is empty.',
            'Write a short, descriptive name between the square brackets.',
          )
        }
        currentSection?.links.push({
          line: lineNo,
          name,
          url,
          description: description?.trim() || null,
        })
        continue
      }
      // Arbitrary prose inside a section is allowed by the spec but not common.
      // Leave it; agents are expected to be tolerant.
      continue
    }

    // Phase is post-h1 and line is not a heading, blockquote, or list. Collect
    // it as intro prose.
    introParts.push(trimmed)
  }

  if (!h1) {
    pushIssue(
      'error',
      1,
      'Missing H1 heading. Every llms.txt file must start with a single H1 that names the site.',
      'Add "# Your Site Name" as the first line.',
    )
  }

  // Sections are allowed to contain prose without list items per the spec,
  // so we do not warn when a section has zero links.

  const urlSeen = new Map<string, number>()
  let duplicateUrls = 0
  for (const section of sections) {
    for (const link of section.links) {
      const key = link.url.trim().toLowerCase()
      const prev = urlSeen.get(key)
      if (prev) {
        duplicateUrls += 1
        pushIssue(
          'warning',
          link.line,
          `URL ${link.url} already appeared on line ${prev}.`,
          'Remove the duplicate or point one entry at a different resource.',
        )
      } else {
        urlSeen.set(key, link.line)
      }
    }
  }

  const linkCount = sections.reduce((total, s) => total + s.links.length, 0)

  // Sort issues by line so the UI renders them in reading order.
  issues.sort((a, b) => a.line - b.line)

  return {
    document: {
      h1,
      summary,
      intro: introParts.join(' '),
      sections,
    },
    issues,
    stats: {
      linkCount,
      sectionCount: sections.length,
      duplicateUrls,
    },
  }
}

export const hasErrors = (issues: Issue[]) =>
  issues.some((i) => i.severity === 'error')

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseHTML } from 'linkedom'

const MINIMUM_GUIDE_WORDS = 500
const MINIMUM_SPECIFIC_WORDS = 300

const requiredHeadings = [
  'Available today as a research guide',
  'Collect the evidence before interpreting it',
  'Work through the analysis in this order',
  'What a useful result contains',
  'What the result cannot prove',
  'Use it from the CLI',
  'Use it with local MCP',
  'Use it from TypeScript',
]

const placeholderPhrases = [
  'this public guide helps an agent understand the account before it suggests',
  'agents can use the checks as working context for content planning',
  'this guide is for people and agents that need useful x context before they suggest content',
]

const normalizeText = (value = '') => value.replace(/\s+/g, ' ').trim()
const countWords = (value) =>
  value.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0

async function reportSlugs(routeRoot) {
  const entries = await readdir(routeRoot, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en-US'))
}

async function inspectGuide(filePath, expectedCanonicalPath) {
  const html = await readFile(filePath, 'utf8')
  const { document } = parseHTML(html)
  const guide = document.querySelector('[data-report-guide]')
  if (!guide) return { error: 'missing [data-report-guide]' }

  const canonical = document
    .querySelector('link[rel="canonical"]')
    ?.getAttribute('href')
  if (!canonical) return { error: 'missing canonical link' }
  if (new URL(canonical, 'https://ilo.so').pathname !== expectedCanonicalPath) {
    return {
      error: `canonical is ${canonical}, expected ${expectedCanonicalPath}`,
    }
  }

  for (const element of guide.querySelectorAll(
    'script, style, template, noscript, [hidden], [aria-hidden="true"], [data-code-copy]',
  )) {
    element.remove()
  }

  const text = normalizeText(guide.textContent ?? '')
  const specificText = normalizeText(
    Array.from(guide.querySelectorAll('[data-report-specific]'))
      .map((element) => element.textContent ?? '')
      .join(' '),
  )
  const headings = new Set(
    Array.from(guide.querySelectorAll('h2, h3')).map((heading) =>
      normalizeText(heading.textContent ?? ''),
    ),
  )
  const surfacesWithExamples = new Set(
    Array.from(guide.querySelectorAll('[data-report-surface]'))
      .filter((surface) => Boolean(surface.querySelector('pre code')))
      .map((surface) => surface.getAttribute('data-report-surface')),
  )

  return {
    headings,
    specificWordCount: countWords(specificText),
    surfacesWithExamples,
    text,
    wordCount: countWords(text),
  }
}

export async function checkReportGuides(clientDir) {
  const variants = [
    { label: 'public', root: path.join(clientDir, 'reports') },
    { label: 'docs', root: path.join(clientDir, 'docs', 'reports') },
  ]
  const slugSets = await Promise.all(
    variants.map(({ root }) => reportSlugs(root)),
  )
  const failures = []

  if (slugSets[0].join('\n') !== slugSets[1].join('\n')) {
    failures.push('public and docs report routes do not contain the same slugs')
  }
  if (slugSets[0].length === 0) {
    failures.push('no generated report guides were found')
  }

  for (const slug of slugSets[0]) {
    const inspected = []
    for (const variant of variants) {
      const result = await inspectGuide(
        path.join(variant.root, slug, 'index.html'),
        `${variant.label === 'public' ? '/reports' : '/docs/reports'}/${slug}`,
      )
      inspected.push(result)

      if (result.error) {
        failures.push(`${variant.label}/${slug}: ${result.error}`)
        continue
      }
      if (result.wordCount < MINIMUM_GUIDE_WORDS) {
        failures.push(
          `${variant.label}/${slug}: ${result.wordCount} guide words, expected at least ${MINIMUM_GUIDE_WORDS}`,
        )
      }
      if (result.specificWordCount < MINIMUM_SPECIFIC_WORDS) {
        failures.push(
          `${variant.label}/${slug}: ${result.specificWordCount} report-specific words, expected at least ${MINIMUM_SPECIFIC_WORDS}`,
        )
      }
      for (const heading of requiredHeadings) {
        if (!result.headings.has(heading)) {
          failures.push(
            `${variant.label}/${slug}: missing required section "${heading}"`,
          )
        }
      }
      for (const surface of ['cli', 'mcp', 'typescript']) {
        if (!result.surfacesWithExamples.has(surface)) {
          failures.push(
            `${variant.label}/${slug}: ${surface} section has no exact code example`,
          )
        }
      }
      const lowerText = result.text.toLowerCase().replaceAll('𝕏', 'x')
      for (const phrase of placeholderPhrases) {
        if (lowerText.includes(phrase)) {
          failures.push(
            `${variant.label}/${slug}: contains placeholder copy "${phrase}"`,
          )
        }
      }
    }

    const [publicGuide, docsGuide] = inspected
    if (
      !publicGuide?.error &&
      !docsGuide?.error &&
      publicGuide.text !== docsGuide.text
    ) {
      failures.push(
        `${slug}: public and docs routes do not render the same full guide`,
      )
    }
  }

  if (failures.length > 0) {
    throw new Error(`Report guide check failed:\n${failures.join('\n')}`)
  }

  process.stdout.write(
    `Report guide check passed for ${slugSets[0].length} reports across both routes.\n`,
  )
}

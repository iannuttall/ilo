#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const DEFAULT_BASELINE = 'https://ilo.so'
const DEFAULT_CANDIDATE = 'http://localhost:8787'
const MAX_DISCOVERED_ROUTES = 300
const CONCURRENCY = 8

const args = new Set(process.argv.slice(2))
const baselineOrigin = new URL(
  process.env.SEO_PARITY_BASELINE ?? DEFAULT_BASELINE,
).origin
const candidateOrigin = new URL(
  process.env.SEO_PARITY_CANDIDATE ?? DEFAULT_CANDIDATE,
).origin
const strict = args.has('--strict')
const json = args.has('--json')
const snapshot = args.has('--snapshot')
const live = args.has('--live')
const snapshotPath =
  process.env.SEO_PARITY_SNAPSHOT ??
  (!live && !snapshot
    ? fileURLToPath(new URL('./seo-baseline.json', import.meta.url))
    : undefined)

const decodeHtml = (value = '') =>
  value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&nbsp;', ' ')

const cleanText = (value = '') =>
  decodeHtml(value.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

const tagAttributes = (tag) => {
  const attributes = {}
  const pattern = /([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
  for (const match of tag.matchAll(pattern)) {
    attributes[match[1].toLowerCase()] = decodeHtml(
      match[2] ?? match[3] ?? match[4] ?? '',
    )
  }
  return attributes
}

const findTag = (html, name, value) => {
  for (const match of html.matchAll(/<(?:meta|link)\b[^>]*>/gi)) {
    const attributes = tagAttributes(match[0])
    if (
      attributes.name?.toLowerCase() === name.toLowerCase() ||
      attributes.property?.toLowerCase() === name.toLowerCase() ||
      attributes.rel?.toLowerCase().split(/\s+/).includes(name.toLowerCase())
    ) {
      if (!value || attributes.content === value || attributes.href === value) {
        return attributes.content ?? attributes.href ?? ''
      }
    }
  }
  return ''
}

const pageText = (html) => {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html
  const main = body.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? body
  return cleanText(
    main
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, ' '),
  )
}

const pageLinks = (html, origin) => {
  const links = new Set()
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = tagAttributes(match[0]).href
    if (!href || href.startsWith('#')) continue
    try {
      const url = new URL(href, origin)
      if (url.origin !== origin) continue
      if (
        /\.(?:avif|css|gif|ico|jpe?g|js|json|map|pdf|png|svg|txt|webp|woff2?)$/i.test(
          url.pathname,
        )
      ) {
        continue
      }
      links.add(url.pathname || '/')
    } catch {}
  }
  return links
}

const inspectHtml = (html, origin) => {
  const title = cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1])
  const h1 = cleanText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1])
  const canonical = findTag(html, 'canonical')
  const robots = findTag(html, 'robots').toLowerCase()
  const text = pageText(html)
  const structuredData = [
    ...html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
    .map((match) => match[1].replace(/\s+/g, ' ').trim())
    .join('\n')
  return {
    title,
    description: findTag(html, 'description'),
    canonical,
    canonicalPath: canonical ? new URL(canonical, origin).pathname : '',
    robots,
    noindex: robots.split(',').some((part) => part.trim() === 'noindex'),
    h1,
    ogTitle: findTag(html, 'og:title'),
    ogDescription: findTag(html, 'og:description'),
    ogUrl: findTag(html, 'og:url'),
    wordCount: text ? text.split(/\s+/).length : 0,
    contentSignature: createHash('sha256').update(text).digest('hex'),
    structuredDataSignature: structuredData
      ? createHash('sha256').update(structuredData).digest('hex')
      : '',
    links: [...pageLinks(html, origin)],
  }
}

const fetchPage = async (origin, pathname) => {
  const url = new URL(pathname, origin)
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
      headers: { 'user-agent': 'ilo-seo-parity/1.0' },
    })
    const contentType = response.headers.get('content-type') ?? ''
    const html = contentType.includes('text/html') ? await response.text() : ''
    const headerRobots = (
      response.headers.get('x-robots-tag') ?? ''
    ).toLowerCase()
    const inspection = html ? inspectHtml(html, origin) : {}
    return {
      pathname,
      status: response.status,
      location: response.headers.get('location') ?? '',
      contentType,
      ...inspection,
      headerRobots,
      noindex:
        inspection.noindex ||
        headerRobots.split(',').some((part) => part.trim() === 'noindex'),
    }
  } catch (error) {
    return {
      pathname,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const fetchSitemap = async (origin) => {
  const response = await fetch(new URL('/sitemap.xml', origin), {
    signal: AbortSignal.timeout(20_000),
    headers: { 'user-agent': 'ilo-seo-parity/1.0' },
  })
  if (!response.ok)
    throw new Error(`${origin}/sitemap.xml returned ${response.status}`)
  const xml = await response.text()
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(
    (match) => new URL(decodeHtml(match[1]), origin).pathname,
  )
}

const mapLimit = async (values, limit, callback) => {
  const results = new Array(values.length)
  let next = 0
  const worker = async () => {
    while (next < values.length) {
      const index = next++
      results[index] = await callback(values[index], index)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, worker),
  )
  return results
}

const crawlBaseline = async (sitemapPaths) => {
  const queued = [...new Set(sitemapPaths)]
  const seen = new Set()
  const pages = new Map()
  while (queued.length > 0 && seen.size < MAX_DISCOVERED_ROUTES) {
    const batch = queued
      .splice(0, CONCURRENCY)
      .filter((path) => !seen.has(path))
    if (batch.length === 0) continue
    for (const path of batch) seen.add(path)
    const results = await mapLimit(batch, CONCURRENCY, (path) =>
      fetchPage(baselineOrigin, path),
    )
    for (const page of results) {
      pages.set(page.pathname, page)
      if (page.status < 200 || page.status >= 300 || !page.title) continue
      for (const link of page.links ?? []) {
        if (!seen.has(link) && !queued.includes(link)) queued.push(link)
      }
    }
  }
  return pages
}

const loadBaseline = async () => {
  if (snapshotPath) {
    const saved = JSON.parse(await readFile(snapshotPath, 'utf8'))
    return {
      origin: saved.origin,
      sitemapPaths: saved.sitemapPaths,
      pages: new Map(saved.pages.map((page) => [page.pathname, page])),
    }
  }
  const sitemapPaths = await fetchSitemap(baselineOrigin)
  return {
    origin: baselineOrigin,
    sitemapPaths,
    pages: await crawlBaseline(sitemapPaths),
  }
}

const saveablePage = (page) => ({
  pathname: page.pathname,
  status: page.status,
  location: page.location,
  contentType: page.contentType,
  title: page.title,
  description: page.description,
  canonical: page.canonical,
  canonicalPath: page.canonicalPath,
  robots: page.robots,
  headerRobots: page.headerRobots,
  noindex: page.noindex,
  h1: page.h1,
  ogTitle: page.ogTitle,
  ogDescription: page.ogDescription,
  ogUrl: page.ogUrl,
  wordCount: page.wordCount,
  contentSignature: page.contentSignature,
  structuredDataSignature: page.structuredDataSignature,
})

const compareField = (issues, path, field, baseline, candidate) => {
  if (baseline === candidate) return
  issues.push({
    level: 'warning',
    path,
    check: field,
    baseline,
    candidate,
  })
}

const main = async () => {
  const baseline = await loadBaseline()
  const baselineSitemap = baseline.sitemapPaths
  const baselinePages = baseline.pages

  if (snapshot) {
    console.log(
      JSON.stringify(
        {
          version: 1,
          capturedAt: new Date().toISOString(),
          origin: baseline.origin,
          sitemapPaths: baselineSitemap,
          pages: [...baselinePages.values()]
            .sort((a, b) => a.pathname.localeCompare(b.pathname))
            .map(saveablePage),
        },
        null,
        2,
      ),
    )
    return
  }

  const candidateSitemap = await fetchSitemap(candidateOrigin)
  const baselineSitemapSet = new Set(baselineSitemap)
  const candidateSitemapSet = new Set(candidateSitemap)
  const issues = []
  const redirects = []

  for (const path of baselineSitemap) {
    if (!candidateSitemapSet.has(path)) {
      issues.push({ level: 'error', path, check: 'missing-from-sitemap' })
    }
  }

  const indexablePaths = [...baselinePages.values()]
    .filter(
      (page) =>
        page.status >= 200 &&
        page.status < 300 &&
        page.contentType?.includes('text/html') &&
        !page.noindex,
    )
    .map((page) => page.pathname)
    .sort()
  const candidatePages = await mapLimit(indexablePaths, CONCURRENCY, (path) =>
    fetchPage(candidateOrigin, path),
  )

  for (const candidate of candidatePages) {
    const path = candidate.pathname
    const baseline = baselinePages.get(path)
    if (!baseline) continue
    if ([301, 308].includes(candidate.status) && candidate.location) {
      const redirectPath = new URL(candidate.location, candidateOrigin).pathname
      const destination = await fetchPage(candidateOrigin, redirectPath)
      if (destination.status === 200) {
        redirects.push({
          path,
          status: candidate.status,
          destination: redirectPath,
        })
        continue
      }
    }
    if (candidate.status !== 200) {
      issues.push({
        level: 'error',
        path,
        check: 'status',
        baseline: baseline.status,
        candidate: candidate.status,
        location: candidate.location,
      })
      continue
    }
    if (candidate.noindex) {
      issues.push({ level: 'error', path, check: 'new-noindex' })
    }
    if (!candidate.canonical || candidate.canonical !== baseline.canonical) {
      issues.push({
        level: 'error',
        path,
        check: 'canonical',
        baseline: baseline.canonical,
        candidate: candidate.canonical,
      })
    }
    for (const field of [
      'title',
      'description',
      'h1',
      'ogTitle',
      'ogDescription',
      'ogUrl',
    ]) {
      compareField(issues, path, field, baseline[field], candidate[field])
    }
    if (
      baseline.wordCount >= 100 &&
      candidate.wordCount < Math.floor(baseline.wordCount * 0.8)
    ) {
      issues.push({
        level: 'warning',
        path,
        check: 'word-count-drop',
        baseline: baseline.wordCount,
        candidate: candidate.wordCount,
      })
    }
    if (
      baseline.wordCount > 0 &&
      baseline.contentSignature !== candidate.contentSignature
    ) {
      issues.push({
        level: 'warning',
        path,
        check: 'main-content-changed',
        baseline: baseline.wordCount,
        candidate: candidate.wordCount,
      })
    }
    if (
      baseline.structuredDataSignature !== candidate.structuredDataSignature
    ) {
      issues.push({
        level: 'warning',
        path,
        check: 'structured-data-changed',
      })
    }
  }

  const result = {
    baselineOrigin: baseline.origin,
    candidateOrigin,
    baselineSitemapRoutes: baselineSitemap.length,
    candidateSitemapRoutes: candidateSitemap.length,
    addedSitemapRoutes: candidateSitemap.filter(
      (path) => !baselineSitemapSet.has(path),
    ),
    discoveredBaselineRoutes: baselinePages.size,
    indexableRoutesCompared: indexablePaths.length,
    discoveredRoutes: [...baselinePages.keys()].sort(),
    indexableRoutes: indexablePaths,
    permanentRedirects: redirects,
    errors: issues.filter((issue) => issue.level === 'error'),
    warnings: issues.filter((issue) => issue.level === 'warning'),
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(
      `Compared ${result.indexableRoutesCompared} indexable routes (${result.baselineSitemapRoutes} live sitemap, ${result.candidateSitemapRoutes} candidate sitemap).`,
    )
    for (const issue of issues) {
      console.log(
        `${issue.level.toUpperCase()} ${issue.path} ${issue.check}`,
        issue.baseline === undefined
          ? ''
          : `\n  live: ${JSON.stringify(issue.baseline)}\n  new:  ${JSON.stringify(issue.candidate)}`,
      )
    }
    console.log(
      `${result.errors.length} errors, ${result.warnings.length} metadata/content warnings.`,
    )
  }

  if (result.errors.length > 0 || (strict && result.warnings.length > 0)) {
    process.exitCode = 1
  }
}

await main()

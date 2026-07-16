import type { XArticle, XArticleMonitor, XArticleSearchResult } from '@ilo/core'
import pc from 'picocolors'
import { terminalColumns, wrapTerminalText } from '../terminal.js'

const articleDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const checkedAt = (timestamp: number | null) =>
  timestamp === null
    ? 'never'
    : new Date(timestamp).toLocaleString('en-GB', { timeZone: 'UTC' })

const divider = (columns: number) =>
  pc.dim('─'.repeat(Math.min(Math.max(24, columns - 4), 88)))

const wrapArticleBody = (value: string, width: number) =>
  value
    .split(/\n\s*\n/)
    .map((block) => wrapTerminalText(block, width))
    .filter(Boolean)
    .join('\n\n')

export const renderXArticleMonitors = (
  accountHandle: string,
  monitors: XArticleMonitor[],
  requestedColumns = process.stdout.columns ?? 120,
) => {
  const columns = terminalColumns(requestedColumns)
  const rows = monitors.map((monitor) => {
    const history = monitor.lastCheckedAt
      ? monitor.historyComplete
        ? 'history imported'
        : 'older history remains'
      : 'not checked yet'
    return [
      `${monitor.enabled ? pc.green('active') : pc.dim('paused')} ${pc.dim('·')} ${pc.bold(`@${monitor.sourceHandle}`)} ${pc.dim('·')} ${monitor.id.slice(0, 8)}`,
      pc.dim(`Last checked: ${checkedAt(monitor.lastCheckedAt)} · ${history}`),
      monitor.lastError ? pc.red(monitor.lastError) : '',
    ]
      .filter(Boolean)
      .join('\n')
  })
  return [
    pc.bold(`X article monitors for @${accountHandle}`),
    pc.dim(`${monitors.length} monitor${monitors.length === 1 ? '' : 's'}`),
    '',
    rows.join(`\n${divider(columns)}\n`),
  ].join('\n')
}

export const renderXArticles = (
  articles: XArticleSearchResult[],
  requestedColumns = process.stdout.columns ?? 120,
) => {
  const columns = terminalColumns(requestedColumns)
  const contentWidth = Math.max(24, columns - 4)
  const rows = articles.map((article) =>
    [
      pc.bold(article.title),
      `${article.author.name} ${pc.cyan(`@${article.author.handle}`)} ${pc.dim('·')} ${articleDate.format(article.createdAt)}`,
      article.excerpt
        ? wrapTerminalText(article.excerpt, contentWidth)
        : pc.dim('(No article preview returned by X.)'),
      pc.dim(article.url),
    ].join('\n'),
  )
  return [
    pc.bold('Saved X articles'),
    pc.dim(`${articles.length} article${articles.length === 1 ? '' : 's'}`),
    '',
    rows.join(`\n${divider(columns)}\n`),
  ].join('\n')
}

export const renderXArticle = (
  article: XArticle,
  requestedColumns = process.stdout.columns ?? 120,
) => {
  const columns = terminalColumns(requestedColumns)
  const contentWidth = Math.max(24, columns - 4)
  const body = article.bodyText || article.previewText
  return [
    pc.bold(article.title),
    `${article.author.name} ${pc.cyan(`@${article.author.handle}`)} ${pc.dim('·')} ${articleDate.format(article.createdAt)}`,
    '',
    body
      ? wrapArticleBody(body, contentWidth)
      : pc.dim('(No article body returned by X.)'),
    '',
    pc.dim(article.url),
  ].join('\n')
}

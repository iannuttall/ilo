import type { XInboxItem } from '@ilo/core'
import Table from 'cli-table3'
import pc from 'picocolors'
import { terminalColumns, wrapTerminalText } from '../terminal.js'

const number = new Intl.NumberFormat('en-GB', { notation: 'compact' })
const formatNumber = (value: number) =>
  number.format(value).replace(/[kmbt]$/i, (suffix) => suffix.toUpperCase())

const itemState = (item: XInboxItem) => {
  if (item.state.archivedAt) return pc.dim('archived')
  if (item.state.repliedAt) return pc.green('replied')
  if (!item.state.readAt) return pc.cyan('new')
  return pc.dim('read')
}

const relativeTime = (timestamp: number) => {
  const elapsed = Math.max(0, Date.now() - timestamp)
  if (elapsed < 60_000) return 'now'
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m`
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h`
  return `${Math.floor(elapsed / 86_400_000)}d`
}

const relationshipSignals = (item: XInboxItem) => {
  const signals: string[] = []
  if (item.author.verified) signals.push(pc.blue('verified'))
  if (item.relationship.followsMe === true)
    signals.push(pc.green('follows you'))
  if (item.relationship.followsMe === false)
    signals.push(pc.dim("doesn't follow you"))
  if (item.relationship.followsMe === null)
    signals.push(pc.dim('follows you: unknown'))
  if (item.relationship.iFollow === true) signals.push(pc.green('you follow'))
  if (item.relationship.iFollow === false)
    signals.push(pc.dim("you don't follow"))
  if (item.relationship.iFollow === null)
    signals.push(pc.dim('you follow: unknown'))
  return signals
}

const engagement = (item: XInboxItem) =>
  [
    `${formatNumber(item.replies)} replies`,
    `${formatNumber(item.likes)} likes`,
    item.views === null ? '' : `${formatNumber(item.views)} views`,
  ]
    .filter(Boolean)
    .join(' · ')

const renderWideInbox = (items: XInboxItem[], columns: number) => {
  const targetWidth = Math.min(columns - 4, 156)
  const table = new Table({
    head: [
      pc.bold('State'),
      pc.bold('Account'),
      pc.bold('Signals'),
      pc.bold('Monitor'),
      pc.bold('Post'),
    ],
    colWidths: [10, 24, 22, 18, targetWidth - 80],
    wordWrap: true,
    style: { head: [], border: [] },
  })
  for (const item of items) {
    const followers =
      item.author.followers === null
        ? ''
        : `\n${pc.dim(`${formatNumber(item.author.followers)} followers`)}`
    table.push([
      itemState(item),
      `${item.author.name}\n${pc.cyan(`@${item.author.handle}`)}${followers}`,
      relationshipSignals(item).join('\n'),
      item.monitors.map((monitor) => monitor.name).join('\n'),
      `${item.text || pc.dim('(no text)')}\n${pc.dim(`${relativeTime(item.createdAt)} · ${engagement(item)}`)}\n${pc.dim(item.url)}`,
    ])
  }
  return table.toString()
}

const renderStackedInbox = (items: XInboxItem[], columns: number) => {
  const contentWidth = Math.max(24, columns - 4)
  const divider = pc.dim('─'.repeat(Math.min(contentWidth, 88)))
  return items
    .map((item) => {
      const followers =
        item.author.followers === null
          ? pc.dim('followers unknown')
          : `${formatNumber(item.author.followers)} ${pc.dim('followers')}`
      return [
        `${itemState(item)} ${pc.dim('·')} ${relativeTime(item.createdAt)} ${pc.dim('·')} ${item.monitors.map((monitor) => monitor.name).join(', ')}`,
        `${item.author.name} ${pc.cyan(`@${item.author.handle}`)} ${pc.dim('·')} ${followers}`,
        relationshipSignals(item).join(pc.dim(' · ')),
        wrapTerminalText(item.text || '(no text)', contentWidth),
        pc.dim(engagement(item)),
        pc.dim(item.url),
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join(`\n${divider}\n`)
}

export const renderXInbox = (
  accountHandle: string,
  items: XInboxItem[],
  requestedColumns = process.stdout.columns ?? 120,
) => {
  const columns = terminalColumns(requestedColumns)
  const output =
    columns >= 140
      ? renderWideInbox(items, columns)
      : renderStackedInbox(items, columns)
  return [
    pc.bold(`X inbox for @${accountHandle}`),
    pc.dim(`${items.length} item${items.length === 1 ? '' : 's'}`),
    '',
    output,
  ].join('\n')
}

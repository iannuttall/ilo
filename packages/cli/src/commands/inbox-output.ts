import type { XInboxItem } from '@ilo/core'
import Table from 'cli-table3'
import pc from 'picocolors'

const number = new Intl.NumberFormat('en-GB', { notation: 'compact' })

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
    signals.push(pc.dim('not following'))
  if (item.relationship.followsMe === null) signals.push(pc.dim('follows: ?'))
  if (item.relationship.iFollow === true) signals.push(pc.green('you follow'))
  if (item.relationship.iFollow === false) signals.push(pc.dim('not followed'))
  if (item.relationship.iFollow === null) signals.push(pc.dim('you follow: ?'))
  return signals.join('\n')
}

const engagement = (item: XInboxItem) =>
  [
    `${number.format(item.replies)} replies`,
    `${number.format(item.likes)} likes`,
    item.views === null ? '' : `${number.format(item.views)} views`,
  ]
    .filter(Boolean)
    .join(' · ')

export const renderXInbox = (accountHandle: string, items: XInboxItem[]) => {
  const table = new Table({
    head: [
      pc.bold('State'),
      pc.bold('Account'),
      pc.bold('Signals'),
      pc.bold('Monitor'),
      pc.bold('Post'),
    ],
    colWidths: [10, 25, 20, 20, 50],
    wordWrap: true,
    style: { head: [], border: [] },
  })
  for (const item of items) {
    const followers =
      item.author.followers === null
        ? ''
        : `\n${pc.dim(`${number.format(item.author.followers)} followers`)}`
    table.push([
      itemState(item),
      `${item.author.name}\n${pc.cyan(`@${item.author.handle}`)}${followers}`,
      relationshipSignals(item),
      item.monitors.map((monitor) => monitor.name).join('\n'),
      `${item.text || pc.dim('(no text)')}\n${pc.dim(`${relativeTime(item.createdAt)} · ${engagement(item)}`)}\n${pc.dim(item.url)}`,
    ])
  }
  return [
    pc.bold(`X inbox for @${accountHandle}`),
    pc.dim(`${items.length} item${items.length === 1 ? '' : 's'}`),
    '',
    table.toString(),
  ].join('\n')
}

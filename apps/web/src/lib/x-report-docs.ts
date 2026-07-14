import { reportGroups, type XReportWithGroup } from '@/lib/x-report-catalog'

export type XReportDoc = XReportWithGroup & {
  commandId: string
  lead: string
  dataSources: string[]
  bestFor: string[]
  checks: string[]
  returns: string[]
  related: string[]
  seoTitle: string
  seoDescription: string
  seoHeading: string
  primaryKeyword: string
}

export type XReportDocGroup = {
  title: string
  description: string
  docs: XReportDoc[]
}

const groupDetails: Record<
  string,
  Pick<XReportDoc, 'dataSources' | 'bestFor' | 'checks' | 'returns'>
> = {
  Performance: {
    dataSources: [
      'Public 𝕏 profile snapshot',
      'Recent public posts',
      'Normalized engagement metrics',
      'Stored handle history when the workspace has tracked the account before',
    ],
    bestFor: [
      'Getting a fast read on what an account is known for.',
      'Finding the posts and patterns worth studying before planning new content.',
      'Giving an agent account context before it writes, edits, or compares ideas.',
    ],
    checks: [
      'Profile state, follower count, public post count, and recent activity.',
      'Post-level replies, reposts, likes, quotes, views, and engagement rate where available.',
      'Strong and weak examples that show what the audience appears to reward.',
    ],
    returns: [
      'A plain summary of the account and current performance signals.',
      'Evidence rows the agent can cite when it explains a recommendation.',
      'Suggested follow-up reports when one broad read is not enough.',
    ],
  },
  'Content patterns': {
    dataSources: [
      'Recent public posts',
      'Post text and visible structure',
      'Normalized performance metrics',
    ],
    bestFor: [
      'Finding topics, hooks, and language patterns that repeat in stronger posts.',
      'Turning a messy post history into a short working brief for an agent.',
      'Spotting ideas the account keeps returning to without guessing from one viral post.',
    ],
    checks: [
      'Repeated topics, claims, phrases, openings, and post structures.',
      'Pattern overlap between stronger posts and weaker posts.',
      'How much evidence supports each pattern before it becomes advice.',
    ],
    returns: [
      'A pattern list with examples from the account history.',
      'Warnings when the sample is too small or skewed by one outlier.',
      'Practical prompts an agent can use when planning the next post.',
    ],
  },
  'Format breakdown': {
    dataSources: [
      'Recent public posts',
      'Post text and media markers',
      'Normalized replies, reposts, likes, quotes, views, and engagement rate',
    ],
    bestFor: [
      'Comparing links, media, threads, replies, long posts, and short posts.',
      'Checking whether a format actually helps this account.',
      'Finding format advice that comes from the account history, not generic posting tips.',
    ],
    checks: [
      'Text-only posts against posts with links, media, quotes, or thread-like structure.',
      'Length buckets and the engagement patterns around each bucket.',
      'Sample size and outlier risk for each format comparison.',
    ],
    returns: [
      'Format-level averages and example posts.',
      'Clear caveats when a comparison is too thin to trust.',
      'Next format tests the agent can suggest without changing the whole content strategy.',
    ],
  },
  'Timing and cadence': {
    dataSources: [
      'Post timestamps',
      'Recent public posts',
      'Normalized engagement metrics',
    ],
    bestFor: [
      'Choosing posting windows worth testing next.',
      'Checking whether the account posts often enough to learn from the data.',
      'Separating useful timing signals from generic best-time-to-post advice.',
    ],
    checks: [
      'Day and time buckets from the account history.',
      'Repeated windows that produced stronger or weaker results.',
      'Cadence changes that may affect how much the account can learn each week.',
    ],
    returns: [
      'Posting windows to test again.',
      'Stale windows that deserve less attention.',
      'Cadence notes an agent can use in a weekly content plan.',
    ],
  },
  'Audience response': {
    dataSources: [
      'Recent public posts',
      'Replies, reposts, likes, quotes, views, and engagement rate',
      'Visible post topics and structures',
    ],
    bestFor: [
      'Understanding why people reply, repost, or save attention for a post.',
      'Finding the difference between posts that get seen and posts that start conversation.',
      'Giving an agent evidence for stronger calls, questions, and angles.',
    ],
    checks: [
      'Reply-heavy posts compared with posts that only collect passive attention.',
      'Repost-friendly ideas, useful reference posts, and conversation starters.',
      'View-to-reply gaps where attention did not become interaction.',
    ],
    returns: [
      'Audience response patterns with example posts.',
      'Likely reasons a post drew replies, reposts, or quiet attention.',
      'Follow-up reports for topics, formats, or weak spots.',
    ],
  },
  'Next steps': {
    dataSources: [
      'Profile snapshot',
      'Recent public posts',
      'All available report sections for the handle',
    ],
    bestFor: [
      'Turning analysis into a short action list.',
      'Giving an agent a compact brief before it suggests new posts.',
      'Deciding what to repeat, cut, test, or explain in a monthly review.',
    ],
    checks: [
      'The strongest repeated signals across topics, formats, timing, and response.',
      'Weak habits that appear often enough to be worth changing.',
      'Concrete experiments that can run without rebuilding the account strategy.',
    ],
    returns: [
      'A short next-step list.',
      'A working agent brief for content planning.',
      'A monthly or one-off summary a human can read without digging through raw rows.',
    ],
  },
}

const groupDescriptions: Record<string, string> = {
  Performance:
    'Start here when an agent needs a broad read on an 𝕏 account, its strongest posts, and the signals that need attention.',
  'Content patterns':
    'Use these reports to find the topics, hooks, language, and voice patterns that show up in stronger posts.',
  'Format breakdown':
    'Use these reports when the question is whether links, media, long posts, threads, or other formats help this account.',
  'Timing and cadence':
    'Use these reports to choose posting windows, check cadence, and avoid stale timing advice.',
  'Audience response':
    'Use these reports to understand replies, reposts, saves, and the gap between attention and conversation.',
  'Next steps':
    'Use these reports when the agent needs a brief, an action list, or a monthly summary from the account history.',
}

const commandBySlug: Record<string, string> = {
  'account-snapshot': 'audit.profile.snapshot',
  'top-posts': 'audit.posts.top',
  'threads-vs-single-posts': 'audit.formats.compare',
  'long-posts': 'audit.formats.compare',
  'media-vs-text': 'audit.formats.compare',
  'links-vs-no-links': 'audit.formats.compare',
  'quote-posts': 'audit.formats.compare',
  'post-length': 'audit.formats.compare',
}

const relatedByGroup: Record<string, string[]> = {
  Performance: [
    'account-snapshot',
    'top-posts',
    'growth-signals',
    'recent-changes',
  ],
  'Content patterns': [
    'topic-winners',
    'hook-patterns',
    'voice-patterns',
    'language-repeats',
  ],
  'Format breakdown': [
    'links-vs-no-links',
    'media-vs-text',
    'threads-vs-single-posts',
    'post-length',
  ],
  'Timing and cadence': [
    'best-posting-windows',
    'day-by-day-performance',
    'cadence-check',
  ],
  'Audience response': [
    'reply-drivers',
    'repost-drivers',
    'view-to-reply-gaps',
  ],
  'Next steps': [
    'what-to-post-more',
    'what-to-stop-doing',
    'experiments-to-run',
    'agent-brief',
  ],
}

const specificSeo: Record<
  string,
  Pick<
    XReportDoc,
    'seoTitle' | 'seoDescription' | 'seoHeading' | 'primaryKeyword'
  >
> = {
  'account-snapshot': {
    seoTitle: 'Twitter Profile Analytics: Account Snapshot and Growth Signals',
    seoDescription:
      'Run a Twitter profile analytics report that summarizes public account state, recent post signals, and useful follow-up checks.',
    seoHeading: '𝕏 profile analytics for account snapshots and growth signals.',
    primaryKeyword: 'twitter profile analytics',
  },
  'top-posts': {
    seoTitle: 'Twitter Analytics Report: Find Top Posts and Patterns',
    seoDescription:
      'Find top Twitter posts, compare engagement signals, and give an agent evidence for repeatable content patterns.',
    seoHeading:
      'Twitter analytics report for top posts and repeatable patterns.',
    primaryKeyword: 'twitter analytics',
  },
  'weak-posts': {
    seoTitle: 'Twitter Audit Report: Find Weak Posts and Missed Signals',
    seoDescription:
      'Audit weak Twitter posts and show why they missed replies, reposts, reach, or useful audience response.',
    seoHeading: 'Twitter audit report for weak posts and missed signals.',
    primaryKeyword: 'twitter audit',
  },
  'growth-signals': {
    seoTitle: 'Twitter Analytics Dashboard: Growth Signals for Posts',
    seoDescription:
      'Read Twitter growth signals from posts, topics, formats, and engagement patterns without using a dashboard.',
    seoHeading: '𝕏 growth signal report for posts, topics, and formats.',
    primaryKeyword: 'twitter analytics dashboard',
  },
  'agent-brief': {
    seoTitle: 'Twitter Analytics Report Sample: Agent Brief for Content',
    seoDescription:
      'Create a Twitter analytics report sample your AI agent can use before planning posts, topics, and experiments.',
    seoHeading: 'Agent brief built from 𝕏 post history and performance data.',
    primaryKeyword: 'twitter analytics report sample',
  },
}

function titleToKeyword(title: string) {
  if (title.toLowerCase().includes('competitor'))
    return 'twitter competitor analysis'
  if (title.toLowerCase().includes('engagement'))
    return 'twitter engagement metrics'
  if (title.toLowerCase().includes('follower'))
    return 'twitter follower analytics'
  if (title.toLowerCase().includes('profile'))
    return 'twitter profile analytics'
  if (title.toLowerCase().includes('audit')) return 'twitter audit'
  return 'twitter analytics'
}

function defaultSeo(report: XReportWithGroup) {
  const keyword = titleToKeyword(report.title)
  return {
    seoTitle: `${report.title}: Twitter Analytics Report for Agents`,
    seoDescription: `${report.description} Use it as 𝕏 performance context for AI agents, CLI workflows, and API reports.`,
    seoHeading: `${report.title} report for 𝕏 performance analysis.`,
    primaryKeyword: keyword,
  }
}

function reportLead(report: XReportWithGroup) {
  return `${report.title} turns public 𝕏 post history into a focused report an agent can use before it suggests what to write, repeat, avoid, or test next.`
}

function commandIdFor(report: XReportWithGroup) {
  return commandBySlug[report.slug] ?? 'report.profile.performance'
}

function relatedFor(report: XReportWithGroup) {
  const related = relatedByGroup[report.group] ?? []
  return related.filter((slug) => slug !== report.slug).slice(0, 4)
}

function buildReportDoc(report: XReportWithGroup): XReportDoc {
  const details = groupDetails[report.group] ?? groupDetails.Performance
  const seo = specificSeo[report.slug] ?? defaultSeo(report)

  return {
    ...report,
    ...details,
    ...seo,
    commandId: commandIdFor(report),
    lead: reportLead(report),
    related: relatedFor(report),
  }
}

export const xReportDocGroups: XReportDocGroup[] = reportGroups.map(
  (group) => ({
    title: group.title,
    description: groupDescriptions[group.title] ?? group.title,
    docs: group.reports.map((report) =>
      buildReportDoc({ ...report, group: group.title }),
    ),
  }),
)

export const xReportDocs = xReportDocGroups.flatMap((group) => group.docs)

export function getXReportDoc(slug: string) {
  return xReportDocs.find((doc) => doc.slug === slug)
}

export function xReportDocPath(doc: Pick<XReportDoc, 'slug'>) {
  return `/docs/reports/${doc.slug}`
}

export function getXReportDocNavigation(slug: string) {
  const index = xReportDocs.findIndex((doc) => doc.slug === slug)
  return {
    prev: index > 0 ? xReportDocs[index - 1] : null,
    next:
      index >= 0 && index < xReportDocs.length - 1
        ? xReportDocs[index + 1]
        : null,
  }
}

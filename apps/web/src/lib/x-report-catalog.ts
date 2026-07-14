export type XReport = {
  slug: string
  title: string
  description: string
}

export type XReportGroup = {
  title: string
  reports: XReport[]
}

export const reportGroups: XReportGroup[] = [
  {
    title: 'Performance',
    reports: [
      {
        slug: 'account-snapshot',
        title: 'Account snapshot',
        description:
          'A quick read on what the account is known for, what is growing, and what needs attention.',
      },
      {
        slug: 'top-posts',
        title: 'Top posts',
        description:
          'The posts that earned the strongest response, with the patterns that made them work.',
      },
      {
        slug: 'weak-posts',
        title: 'Weak posts',
        description:
          'The posts that missed, plus the likely reasons they did not get replies, reposts, or reach.',
      },
      {
        slug: 'growth-signals',
        title: 'Growth signals',
        description:
          'The topics, formats, and post types that appear most often before stronger account growth.',
      },
      {
        slug: 'recent-changes',
        title: 'Recent changes',
        description:
          'A week-by-week view of what has changed in the account and whether performance is moving up or down.',
      },
    ],
  },
  {
    title: 'Content patterns',
    reports: [
      {
        slug: 'topic-winners',
        title: 'Topic winners',
        description:
          'The ideas and themes the audience keeps rewarding across multiple posts.',
      },
      {
        slug: 'hook-patterns',
        title: 'Hook patterns',
        description:
          'The opening lines and structures that get people to reply, repost, or keep reading.',
      },
      {
        slug: 'voice-patterns',
        title: 'Voice patterns',
        description:
          'The account traits that make strong posts sound specific, recognizable, and worth following.',
      },
      {
        slug: 'language-repeats',
        title: 'Language repeats',
        description:
          'Phrases, claims, and framing habits that show up in winners and losers.',
      },
      {
        slug: 'post-length',
        title: 'Post length',
        description:
          'The length ranges that tend to earn stronger views, replies, and reposts for the account.',
      },
    ],
  },
  {
    title: 'Format breakdown',
    reports: [
      {
        slug: 'threads-vs-single-posts',
        title: 'Threads vs single posts',
        description:
          'Whether the account gets more reach from threads or more conversation from single posts.',
      },
      {
        slug: 'long-posts',
        title: 'Long posts',
        description:
          'How longer posts perform compared with shorter ones, and when the extra space helps.',
      },
      {
        slug: 'media-vs-text',
        title: 'Media vs text',
        description:
          'Whether images and videos lift attention or pull it away from replies and discussion.',
      },
      {
        slug: 'links-vs-no-links',
        title: 'Links vs no links',
        description:
          'How posts with links compare with text-only posts for reach, replies, and reposts.',
      },
      {
        slug: 'quote-posts',
        title: 'Quote posts',
        description:
          'When quoting another post helps the account join a conversation and when it falls flat.',
      },
    ],
  },
  {
    title: 'Timing and cadence',
    reports: [
      {
        slug: 'best-posting-windows',
        title: 'Best posting windows',
        description:
          'The days and times worth testing based on posts that already performed well.',
      },
      {
        slug: 'day-by-day-performance',
        title: 'Day-by-day performance',
        description:
          'A simple view of which days tend to bring stronger responses for the account.',
      },
      {
        slug: 'cadence-check',
        title: 'Cadence check',
        description:
          'Whether the account posts often enough to learn without repeating weak ideas too often.',
      },
      {
        slug: 'repeatable-windows',
        title: 'Repeatable windows',
        description:
          'Posting windows that have worked more than once and deserve another test.',
      },
      {
        slug: 'stale-slots',
        title: 'Stale slots',
        description:
          'Times the account keeps using even though the posts there rarely perform well.',
      },
    ],
  },
  {
    title: 'Audience response',
    reports: [
      {
        slug: 'reply-drivers',
        title: 'Reply drivers',
        description:
          'The topics, hooks, and formats that make people answer instead of scrolling past.',
      },
      {
        slug: 'repost-drivers',
        title: 'Repost drivers',
        description:
          'The post traits that make followers share the account with their own audience.',
      },
      {
        slug: 'bookmark-drivers',
        title: 'Bookmark drivers',
        description:
          'The useful posts people are most likely to save, revisit, or treat as reference material.',
      },
      {
        slug: 'view-to-reply-gaps',
        title: 'View-to-reply gaps',
        description:
          'Posts that got attention but did not turn that attention into conversation.',
      },
      {
        slug: 'conversation-starters',
        title: 'Conversation starters',
        description:
          'The questions, claims, and angles that tend to start higher-quality replies.',
      },
    ],
  },
  {
    title: 'Next steps',
    reports: [
      {
        slug: 'what-to-post-more',
        title: 'What to post more often',
        description:
          'The repeatable topics and formats the account should use more often.',
      },
      {
        slug: 'what-to-stop-doing',
        title: 'What to stop doing',
        description:
          'The post habits that keep showing up in weak results and should be cut back.',
      },
      {
        slug: 'experiments-to-run',
        title: 'Experiments to run',
        description:
          'Small content tests the account can run next week without changing its whole strategy.',
      },
      {
        slug: 'agent-brief',
        title: 'Agent brief',
        description:
          'A short working brief an agent can read before it suggests the next post.',
      },
      {
        slug: 'voice-guide',
        title: 'Voice guide',
        description:
          'A practical summary of how the account sounds when its posts perform well.',
      },
      {
        slug: 'monthly-report',
        title: 'Monthly report',
        description:
          'A plain monthly summary of what worked, what missed, and what should change next.',
      },
    ],
  },
]

export const reports = reportGroups.flatMap((group) =>
  group.reports.map((report) => ({ ...report, group: group.title })),
)

export type XReportWithGroup = (typeof reports)[number]

export function getReport(slug: string): XReportWithGroup | undefined {
  return reports.find((report) => report.slug === slug)
}

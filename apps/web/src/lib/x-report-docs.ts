import { reportGroups, type XReportWithGroup } from '@/lib/x-report-catalog'
import { reportContent } from '@/lib/x-report-content'
import type { XReportDoc, XReportDocGroup } from '@/lib/x-report-doc-types'

export type {
  XReportDoc,
  XReportDocGroup,
  XReportEvidence,
  XReportExample,
  XReportMethodStep,
  XReportSpecificContent,
  XReportSurfaceGuide,
} from '@/lib/x-report-doc-types'

const groupDescriptions: Record<string, string> = {
  Performance:
    'Start here when an agent needs a broad read on an X account, its strongest posts, and the signals that need attention.',
  'Content patterns':
    'Find the topics, openings, language, and voice choices that repeat across stronger and weaker posts.',
  'Format breakdown':
    'Compare links, media, long posts, threads, quote posts, and text without hiding thin samples or outliers.',
  'Timing and cadence':
    'Choose posting windows and a useful cadence from the account history rather than generic timing advice.',
  'Audience response':
    'Separate replies, reposts, bookmarks, views, and conversation quality so each signal answers the right question.',
  'Next steps':
    'Turn the evidence into a bounded action list, experiment, agent brief, voice guide, or monthly review.',
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
    'repeatable-windows',
  ],
  'Audience response': [
    'reply-drivers',
    'repost-drivers',
    'bookmark-drivers',
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
    seoTitle: 'Twitter Profile Analytics: Account Snapshot and Signals',
    seoDescription:
      'Build a Twitter profile analytics snapshot from public account and post evidence, with sample checks, limits, and clear follow-up decisions.',
    seoHeading: 'X profile analytics for a useful account snapshot.',
    primaryKeyword: 'twitter profile analytics',
  },
  'top-posts': {
    seoTitle: 'Twitter Analytics Report: Find Top Posts and Patterns',
    seoDescription:
      'Find top Twitter posts by replies, reposts, bookmarks, and views, then separate repeatable patterns from outliers and missing data.',
    seoHeading: 'Find top X posts and the patterns worth testing again.',
    primaryKeyword: 'twitter analytics',
  },
  'weak-posts': {
    seoTitle: 'Twitter Audit: Find Weak Posts and Review the Misses',
    seoDescription:
      'Audit weak Twitter posts against fair baselines, separate low exposure from weak response, and choose what to cut, revise, or retest.',
    seoHeading: 'Find weak X posts without guessing why they missed.',
    primaryKeyword: 'twitter audit',
  },
  'growth-signals': {
    seoTitle: 'Twitter Follower Growth Analysis: Content Signal Guide',
    seoDescription:
      'Compare dated follower snapshots with the posts between them to find content signals associated with stronger Twitter audience growth.',
    seoHeading: 'Find content signals near stronger X follower growth.',
    primaryKeyword: 'twitter follower growth analysis',
  },
  'agent-brief': {
    seoTitle: 'Twitter Analytics Report Sample: Build an Agent Brief',
    seoDescription:
      'Turn public Twitter profile and post evidence into a concise agent brief with topics, voice rules, formats, limits, and next actions.',
    seoHeading: 'Build an X performance brief an agent can actually use.',
    primaryKeyword: 'twitter analytics report sample',
  },
}

function titleToKeyword(title: string) {
  if (title.toLowerCase().includes('follower'))
    return 'twitter follower analytics'
  if (title.toLowerCase().includes('reply')) return 'twitter reply analytics'
  if (title.toLowerCase().includes('repost'))
    return 'twitter engagement analytics'
  if (title.toLowerCase().includes('posting'))
    return 'best time to post on twitter'
  if (title.toLowerCase().includes('voice')) return 'twitter content analysis'
  return 'twitter analytics'
}

function defaultSeo(report: XReportWithGroup) {
  return {
    seoTitle: `${report.title}: Twitter Analytics Research Guide`,
    seoDescription: `${report.description} Learn what public evidence to collect, how to analyze it, and which limits belong in the result.`,
    seoHeading: `${report.title} for X performance analysis.`,
    primaryKeyword: titleToKeyword(report.title),
  }
}

function relatedFor(report: XReportWithGroup) {
  const related = relatedByGroup[report.group] ?? []
  return related.filter((slug) => slug !== report.slug).slice(0, 4)
}

const dateBoundedReportSlugs = new Set([
  'growth-signals',
  'recent-changes',
  'best-posting-windows',
  'day-by-day-performance',
  'cadence-check',
  'repeatable-windows',
  'stale-slots',
  'monthly-report',
])

const threadEvidenceReportSlugs = new Set([
  'top-posts',
  'weak-posts',
  'post-length',
  'threads-vs-single-posts',
  'long-posts',
  'media-vs-text',
  'links-vs-no-links',
  'reply-drivers',
  'view-to-reply-gaps',
  'conversation-starters',
  'monthly-report',
])

function buildSurfaces(
  report: XReportWithGroup,
  focus: string,
): XReportDoc['surfaces'] {
  const monitorName = `${report.slug} sample`
  const threadMonitorName = `${report.slug} authored replies`
  const needsDateBounds = dateBoundedReportSlugs.has(report.slug)
  const needsThreadEvidence = threadEvidenceReportSlugs.has(report.slug)
  const needsConversationReplies = report.slug === 'conversation-starters'
  const dateBounds = needsDateBounds
    ? ' since:<start-date> until:<end-date>'
    : ''
  const authoredQuery = `from:<handle> -filter:replies${dateBounds}`
  const authoredRepliesQuery = `from:<handle> filter:replies${dateBounds}`
  const typescriptAuthoredQuery = `'from:' + handle + ${JSON.stringify(` -filter:replies${dateBounds}`)}`
  const typescriptAuthoredRepliesQuery = `'from:' + handle + ${JSON.stringify(` filter:replies${dateBounds}`)}`
  const threadCollectionNote =
    'Keep the primary original-post sample separate from the authored-reply sample. Use `replyingToPostId` and raw `replying_to` records to identify self-replies and thread roots. Missing parents or sequence gaps make the thread classification incomplete, so label those roots instead of forcing them into a standalone comparison.'
  const conversationCollectionNote =
    'The authored-post monitor only selects candidate root posts. It does not collect their reply trees. For each selected root, run a second bounded public search for `conversation_id:<post-id>`. Treat those results as a public reply sample, not a complete conversation.'
  const dateCollectionNote =
    'Replace `<start-date>` and `<end-date>` with ISO dates before running the query. Print every period in the result. When the guide compares periods, repeat the collection with a different monitor name and the comparison dates.'
  const collectionNotes = [
    ...(needsDateBounds ? [dateCollectionNote] : []),
    ...(needsThreadEvidence ? [threadCollectionNote] : []),
    ...(needsConversationReplies ? [conversationCollectionNote] : []),
  ]
  return {
    cli: {
      summary: `There is no automated \`ilo report ${report.slug}\` command yet. The CLI can still collect a bounded public post sample in the local inbox and return the stored rows as JSON for this analysis.`,
      steps: [
        `Run \`ilo x monitors list\` first. Reuse a monitor with the exact query or choose an unused name, because monitor names are unique for the connected account. Create a new one with \`ilo x monitors add "${monitorName}" --query "${authoredQuery}"\` when needed.`,
        `Run \`ilo x inbox refresh --monitor "${monitorName}" --pages 10\`, then export the saved sample with \`ilo x inbox list --monitor "${monitorName}" --all --limit 500 --json\`. Raise or lower the page count deliberately and record any truncation.`,
        ...(needsThreadEvidence
          ? [
              `Create a separate authored-reply monitor with \`ilo x monitors add "${threadMonitorName}" --query "${authoredRepliesQuery}"\`. Refresh and export it separately so reply rows cannot crowd original posts out of the 500-row primary sample.`,
            ]
          : []),
        'The first refresh is a bounded snapshot. It does not save an older-history cursor. If it reports that older matches were available, create a fresh monitor with a different name and rerun its first refresh with a larger `--pages` value. A later refresh of the original monitor checks newer posts and does not resume the omitted old pages.',
        'Saved engagement metrics are collection-time snapshots. Later monitor refreshes only fetch newer post IDs, so they do not update metrics on rows already in the inbox. Supply dated metric snapshots separately when the guide compares posts at the same age.',
        ...collectionNotes,
        'The CLI has no standalone public profile snapshot command today. Supply separately dated profile or follower snapshots when the guide needs them, or use the TypeScript profile helper below. A monitor sample alone cannot show follower growth.',
        `${focus} Work from the returned post URLs and public metrics. Keep unavailable views or bookmarks as unknown.`,
      ],
      examples: [
        {
          label: 'Create the bounded public post sample',
          code: `ilo x monitors list\nilo x monitors add "${monitorName}" --query "${authoredQuery}"\nilo x inbox refresh --monitor "${monitorName}" --pages 10`,
        },
        {
          label: 'Return the saved rows as JSON',
          code: `ilo x inbox list --monitor "${monitorName}" --all --limit 500 --json`,
        },
        ...(needsThreadEvidence
          ? [
              {
                label: 'Collect authored replies for thread classification',
                code: `ilo x monitors add "${threadMonitorName}" --query "${authoredRepliesQuery}"
ilo x inbox refresh --monitor "${threadMonitorName}" --pages 10
ilo x inbox list --monitor "${threadMonitorName}" --all --limit 500 --json`,
              },
            ]
          : []),
        ...(needsConversationReplies
          ? [
              {
                label:
                  'Collect a bounded public reply sample for one root post',
                code: 'ilo x monitors add "conversation reply sample" --query "conversation_id:<post-id>"\nilo x inbox refresh --monitor "conversation reply sample" --pages 10\nilo x inbox list --monitor "conversation reply sample" --all --limit 500 --json',
              },
            ]
          : []),
      ],
    },
    mcp: {
      summary: `The local MCP server does not expose a finished ${report.title.toLowerCase()} report tool yet. An agent can use the current monitor and inbox tools to collect the same bounded public evidence, then follow this guide.`,
      steps: [
        `Call \`ilo_list_x_monitors\` first. Reuse the exact query or choose a unique name before calling \`ilo_create_x_monitor\` with \`${authoredQuery}\`. Then call \`ilo_refresh_x_inbox\` for that monitor with an explicit page limit.`,
        `Call \`ilo_list_x_inbox\` for the monitor and use \`ilo_get_x_inbox_item\` when a selected post needs its full stored public provider record. State the returned row count and any missing history.`,
        ...(needsThreadEvidence
          ? [
              `Create a second monitor named \`${threadMonitorName}\` with \`${authoredRepliesQuery}\`. Refresh and list that monitor separately so authored replies do not consume the primary original-post sample limit.`,
            ]
          : []),
        'A first monitor refresh is a bounded snapshot and does not retain an older-history cursor. If `truncated` is true, create a fresh monitor with a different name and run its first refresh with a larger `maxPages`. Refreshing the original monitor later checks newer posts and does not resume omitted old pages.',
        'Saved engagement metrics are collection-time snapshots. Later monitor refreshes only fetch newer post IDs, so they do not update metrics on existing inbox rows. Supply dated metric snapshots separately when the guide compares posts at the same age.',
        ...collectionNotes,
        'The local MCP server has no general public profile snapshot tool. `ilo_get_x_follower_profile` can read a profile saved during a follower import, but that record is not recurring profile history. Supply dated snapshots separately when the analysis needs follower change.',
        `${focus} Return citations and caveats before recommendations. None of these research calls publishes to X.`,
      ],
      examples: [
        {
          label: 'Call these local MCP tools in order',
          code: 'ilo_list_x_monitors\nilo_create_x_monitor\nilo_refresh_x_inbox\nilo_list_x_inbox\nilo_get_x_inbox_item',
        },
        {
          label: 'Start the monitor with explicit public search input',
          code: JSON.stringify(
            {
              name: monitorName,
              query: authoredQuery,
            },
            null,
            2,
          ),
        },
        {
          label: 'Refresh only that monitor',
          code: JSON.stringify(
            {
              monitorId: '<monitor-uuid>',
              maxPages: 10,
            },
            null,
            2,
          ),
        },
        {
          label: 'Read the bounded saved sample',
          code: JSON.stringify(
            {
              monitorId: '<monitor-uuid>',
              status: 'all',
              limit: 500,
            },
            null,
            2,
          ),
        },
        {
          label: 'Inspect one selected post and its raw record',
          code: JSON.stringify(
            {
              postId: '<x-post-id-or-url>',
            },
            null,
            2,
          ),
        },
        ...(needsThreadEvidence
          ? [
              {
                label:
                  'Create a separate authored-reply monitor for thread evidence',
                code: JSON.stringify(
                  {
                    name: threadMonitorName,
                    query: authoredRepliesQuery,
                  },
                  null,
                  2,
                ),
              },
            ]
          : []),
        ...(needsConversationReplies
          ? [
              {
                label: 'Create a second monitor for one public reply sample',
                code: JSON.stringify(
                  {
                    name: 'conversation reply sample',
                    query: 'conversation_id:<post-id>',
                  },
                  null,
                  2,
                ),
              },
            ]
          : []),
      ],
    },
    typescript: {
      summary: `The \`iloso\` package has no one-call ${report.title.toLowerCase()} function yet. Node applications can collect public profile and post rows with the exported public X helpers or use the same local monitor functions as the CLI.`,
      steps: [
        `Call \`fetchPublicXProfile(handle)\` for current profile evidence. Page through \`fetchPublicXSearch(...)\` with the query \`${authoredQuery}\` and stop at a documented date, row, or page boundary.`,
        ...(needsThreadEvidence
          ? [
              `Collect \`${authoredRepliesQuery}\` as a second bounded sample for thread classification. Keep its rows separate from the original-post sample.`,
            ]
          : []),
        'Persist the collection time, cursor state, post URLs, and missing metric fields with the rows. A public search result is a bounded sample unless ilo confirms the requested history ended. Use `fetchPublicXStatus(postId)` for a new dated metric snapshot of a selected post.',
        'The direct paging example below owns its cursor for that run. If the application uses `createXMonitor()` and `refreshXMonitor()` instead, apply the same monitor lifecycle as the CLI: names are unique, the first refresh is bounded, and a truncated first refresh does not resume old pages later.',
        ...collectionNotes,
        `${focus} Implement the calculations in your application and keep the source rows beside the result so another person or agent can inspect them.`,
      ],
      examples: [
        {
          label: 'Collect a bounded public profile and post sample',
          code: `import {
  fetchPublicXProfile,
  fetchPublicXSearch,
  fetchPublicXStatus,
  type PublicXStatus,
} from 'iloso'

const handle = 'example'
const profile = await fetchPublicXProfile(handle)
async function collectSearchSample(query: string) {
  const postsById = new Map<string, PublicXStatus>()
  const seenCursors = new Set<string>()
  let cursor: string | null = null
  let sourcePaginationEnded = false

  for (let pageNumber = 0; pageNumber < 10; pageNumber += 1) {
    if (cursor) {
      if (seenCursors.has(cursor)) throw new Error('search cursor repeated')
      seenCursors.add(cursor)
    }
    const page = await fetchPublicXSearch({ query, count: 100, cursor })
    for (const post of page.posts) {
      if (postsById.size >= 500) break
      postsById.set(post.id, post)
    }
    cursor = page.nextCursor
    if (!cursor) {
      sourcePaginationEnded = true
      break
    }
    if (postsById.size >= 500) break
  }

  return {
    posts: [...postsById.values()],
    sourcePaginationEnded,
  }
}

const originalPostSample = await collectSearchSample(
  ${typescriptAuthoredQuery},
)
${
  needsThreadEvidence
    ? `const authoredReplySample = await collectSearchSample(
  ${typescriptAuthoredRepliesQuery},
)`
    : 'const authoredReplySample = null'
}
const selectedPostSnapshot = originalPostSample.posts[0]
  ? await fetchPublicXStatus(originalPostSample.posts[0].id)
  : null

console.log({
  profile,
  originalPostSample,
  authoredReplySample,
  selectedPostSnapshot,
})`,
        },
        ...(needsConversationReplies
          ? [
              {
                label:
                  'Collect a bounded public reply sample for one root post',
                code: `const postId = '1234567890'
const publicReplySample = await collectSearchSample(
  'conversation_id:' + postId,
)

console.log(publicReplySample)`,
              },
            ]
          : []),
      ],
    },
  }
}

function buildReportDoc(report: XReportWithGroup): XReportDoc {
  const content = reportContent[report.slug]
  if (!content) {
    throw new Error(`Missing report-specific documentation for ${report.slug}.`)
  }
  const seo = specificSeo[report.slug] ?? defaultSeo(report)
  const { surfaceFocus, ...specific } = content
  const digestPrompt = `${specific.agentPrompt}

Format the result as a decision digest in Markdown. Use a specific title naming @handle and the period. Open with a two or three sentence answer. Then show a compact coverage table with sources, exact dates, collection time, candidate count, selected count, and missing data. Present three to seven ranked findings. Each finding must include why it matters, direct post links, the relevant visible metrics, a high, medium, or low confidence label, and one counter-signal or limit. Add a short note on duplicates, weak matches, or low-confidence noise that was filtered out. End with no more than three evidence-backed actions and a final section for open questions and limits. Keep observations, interpretations, and recommendations distinct. Do not invent missing values, bury caveats, or pad the report with generic social advice. Create self-contained HTML only if the user asks for an artifact.`
  return {
    ...report,
    ...specific,
    ...seo,
    agentPrompt: digestPrompt,
    availability: `ilo does not currently include an automated ${report.title.toLowerCase()} command, MCP report tool, or TypeScript report function. This page is an executable research guide for public post data from the current tools and any separately supplied profile snapshots the question needs.`,
    checks: specific.method.map((step) => step.instruction),
    surfaces: buildSurfaces(report, surfaceFocus),
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

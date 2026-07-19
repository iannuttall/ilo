import type { FxTwitterUser } from '../providers/x/fxtwitter.js'
import type { XInboxItem } from '../storage/inbox.js'
import type {
  XInboxFeedback,
  XInboxFeedbackEvidence,
} from '../storage/inbox-feedback.js'

export const X_INBOX_SIGNAL_MODEL_VERSION = 'signal-v1'

export type XInboxSignalConfidence = 'low' | 'medium' | 'high'

export type XInboxSignalFactor = {
  key: string
  label: string
  impact: number
}

export type XInboxSignal = {
  score: number
  confidence: XInboxSignalConfidence
  modelVersion: typeof X_INBOX_SIGNAL_MODEL_VERSION
  factors: XInboxSignalFactor[]
  reasons: string[]
  penalties: string[]
  duplicateOfPostId: string | null
  feedback: XInboxFeedback | null
}

export type XInboxRankedItem = XInboxItem & { signal: XInboxSignal }

type ScoredItem = {
  item: XInboxItem
  factors: XInboxSignalFactor[]
  feedback: XInboxFeedbackEvidence | null
  baseScore: number
  duplicateOfPostId: string | null
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const impact = (value: number) => Math.round(clamp(value, -20, 20))

const addFactor = (
  factors: XInboxSignalFactor[],
  key: string,
  label: string,
  value: number,
) => {
  const rounded = impact(value)
  if (rounded !== 0) factors.push({ key, label, impact: rounded })
}

const parsedDate = (value?: string) => {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

const rawAuthor = (item: XInboxItem): FxTwitterUser | null => {
  const author = item.providerData?.author
  return author && typeof author === 'object' ? author : null
}

const normalizedWords = (text: string) =>
  text
    .toLocaleLowerCase('en-US')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/@[\p{L}\p{N}_]+/gu, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1)

const similarity = (left: string[], right: string[]) => {
  if (left.length < 5 || right.length < 5) return 0
  const leftSet = new Set(left)
  const rightSet = new Set(right)
  const intersection = [...leftSet].filter((word) => rightSet.has(word)).length
  const union = new Set([...leftSet, ...rightSet]).size
  return union ? intersection / union : 0
}

const weightedEngagement = (item: XInboxItem) =>
  item.likes +
  item.reposts * 2 +
  item.quotes * 2 +
  item.replies * 1.5 +
  (item.bookmarks ?? 0) * 0.5

const engagementFactors = (item: XInboxItem, factors: XInboxSignalFactor[]) => {
  const weighted = weightedEngagement(item)
  if (item.views !== null && item.views >= 0) {
    const smoothedRate = (weighted + 2) / (item.views + 200)
    addFactor(
      factors,
      'engagement-rate',
      'Strong response for the visible views',
      clamp(Math.log2(smoothedRate / 0.01) * 4, -6, 12),
    )
    if (item.author.followers && item.views > 0) {
      const reachRatio = item.views / (item.author.followers + 100)
      if (reachRatio > 0.5) {
        addFactor(
          factors,
          'relative-reach',
          'Reached beyond the account size',
          clamp(Math.log2(reachRatio / 0.5) * 2 + 2, 2, 7),
        )
      }
    }
  } else if (item.author.followers !== null) {
    const smoothedRate = (weighted + 2) / (item.author.followers + 300)
    addFactor(
      factors,
      'follower-response',
      'Strong response for the account size',
      clamp(Math.log2(smoothedRate / 0.005) * 3, -5, 9),
    )
  } else if (weighted > 0) {
    addFactor(
      factors,
      'visible-response',
      'Has visible public response',
      clamp(Math.log2(weighted + 1), 1, 6),
    )
  }
  if (item.replies >= 3 && item.replies / Math.max(1, item.likes) >= 0.15) {
    addFactor(
      factors,
      'conversation',
      'Prompted conversation, not only likes',
      3,
    )
  }
}

const contentFactors = (item: XInboxItem, factors: XInboxSignalFactor[]) => {
  const text = item.text.trim()
  const words = normalizedWords(text)
  if (words.length >= 12) {
    addFactor(factors, 'substance', 'Contains enough detail to inspect', 3)
  } else if (words.length <= 3) {
    addFactor(factors, 'thin', 'Very little text to evaluate', -7)
  }
  if (/\b\d+(?:[.,]\d+)?%?\b/.test(text)) {
    addFactor(factors, 'specifics', 'Includes concrete numbers', 3)
  }
  if (
    /https?:\/\/(?:www\.)?(?:github\.com|arxiv\.org|doi\.org|huggingface\.co)\//i.test(
      text,
    )
  ) {
    addFactor(factors, 'source-link', 'Links to inspectable technical work', 5)
  }
  if (
    /\b(?:i|we)\s+(?:built|tested|measured|published|released|open[- ]sourced|found)\b/i.test(
      text,
    )
  ) {
    addFactor(factors, 'first-hand', 'Describes first-hand work or evidence', 5)
  }
  const promotionalPatterns = [
    /\blimited time\b/i,
    /\bbuy now\b/i,
    /\bdm me\b/i,
    /\bfollow (?:me )?for more\b/i,
    /\blike and (?:repost|retweet)\b/i,
    /\bgiveaway\b/i,
    /\buse (?:my )?code\b/i,
    /\bjoin my (?:community|course|newsletter)\b/i,
    /\bsubscribe now\b/i,
  ]
  if (promotionalPatterns.some((pattern) => pattern.test(text))) {
    addFactor(
      factors,
      'promotion',
      'Uses promotional or engagement-bait wording',
      -12,
    )
  }
  const urlCount = text.match(/https?:\/\/\S+/g)?.length ?? 0
  if (urlCount > 0 && words.length <= 4) {
    addFactor(factors, 'link-only', 'Mostly an unexplained link', -8)
  }
}

const authorFactors = (
  item: XInboxItem,
  factors: XInboxSignalFactor[],
  now: number,
) => {
  if (item.author.bio.trim()) {
    addFactor(factors, 'profile', 'Author has a descriptive profile', 2)
  } else {
    addFactor(factors, 'empty-profile', 'Author profile has no public bio', -2)
  }
  if (item.relationship.iFollow === true) {
    addFactor(factors, 'i-follow', 'You already follow this author', 7)
  }
  if (item.relationship.followsMe === true) {
    addFactor(factors, 'follows-me', 'This author follows you', 3)
  }
  if (item.author.verified) {
    addFactor(factors, 'verified', 'Public profile is verified', 1)
  }
  const author = rawAuthor(item)
  const joinedAt = parsedDate(author?.joined)
  if (joinedAt !== null) {
    const ageDays = Math.max(0, (now - joinedAt) / 86_400_000)
    if (ageDays < 30) {
      addFactor(factors, 'new-account', 'Account is less than 30 days old', -5)
    } else if (ageDays >= 365) {
      addFactor(
        factors,
        'account-history',
        'Account has at least one year of history',
        2,
      )
    }
    if (author?.statuses && ageDays >= 1 && author.statuses / ageDays > 100) {
      addFactor(
        factors,
        'posting-volume',
        'Unusually high lifetime posting rate',
        -4,
      )
    }
  }
  if (
    item.author.followers !== null &&
    item.author.following !== null &&
    item.author.following >= 500 &&
    item.author.following / Math.max(1, item.author.followers) > 10
  ) {
    addFactor(
      factors,
      'follow-ratio',
      'Follows far more accounts than follow it',
      -5,
    )
  }
}

const freshnessFactors = (
  item: XInboxItem,
  factors: XInboxSignalFactor[],
  now: number,
) => {
  const age = Math.max(0, now - item.createdAt)
  if (age <= 6 * 3_600_000) {
    addFactor(factors, 'fresh', 'Published in the last six hours', 6)
  } else if (age <= 24 * 3_600_000) {
    addFactor(factors, 'recent', 'Published in the last day', 4)
  } else if (age <= 3 * 86_400_000) {
    addFactor(factors, 'recent', 'Published in the last three days', 2)
  } else if (age > 30 * 86_400_000) {
    addFactor(factors, 'stale', 'Older than 30 days', -3)
  }
}

const confidenceFor = (
  item: XInboxItem,
  feedback: XInboxFeedbackEvidence | null,
): XInboxSignalConfidence => {
  if (feedback) return 'high'
  const evidence = [
    Boolean(item.text.trim()),
    item.language !== null,
    item.views !== null,
    item.author.followers !== null,
    parsedDate(rawAuthor(item)?.joined) !== null,
  ].filter(Boolean).length
  if (evidence >= 4) return 'high'
  if (evidence >= 2) return 'medium'
  return 'low'
}

const feedbackFactor = (
  factors: XInboxSignalFactor[],
  feedback: XInboxFeedbackEvidence | null,
) => {
  if (!feedback) return
  addFactor(
    factors,
    'direct-feedback',
    feedback.value === 'useful'
      ? 'You marked this post useful'
      : 'You marked this post not useful',
    feedback.value === 'useful' ? 20 : -20,
  )
}

const sourceTasteFactor = (
  item: XInboxItem,
  factors: XInboxSignalFactor[],
  feedback: XInboxFeedbackEvidence[],
  direct: XInboxFeedbackEvidence | null,
) => {
  const sourceFeedback = feedback.filter(
    (entry) =>
      entry.authorId === item.author.id && entry.postId !== direct?.postId,
  )
  if (!sourceFeedback.length) return
  const useful = sourceFeedback.filter(
    (entry) => entry.value === 'useful',
  ).length
  const notUseful = sourceFeedback.length - useful
  const taste = ((useful - notUseful) / (sourceFeedback.length + 4)) * 16
  addFactor(
    factors,
    'source-taste',
    taste >= 0
      ? 'This author has been useful before'
      : 'This author has been dismissed before',
    clamp(taste, -10, 10),
  )
}

const duplicateFactors = (scored: ScoredItem[]) => {
  const strongestFirst = [...scored].sort(
    (left, right) =>
      right.baseScore - left.baseScore ||
      right.item.createdAt - left.item.createdAt ||
      right.item.postId.localeCompare(left.item.postId),
  )
  const canonical: Array<{ postId: string; words: string[] }> = []
  for (const candidate of strongestFirst) {
    const words = normalizedWords(candidate.item.text)
    const match = canonical.find(
      (entry) => similarity(words, entry.words) >= 0.82,
    )
    if (match) {
      candidate.duplicateOfPostId = match.postId
      addFactor(
        candidate.factors,
        'duplicate',
        `Near-duplicate of post ${match.postId}`,
        -18,
      )
      continue
    }
    canonical.push({ postId: candidate.item.postId, words })
  }
}

export const rankXInbox = (input: {
  items: XInboxItem[]
  feedback?: XInboxFeedbackEvidence[]
  now?: number
}): XInboxRankedItem[] => {
  const feedback = input.feedback ?? []
  const feedbackByPost = new Map(feedback.map((entry) => [entry.postId, entry]))
  const now = input.now ?? Date.now()
  const scored: ScoredItem[] = input.items.map((item) => {
    const factors: XInboxSignalFactor[] = []
    const direct = feedbackByPost.get(item.postId) ?? null
    contentFactors(item, factors)
    engagementFactors(item, factors)
    authorFactors(item, factors, now)
    freshnessFactors(item, factors, now)
    feedbackFactor(factors, direct)
    sourceTasteFactor(item, factors, feedback, direct)
    return {
      item,
      factors,
      feedback: direct,
      baseScore:
        50 + factors.reduce((total, factor) => total + factor.impact, 0),
      duplicateOfPostId: null,
    }
  })
  duplicateFactors(scored)
  return scored
    .map(({ item, factors, feedback: direct, duplicateOfPostId }) => {
      const orderedFactors = [...factors].sort(
        (left, right) =>
          Math.abs(right.impact) - Math.abs(left.impact) ||
          left.key.localeCompare(right.key),
      )
      const score = Math.round(
        clamp(
          50 +
            orderedFactors.reduce((total, factor) => total + factor.impact, 0),
          0,
          100,
        ),
      )
      const signal: XInboxSignal = {
        score,
        confidence: confidenceFor(item, direct),
        modelVersion: X_INBOX_SIGNAL_MODEL_VERSION,
        factors: orderedFactors,
        reasons: orderedFactors
          .filter((factor) => factor.impact > 0)
          .slice(0, 3)
          .map((factor) => factor.label),
        penalties: orderedFactors
          .filter((factor) => factor.impact < 0)
          .slice(0, 3)
          .map((factor) => factor.label),
        duplicateOfPostId,
        feedback: direct
          ? {
              accountHandle: direct.accountHandle,
              postId: direct.postId,
              value: direct.value,
              reason: direct.reason,
              note: direct.note,
              createdAt: direct.createdAt,
              updatedAt: direct.updatedAt,
            }
          : null,
      }
      return {
        ...item,
        signal,
      }
    })
    .sort(
      (left, right) =>
        right.signal.score - left.signal.score ||
        right.createdAt - left.createdAt ||
        right.postId.localeCompare(left.postId),
    )
}

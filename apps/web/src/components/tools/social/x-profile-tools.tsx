'use client'

import {
  AtSign,
  BadgeCheck,
  Calendar,
  Check,
  Copy,
  Download,
  Fingerprint,
  Lock,
  Search,
} from 'lucide-react'
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ErrorText,
  ExampleButtons,
  FormPanel,
  fetchJson,
  formatCompactNumber,
  KeyValue,
  ProfileSummary,
  SubmitButton,
  ToolCard,
  ToolLink,
  ToolPanelIntro,
  ToolResultPortal,
  upgradeXAvatarUrl,
  useAsyncTool,
  type XProfile,
} from './shared'

const USERNAME_REGEX = /^[A-Za-z0-9_]{1,15}$/
const URL_USERNAME_REGEX = /(?:x\.com|twitter\.com)\/(@?[A-Za-z0-9_]{1,15})/i
const ID_EXAMPLES = ['12', '783214', '2244994945']
const PROFILE_ANALYTICS_EXAMPLES = [
  'elonmusk',
  'sama',
  'naval',
  'paulg',
  'mkbhd',
]
const ID_PATTERN = /^\d{1,25}$/
const TWITTER_EPOCH_MS = 1_288_834_974_657
const TWITTER_EPOCH_NUM = BigInt(TWITTER_EPOCH_MS)
const TIMESTAMP_BITS = BigInt(22)
const WORKER_BITS = BigInt(17)
const PROCESS_BITS = BigInt(12)
const SEQUENCE_MASK = BigInt(0xfff)
const PROCESS_MASK = BigInt(0x1f)
const WORKER_MASK = BigInt(0x1f)

type SnowflakeInfo = {
  id: string
  created_at: string | null
  worker_id: string | null
  process_id: string | null
  sequence: string | null
  is_snowflake: boolean
}

const extractUsername = (input: string) => {
  const trimmed = input.trim()
  if (!trimmed) return ''
  const urlMatch = trimmed.match(URL_USERNAME_REGEX)
  if (urlMatch) return urlMatch[1].replace(/^@+/, '')
  return trimmed.replace(/^@+/, '')
}

const cleanId = (input: string) => input.trim().replace(/[^\d]/g, '')

const decodeSnowflake = (input: string): SnowflakeInfo => {
  const id = cleanId(input)
  const numericId = BigInt(id)
  const timestamp = (numericId >> TIMESTAMP_BITS) + TWITTER_EPOCH_NUM
  const isSnowflake =
    timestamp >= BigInt(Date.UTC(2010, 10, 4)) &&
    timestamp <= BigInt(Date.now() + 86_400_000)

  if (!isSnowflake) {
    return {
      id,
      created_at: null,
      worker_id: null,
      process_id: null,
      sequence: null,
      is_snowflake: false,
    }
  }

  return {
    id,
    created_at: new Date(Number(timestamp)).toISOString(),
    worker_id: ((numericId >> WORKER_BITS) & WORKER_MASK).toString(),
    process_id: ((numericId >> PROCESS_BITS) & PROCESS_MASK).toString(),
    sequence: (numericId & SEQUENCE_MASK).toString(),
    is_snowflake: true,
  }
}

const imageFilename = (handle: string, kind: string, url: string) => {
  try {
    const extension = new URL(url).pathname.split('.').pop() || 'jpg'
    return `${handle}-${kind}.${extension.split('?')[0]}`
  } catch {
    return `${handle}-${kind}.jpg`
  }
}

const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'No data'
  return `${(value * 100).toFixed(value < 0.01 ? 2 : 1)}%`
}

const formatMonthYear = (value: string | null | undefined) => {
  if (!value) return 'No data'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No data'
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

const formatFullDate = (value: string | null | undefined) => {
  if (!value) return 'No data'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No data'
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function HandleLookup({
  placeholder,
  button,
  children,
  introTitle,
  intro,
  examples = ['jack', 'paulg', 'elonmusk', 'sama', 'naval'],
}: {
  placeholder: string
  button: string
  children: (profile: XProfile) => ReactNode
  introTitle: string
  intro: string
  examples?: string[]
}) {
  const [handle, setHandle] = useState('')
  const tool = useAsyncTool<{ profile: XProfile }>()

  const lookup = useCallback(
    async (
      rawInput: string,
      { updateUrl = true }: { updateUrl?: boolean } = {},
    ) => {
      const cleaned = extractUsername(rawInput)
      if (!cleaned) throw new Error('Enter a username.')
      if (!USERNAME_REGEX.test(cleaned)) {
        throw new Error(
          'Usernames can only contain letters, numbers, and underscores.',
        )
      }

      const payload = await fetchJson<{ profile: XProfile }>(
        `/api/tools/x/profile/${encodeURIComponent(cleaned)}`,
      )
      setHandle(payload.profile.screen_name)
      if (updateUrl && typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.set('u', payload.profile.screen_name)
        window.history.replaceState(null, '', url.toString())
      }
      return payload
    },
    [],
  )

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void tool.run(() => lookup(handle))
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const initial =
      new URLSearchParams(window.location.search).get('u') ??
      new URLSearchParams(window.location.search).get('username')
    if (initial) {
      const cleaned = extractUsername(initial)
      if (cleaned) {
        setHandle(cleaned)
        void lookup(cleaned, { updateUrl: false })
      }
    }
  }, [lookup])

  return (
    <div className="space-y-6">
      <FormPanel>
        <ToolPanelIntro title={introTitle}>{intro}</ToolPanelIntro>
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            placeholder={placeholder}
            aria-label="X username"
            required
            className="h-11 sm:flex-1"
          />
          <SubmitButton isLoading={tool.isLoading}>{button}</SubmitButton>
        </form>
        <ExampleButtons
          examples={examples}
          disabled={tool.isLoading}
          onSelect={(example) => {
            setHandle(example)
            void tool.run(() => lookup(example))
          }}
        />
        <div className="mt-3">
          <ErrorText error={tool.error} />
        </div>
      </FormPanel>
      {tool.result ? (
        <ToolResultPortal>{children(tool.result.profile)}</ToolResultPortal>
      ) : null}
    </div>
  )
}

export function TwitterIdTool() {
  const [copied, setCopied] = useState(false)

  const copyId = async (id: string) => {
    await navigator.clipboard.writeText(id)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <HandleLookup
      placeholder="@username"
      button="Find ID"
      introTitle="Find the permanent ID behind a handle"
      intro="Paste a public 𝕏 username or profile URL. The result gives you the numeric account ID that stays stable even if the handle changes later."
    >
      {(profile) => (
        <dl>
          <KeyValue
            label="Twitter ID"
            value={
              <span className="flex flex-wrap items-center gap-3">
                <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                  {profile.id}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void copyId(profile.id)}
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copied ? 'Copied' : 'Copy ID'}
                </Button>
              </span>
            }
          />
          <KeyValue label="Username" value={`@${profile.screen_name}`} />
          <KeyValue label="Name" value={profile.name} />
        </dl>
      )}
    </HandleLookup>
  )
}

export function TwitterIdToUsernameTool() {
  const [id, setId] = useState('')
  const [profile, setProfile] = useState<XProfile | null>(null)
  const [snowflake, setSnowflake] = useState<SnowflakeInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const lookup = useCallback(
    async (
      rawId: string,
      { updateUrl = true }: { updateUrl?: boolean } = {},
    ) => {
      const cleaned = cleanId(rawId)
      if (!cleaned) {
        setProfile(null)
        setSnowflake(null)
        setError('Enter a Twitter user ID.')
        return
      }
      if (!ID_PATTERN.test(cleaned)) {
        setProfile(null)
        setSnowflake(null)
        setError('Twitter user IDs are numbers only.')
        return
      }

      setError(null)
      setProfile(null)
      setCopied(false)
      setSnowflake(decodeSnowflake(cleaned))
      setIsLoading(true)

      try {
        const payload = await fetchJson<{ profile: XProfile }>(
          `/api/tools/x/profile-id/${encodeURIComponent(cleaned)}`,
        )
        setProfile(payload.profile)
        setId(payload.profile.id)
        if (updateUrl && typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.set('id', payload.profile.id)
          window.history.replaceState(null, '', url.toString())
        }
      } catch (lookupError) {
        setError(
          lookupError instanceof Error
            ? lookupError.message
            : 'No public 𝕏 account matched that ID.',
        )
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void lookup(id)
  }

  const copyUsername = async () => {
    if (!profile) return
    await navigator.clipboard.writeText(`@${profile.screen_name}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const initial = new URLSearchParams(window.location.search).get('id')
    if (initial) {
      setId(initial)
      void lookup(initial, { updateUrl: false })
    }
  }, [lookup])

  return (
    <div className="space-y-8">
      <FormPanel>
        <ToolPanelIntro title="Turn a saved ID back into a profile">
          Paste a Twitter user ID from an export, API row, or old report. The
          tool resolves the current public handle and shows what the ID reveals.
        </ToolPanelIntro>
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={id}
            onChange={(event) => setId(event.target.value)}
            placeholder="44196397"
            aria-label="Twitter user ID"
            required
            className="h-11 sm:flex-1"
          />
          <SubmitButton isLoading={isLoading}>Find username</SubmitButton>
        </form>
        <ExampleButtons
          examples={ID_EXAMPLES}
          disabled={isLoading}
          format={(example) => example}
          onSelect={(example) => {
            setId(example)
            void lookup(example)
          }}
        />
        <div className="mt-3">
          <ErrorText error={error} />
        </div>
      </FormPanel>
      {profile || snowflake ? (
        <ToolResultPortal>
          <div className="space-y-6">
            {profile ? (
              <ProfileFromIdResult
                profile={profile}
                copied={copied}
                onCopyUsername={() => void copyUsername()}
              />
            ) : null}
            {snowflake ? <SnowflakeResult snowflake={snowflake} /> : null}
          </div>
        </ToolResultPortal>
      ) : null}
    </div>
  )
}

function ProfileFromIdResult({
  profile,
  copied,
  onCopyUsername,
}: {
  profile: XProfile
  copied: boolean
  onCopyUsername: () => void
}) {
  const avatar = upgradeXAvatarUrl(profile.avatar_url)
  const profileUrl =
    profile.profile_url || `https://x.com/${profile.screen_name}`

  return (
    <ToolCard className="overflow-hidden p-0">
      <div className="h-28 w-full overflow-hidden bg-muted sm:h-36">
        {profile.banner_url ? (
          <img
            src={profile.banner_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="px-6 pb-8 sm:px-8">
        <div className="-mt-10 flex items-end justify-between gap-4">
          <div className="rounded-full border-4 border-card bg-muted">
            {avatar ? (
              <img
                src={avatar}
                alt=""
                className="size-20 rounded-full object-cover sm:size-24"
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-full text-muted-foreground sm:size-24">
                <AtSign className="size-7" />
              </div>
            )}
          </div>
          <ToolLink href={profileUrl}>Open on 𝕏</ToolLink>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl/8 font-medium tracking-normal">
                {profile.name}
              </h2>
              {profile.verified ? (
                <BadgeCheck
                  className="size-5 text-blue-500"
                  aria-label="Verified"
                />
              ) : null}
              {profile.protected ? (
                <Lock
                  className="size-5 text-muted-foreground"
                  aria-label="Protected"
                />
              ) : null}
            </div>
            <p className="mt-1 text-muted-foreground">@{profile.screen_name}</p>
          </div>
          <Button type="button" variant="secondary" onClick={onCopyUsername}>
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied ? 'Copied' : 'Copy handle'}
          </Button>
        </div>

        {profile.description ? (
          <p className="mt-4 max-w-2xl text-sm/6 text-foreground-muted">
            {profile.description}
          </p>
        ) : null}

        <dl className="mt-6 grid divide-y divide-border border-y border-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <ProfileMetric label="User ID" value={profile.id} />
          <ProfileMetric
            label="Followers"
            value={formatCompactNumber(profile.followers)}
          />
          <ProfileMetric
            label="Posts"
            value={formatCompactNumber(profile.tweets)}
          />
          <ProfileMetric
            label="Joined"
            value={formatMonthYear(profile.joined)}
          />
        </dl>
      </div>
    </ToolCard>
  )
}

function SnowflakeResult({ snowflake }: { snowflake: SnowflakeInfo }) {
  return (
    <ToolCard>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {snowflake.is_snowflake ? (
            <Calendar className="size-5" />
          ) : (
            <Fingerprint className="size-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl/7 font-medium tracking-normal">
            {snowflake.is_snowflake
              ? 'ID creation details'
              : 'Older account ID'}
          </h2>
          {snowflake.is_snowflake ? (
            <dl className="mt-3">
              <KeyValue
                label="Created from ID"
                value={formatFullDate(snowflake.created_at)}
              />
              <KeyValue label="Worker ID" value={snowflake.worker_id} />
              <KeyValue label="Process ID" value={snowflake.process_id} />
              <KeyValue label="Sequence" value={snowflake.sequence} />
            </dl>
          ) : (
            <p className="mt-2 text-sm/6 text-muted-foreground">
              This ID is from before Twitter switched to snowflake IDs, so it
              does not carry a reliable creation timestamp.
            </p>
          )}
        </div>
      </div>
    </ToolCard>
  )
}

export function TwitterProfilePictureDownloaderTool() {
  return (
    <HandleLookup
      placeholder="@username or x.com/username"
      button="Get images"
      introTitle="Grab the largest public profile images"
      intro="Paste a handle or profile URL. The tool finds the current avatar and banner images, upgrades the avatar size where possible, and gives you direct download links."
      examples={['x', 'jack', 'sama']}
    >
      {(profile) => (
        <div className="space-y-6">
          <ProfileSummary profile={profile} />
          <div className="grid gap-6 sm:grid-cols-2">
            {profile.avatar_url ? (
              <ProfileImageResult
                handle={profile.screen_name}
                kind="avatar"
                label="Full-size avatar"
                url={
                  upgradeXAvatarUrl(profile.avatar_url) ?? profile.avatar_url
                }
                imageClassName="aspect-square"
              />
            ) : null}
            {profile.banner_url ? (
              <ProfileImageResult
                handle={profile.screen_name}
                kind="banner"
                label="Profile banner"
                url={profile.banner_url}
                imageClassName="aspect-[3/1]"
              />
            ) : null}
          </div>
        </div>
      )}
    </HandleLookup>
  )
}

function ProfileImageResult({
  handle,
  kind,
  label,
  url,
  imageClassName,
}: {
  handle: string
  kind: string
  label: string
  url: string
  imageClassName: string
}) {
  const [copied, setCopied] = useState(false)

  const copyUrl = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-3">
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt=""
          className={`${imageClassName} w-full rounded-lg object-cover`}
        />
      </a>
      <div className="font-medium">{label}</div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary" size="sm">
          <a href={url} target="_blank" rel="noopener noreferrer">
            Open
          </a>
        </Button>
        <Button asChild size="sm">
          <a href={url} download={imageFilename(handle, kind, url)}>
            <Download className="size-4" />
            Download
          </a>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void copyUrl()}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Copied' : 'Copy URL'}
        </Button>
      </div>
    </div>
  )
}

export function TwitterProfileAnalyticsTool() {
  const [handle, setHandle] = useState('')
  const [result, setResult] = useState<XProfileAnalyticsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const lookup = useCallback(
    async (
      rawInput: string,
      { updateUrl = true }: { updateUrl?: boolean } = {},
    ) => {
      const cleaned = extractUsername(rawInput)
      if (!cleaned) {
        setResult(null)
        setError('Enter a username.')
        return
      }
      if (!USERNAME_REGEX.test(cleaned)) {
        setResult(null)
        setError(
          'Usernames can only contain letters, numbers, and underscores.',
        )
        return
      }

      setError(null)
      setResult(null)
      setIsLoading(true)

      try {
        const payload = await fetchJson<XProfileAnalyticsResponse>(
          '/api/tools/x/profile-analytics',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ handle: cleaned }),
          },
        )

        setResult(payload)
        setHandle(payload.lookup.profile.screen_name)
        if (updateUrl && typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.set('u', payload.lookup.profile.screen_name)
          window.history.replaceState(null, '', url.toString())
        }
      } catch (lookupError) {
        setError(
          lookupError instanceof Error
            ? lookupError.message
            : 'Could not check that profile.',
        )
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void lookup(handle)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const initial = params.get('u') ?? params.get('username')
    if (initial) {
      const cleaned = extractUsername(initial)
      if (cleaned) {
        setHandle(cleaned)
        void lookup(cleaned, { updateUrl: false })
      }
    }
  }, [lookup])

  return (
    <div className="space-y-8">
      <FormPanel>
        <ToolPanelIntro title="Check the public profile before you judge it">
          Paste a handle or profile URL. You get the account basics, recent
          activity, view totals, and engagement rates in one focused profile
          check.
        </ToolPanelIntro>
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            placeholder="@username or x.com/username"
            aria-label="X username"
            required
            className="h-11 sm:flex-1"
          />
          <Button type="submit" size="lg" disabled={isLoading}>
            <Search className="size-4" />
            {isLoading ? 'Checking...' : 'Check stats'}
          </Button>
        </form>
        <ExampleButtons
          examples={PROFILE_ANALYTICS_EXAMPLES}
          disabled={isLoading}
          onSelect={(example) => {
            setHandle(example)
            void lookup(example)
          }}
        />
        <div className="mt-3">
          <ErrorText error={error} />
        </div>
      </FormPanel>
      {result ? (
        <ToolResultPortal>
          <ProfileAnalyticsResult lookup={result.lookup} />
        </ToolResultPortal>
      ) : null}
    </div>
  )
}

type XProfileAnalyticsResponse = {
  lookup: {
    profile: XProfile
    recent: {
      posts: number
      views: number
      engagements: number
      bookmarks: number
      engagement_rate: number | null
      bookmark_rate: number | null
      avg_views_per_post: number | null
    }
  }
}

function ProfileAnalyticsResult({
  lookup,
}: {
  lookup: XProfileAnalyticsResponse['lookup']
}) {
  const { profile, recent } = lookup
  const avatar = upgradeXAvatarUrl(profile.avatar_url)
  const profileUrl =
    profile.profile_url || `https://x.com/${profile.screen_name}`
  const websiteLabel =
    profile.website_display || profile.website?.replace(/^https?:\/\//, '')

  return (
    <ToolCard className="overflow-hidden p-0">
      <div className="aspect-[3/1] w-full overflow-hidden bg-muted">
        {profile.banner_url ? (
          <img
            src={profile.banner_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="px-6 pb-8 sm:px-8 sm:pb-10">
        <div className="-mt-12 flex items-end justify-between gap-4 sm:-mt-14">
          <div className="rounded-full border-4 border-card bg-muted">
            {avatar ? (
              <img
                src={avatar}
                alt=""
                className="size-24 rounded-full object-cover sm:size-28"
              />
            ) : (
              <div className="size-24 rounded-full sm:size-28" />
            )}
          </div>
          <ToolLink href={profileUrl}>Open on 𝕏</ToolLink>
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl/8 font-medium tracking-normal">
              {profile.name}
            </h2>
            {profile.verified ? (
              <BadgeCheck
                className="size-5 text-blue-500"
                aria-label="Verified"
              />
            ) : null}
            {profile.protected ? (
              <Lock
                className="size-5 text-muted-foreground"
                aria-label="Protected"
              />
            ) : null}
          </div>
          <p className="mt-1 text-muted-foreground">@{profile.screen_name}</p>
        </div>

        {profile.description ? (
          <p className="mt-4 max-w-2xl text-sm/6 text-foreground-muted">
            {profile.description}
          </p>
        ) : null}

        {profile.website && websiteLabel ? (
          <a
            href={profile.website}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-medium underline decoration-border underline-offset-4 hover:text-foreground-muted"
          >
            {websiteLabel}
          </a>
        ) : null}

        <dl className="mt-6 grid divide-y divide-border border-y border-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <ProfileMetric
            label="Followers"
            value={formatCompactNumber(profile.followers)}
          />
          <ProfileMetric
            label="Following"
            value={formatCompactNumber(profile.following)}
          />
          <ProfileMetric
            label="Posts"
            value={formatCompactNumber(profile.tweets)}
          />
          <ProfileMetric
            label="Joined"
            value={formatMonthYear(profile.joined)}
          />
        </dl>

        <div className="mt-8">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-sm font-medium">Recent activity</p>
            <p className="text-xs text-muted-foreground">
              Based on the last {formatCompactNumber(recent.posts)}{' '}
              {recent.posts === 1 ? 'post' : 'posts'}
            </p>
          </div>
          <dl className="grid divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <ProfileMetric
              label="Recent views"
              value={formatCompactNumber(recent.views)}
            />
            <ProfileMetric
              label="Engagement rate"
              value={formatPercent(recent.engagement_rate)}
            />
            <ProfileMetric
              label="Avg views per post"
              value={formatCompactNumber(recent.avg_views_per_post)}
            />
          </dl>
        </div>
      </div>
    </ToolCard>
  )
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4 first:pl-0 last:pr-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-2xl/8 font-medium tracking-normal">{value}</dd>
    </div>
  )
}

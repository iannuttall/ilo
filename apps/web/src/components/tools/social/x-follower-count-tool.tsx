'use client'

import {
  ArrowDown,
  ArrowUp,
  AtSign,
  BadgeCheck,
  Lock,
  Pause,
  Play,
  RefreshCw,
} from 'lucide-react'
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  formatNumber,
  SubmitButton,
  ToolCard,
  ToolLink,
  ToolPanelIntro,
  ToolResultPortal,
  upgradeXAvatarUrl,
  type XProfile,
} from './shared'

const USERNAME_REGEX = /^[A-Za-z0-9_]{1,15}$/
const URL_USERNAME_REGEX = /(?:x\.com|twitter\.com)\/(@?[A-Za-z0-9_]{1,15})/i
const FOLLOWER_EXAMPLES = ['elonmusk', 'jack', 'naval', 'paulg', 'sama']
const REFRESH_INTERVAL_MS = 30_000
const MANUAL_COOLDOWN_MS = 3_000
const TICK_INTERVAL_MS = 1_000

const extractUsername = (input: string) => {
  const trimmed = input.trim()
  if (!trimmed) return ''
  const urlMatch = trimmed.match(URL_USERNAME_REGEX)
  if (urlMatch) return urlMatch[1].replace(/^@+/, '')
  return trimmed.replace(/^@+/, '')
}

export function TwitterFollowerCountTool() {
  const [username, setUsername] = useState('')
  const [handle, setHandle] = useState<string | null>(null)
  const [profile, setProfile] = useState<XProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null)
  const [baselineFollowers, setBaselineFollowers] = useState<number | null>(
    null,
  )
  const [now, setNow] = useState(() => Date.now())
  const handleRef = useRef<string | null>(null)
  handleRef.current = handle

  const lookup = useCallback(
    async (
      rawInput: string,
      {
        silent = false,
        updateUrl = true,
      }: { silent?: boolean; updateUrl?: boolean } = {},
    ) => {
      const cleaned = extractUsername(rawInput)
      if (!cleaned) {
        setProfile(null)
        setError('Enter a username.')
        return
      }
      if (!USERNAME_REGEX.test(cleaned)) {
        setProfile(null)
        setError(
          'Usernames can only contain letters, numbers, and underscores.',
        )
        return
      }

      setError(null)
      if (silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
        setProfile(null)
      }

      try {
        const payload = await fetchJson<{ profile: XProfile }>(
          `/api/tools/x/profile/${encodeURIComponent(cleaned)}`,
        )
        if (handleRef.current && handleRef.current !== cleaned && silent) {
          return
        }

        setProfile(payload.profile)
        setHandle(payload.profile.screen_name)
        setUsername(payload.profile.screen_name)
        setLastRefreshedAt(Date.now())

        if (!silent) {
          setBaselineFollowers(payload.profile.followers ?? null)
        }

        if (updateUrl && typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.set('u', payload.profile.screen_name)
          window.history.replaceState(null, '', url.toString())
        }
      } catch (lookupError) {
        if (!silent) {
          setError(
            lookupError instanceof Error
              ? lookupError.message
              : 'Could not look up that handle.',
          )
        }
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [],
  )

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void lookup(username)
  }

  const manualCooldownRemaining = lastRefreshedAt
    ? Math.max(
        0,
        Math.ceil((lastRefreshedAt + MANUAL_COOLDOWN_MS - now) / 1000),
      )
    : 0
  const isManualBlocked = isRefreshing || manualCooldownRemaining > 0

  const manualRefresh = () => {
    if (!handle || isManualBlocked) return
    void lookup(handle, { silent: true, updateUrl: false })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const initial = params.get('u') ?? params.get('username')
    if (initial) {
      const cleaned = extractUsername(initial)
      if (cleaned) {
        setUsername(cleaned)
        void lookup(cleaned, { updateUrl: false })
      }
    }
  }, [lookup])

  useEffect(() => {
    if (!handle || !autoRefresh) return
    const interval = window.setInterval(() => {
      void lookup(handle, { silent: true, updateUrl: false })
    }, REFRESH_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [handle, autoRefresh, lookup])

  useEffect(() => {
    if (!profile) return
    const interval = window.setInterval(
      () => setNow(Date.now()),
      TICK_INTERVAL_MS,
    )
    return () => window.clearInterval(interval)
  }, [profile])

  const delta = useMemo(() => {
    if (!profile || profile.followers === null || baselineFollowers === null) {
      return null
    }
    return profile.followers - baselineFollowers
  }, [profile, baselineFollowers])

  const secondsSinceRefresh = lastRefreshedAt
    ? Math.max(0, Math.round((now - lastRefreshedAt) / 1000))
    : null
  const secondsUntilNext = lastRefreshedAt
    ? Math.max(
        0,
        Math.round((lastRefreshedAt + REFRESH_INTERVAL_MS - now) / 1000),
      )
    : null

  return (
    <div className="space-y-8">
      <FormPanel>
        <ToolPanelIntro title="Watch a public account while it moves">
          Paste a handle or profile URL. The counter updates every 30 seconds,
          keeps the current count visible, and shows the movement since you
          opened the page.
        </ToolPanelIntro>
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="@username or x.com/username"
            aria-label="X username"
            required
            className="h-11 sm:flex-1"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <SubmitButton isLoading={isLoading}>Watch</SubmitButton>
        </form>
        <ExampleButtons
          examples={FOLLOWER_EXAMPLES}
          disabled={isLoading}
          onSelect={(example) => {
            setUsername(example)
            void lookup(example)
          }}
        />
        <div className="mt-3">
          <ErrorText error={error} />
        </div>
      </FormPanel>
      {profile ? (
        <ToolResultPortal>
          <FollowerResultCard
            profile={profile}
            delta={delta}
            secondsSinceRefresh={secondsSinceRefresh}
            secondsUntilNext={secondsUntilNext}
            autoRefresh={autoRefresh}
            isRefreshing={isRefreshing}
            manualCooldownRemaining={manualCooldownRemaining}
            isManualBlocked={isManualBlocked}
            onToggleAutoRefresh={() => setAutoRefresh((value) => !value)}
            onManualRefresh={manualRefresh}
          />
        </ToolResultPortal>
      ) : null}
    </div>
  )
}

function FollowerResultCard({
  profile,
  delta,
  secondsSinceRefresh,
  secondsUntilNext,
  autoRefresh,
  isRefreshing,
  manualCooldownRemaining,
  isManualBlocked,
  onToggleAutoRefresh,
  onManualRefresh,
}: {
  profile: XProfile
  delta: number | null
  secondsSinceRefresh: number | null
  secondsUntilNext: number | null
  autoRefresh: boolean
  isRefreshing: boolean
  manualCooldownRemaining: number
  isManualBlocked: boolean
  onToggleAutoRefresh: () => void
  onManualRefresh: () => void
}) {
  const avatar = upgradeXAvatarUrl(profile.avatar_url)
  const profileUrl =
    profile.profile_url || `https://x.com/${profile.screen_name}`

  return (
    <ToolCard className="overflow-hidden p-0">
      <div className="h-32 w-full overflow-hidden bg-muted sm:h-40">
        {profile.banner_url ? (
          <img
            src={profile.banner_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="px-6 pb-8 sm:px-8 sm:pb-10">
        <div className="relative -mt-12 flex items-end justify-between gap-4 sm:-mt-14">
          <div className="rounded-full border-4 border-card bg-muted">
            {avatar ? (
              <img
                src={avatar}
                alt={`${profile.name} avatar`}
                className="size-24 rounded-full object-cover sm:size-28"
              />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-full text-muted-foreground sm:size-28">
                <AtSign className="size-8" />
              </div>
            )}
          </div>
          <ToolLink href={profileUrl}>View on 𝕏</ToolLink>
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl/8 font-medium tracking-normal">
              {profile.name}
            </h2>
            {profile.verified ? (
              <span title="Verified" className="text-blue-500">
                <BadgeCheck className="size-5" />
              </span>
            ) : null}
            {profile.protected ? (
              <span title="Protected account" className="text-muted-foreground">
                <Lock className="size-4" />
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-muted-foreground">
            @{profile.screen_name}
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-background-subtle p-6 sm:p-8">
          <div className="text-sm text-muted-foreground">Followers</div>
          <div className="mt-1 font-mono text-5xl/none font-semibold tracking-normal sm:text-6xl/none">
            {formatNumber(profile.followers)}
          </div>
          {delta !== null && delta !== 0 ? (
            <div
              className={`mt-3 inline-flex items-center gap-1 text-sm font-medium ${
                delta > 0 ? 'text-success' : 'text-destructive'
              }`}
            >
              {delta > 0 ? (
                <ArrowUp className="size-4" />
              ) : (
                <ArrowDown className="size-4" />
              )}
              {formatNumber(Math.abs(delta))} since you opened this page
            </div>
          ) : null}
        </div>

        <dl className="mt-6 grid grid-cols-2 divide-x divide-border border-t border-border pt-6">
          <div className="pr-4">
            <dt className="text-sm text-muted-foreground">Following</dt>
            <dd className="mt-1 text-xl/7 font-medium">
              {formatCompactNumber(profile.following)}
            </dd>
          </div>
          <div className="pl-4">
            <dt className="text-sm text-muted-foreground">Posts</dt>
            <dd className="mt-1 text-xl/7 font-medium">
              {formatCompactNumber(profile.tweets)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {secondsSinceRefresh === null ? (
              'Waiting for first refresh.'
            ) : (
              <>
                Updated{' '}
                {secondsSinceRefresh === 0
                  ? 'just now'
                  : `${secondsSinceRefresh}s ago`}
                {autoRefresh && secondsUntilNext !== null
                  ? `, next refresh in ${secondsUntilNext}s`
                  : null}
                {isRefreshing ? (
                  <span className="ml-2 italic">refreshing...</span>
                ) : null}
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onManualRefresh}
              disabled={isManualBlocked}
            >
              <RefreshCw
                className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {manualCooldownRemaining > 0 && !isRefreshing
                ? `Wait ${manualCooldownRemaining}s`
                : 'Refresh'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onToggleAutoRefresh}
            >
              {autoRefresh ? (
                <>
                  <Pause className="size-4" />
                  Pause auto-refresh
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  Resume auto-refresh
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </ToolCard>
  )
}

'use client'

import {
  BadgeCheck,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Repeat2,
  Video,
} from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type XProfile = {
  id: string
  name: string
  screen_name: string
  description: string
  profile_url: string
  avatar_url: string | null
  banner_url: string | null
  followers: number | null
  following: number | null
  tweets: number | null
  likes: number | null
  joined: string | null
  location: string
  protected: boolean
  verified: boolean
  website: string | null
  website_display: string | null
}

export type XPost = {
  post_id: string
  post_url: string
  text: string
  created_at: string | null
  created_timestamp?: number | null
  lang?: string | null
  reply_count: number
  retweet_count: number
  like_count: number
  quote_count: number
  view_count: number | null
  bookmark_count: number | null
  photos: Array<{
    url: string
    width: number | null
    height: number | null
    alt_text: string | null
  }>
  videos: Array<{
    url: string
    thumbnail_url: string | null
    width: number | null
    height: number | null
    duration: number | null
    kind: 'video' | 'gif'
  }>
  author: {
    id?: string
    name: string
    screen_name: string
    avatar_url: string | null
    verified?: boolean
    protected?: boolean
  }
}

export type BlueskyProfile = {
  did: string
  handle: string
  displayName?: string
  description?: string
  avatar?: string
  followersCount?: number
  followsCount?: number
  postsCount?: number
}

type ToolError = { error: true; error_message?: string }

const toolErrorMessages: Record<string, string> = {
  fx_not_found: 'No public profile or post matched that input.',
  fx_rate_limited:
    'The public data source is busy. Wait a minute and try again.',
  fx_unavailable: 'The public data source is unavailable right now.',
  fx_upstream_down: 'The public data source is down right now.',
  fx_bad_body: 'The public data source returned an unreadable response.',
}

const formatToolError = (message: string | undefined) => {
  if (!message) return 'Request failed.'
  return toolErrorMessages[message] ?? message
}

export const formatNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : 'Unknown'

export const formatCompactNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'No data'
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export const formatDate = (value: string | null | undefined) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date)
}

export const upgradeXAvatarUrl = (url: string | null | undefined) =>
  url?.replace(/_normal\.([a-z]+)(\?.*)?$/i, '.$1$2') ?? null

export const joinSearchParts = (...parts: Array<string | null | undefined>) =>
  parts.filter(Boolean).join(' ')

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, init)
  const payload = (await response.json()) as unknown
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    (payload as ToolError).error
  ) {
    throw new Error(formatToolError((payload as ToolError).error_message))
  }
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return payload as T
}

export function SubmitButton({
  children,
  isLoading,
}: {
  children: string
  isLoading: boolean
}) {
  return (
    <Button type="submit" size="lg" disabled={isLoading}>
      {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  )
}

export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null
  return <p className="text-sm text-destructive">{error}</p>
}

export function FormPanel({ children }: { children: ReactNode }) {
  return <div className="tool-form-panel">{children}</div>
}

export function ToolPanelIntro({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="mb-6 max-w-2xl">
      <h2 className="text-xl/7 font-medium tracking-normal">{title}</h2>
      <p className="mt-2 text-base/7 text-foreground-muted">{children}</p>
    </div>
  )
}

export function ToolResultPortal({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setRoot(document.getElementById('tool-result-root'))
  }, [])

  if (!root) return null
  return createPortal(children, root)
}

export function ToolCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function ExampleButtons({
  examples,
  onSelect,
  disabled,
  format = (example) => (example.startsWith('@') ? example : `@${example}`),
}: {
  examples: string[]
  onSelect: (example: string) => void
  disabled?: boolean
  format?: (example: string) => string
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
      <span>Try:</span>
      {examples.map((example) => (
        <Button
          key={example}
          type="button"
          variant="secondary"
          size="lg"
          disabled={disabled}
          onClick={() => onSelect(example)}
        >
          {format(example)}
        </Button>
      ))}
    </div>
  )
}

export function KeyValue({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="grid gap-1 border-t border-border py-3 first:border-t-0 sm:grid-cols-[11rem_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground">{value}</dd>
    </div>
  )
}

export function ProfileSummary({ profile }: { profile: XProfile }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="size-14 rounded-full object-cover"
          />
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-xl font-medium">{profile.name}</h2>
          <a
            href={profile.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground underline underline-offset-2"
          >
            @{profile.screen_name}
          </a>
        </div>
      </div>
      <dl>
        <KeyValue label="Twitter ID" value={profile.id} />
        <KeyValue label="Followers" value={formatNumber(profile.followers)} />
        <KeyValue label="Following" value={formatNumber(profile.following)} />
        <KeyValue label="Posts" value={formatNumber(profile.tweets)} />
        <KeyValue label="Joined" value={profile.joined || 'Unknown'} />
        <KeyValue label="Verified" value={profile.verified ? 'Yes' : 'No'} />
      </dl>
    </div>
  )
}

export function XIdentity({
  name,
  screenName,
  avatarUrl,
  verified,
  avatarSize = 'md',
}: {
  name: string
  screenName: string
  avatarUrl: string | null
  verified?: boolean
  avatarSize?: 'sm' | 'md' | 'lg'
}) {
  const avatarClass =
    avatarSize === 'lg'
      ? 'size-14'
      : avatarSize === 'sm'
        ? 'size-10'
        : 'size-12'

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground',
          avatarClass,
        )}
      >
        {avatarUrl ? (
          <img
            src={upgradeXAvatarUrl(avatarUrl) ?? avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          '@'
        )}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{name}</span>
          {verified ? (
            <BadgeCheck className="size-4 shrink-0 text-blue-500" />
          ) : null}
        </div>
        <div className="truncate text-sm text-muted-foreground">
          @{screenName}
        </div>
      </div>
    </div>
  )
}

export function ToolLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline decoration-border underline-offset-4 hover:text-foreground-muted',
        className,
      )}
    >
      {children}
      <ExternalLink className="size-3.5" />
    </a>
  )
}

function PostMediaGrid({ post }: { post: XPost }) {
  const mediaCount = post.photos.length + post.videos.length
  if (!mediaCount) return null

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {post.photos.slice(0, 4).map((photo) => (
        <div key={photo.url} className="overflow-hidden rounded-lg bg-muted">
          <img
            src={photo.url}
            alt={photo.alt_text ?? ''}
            className="h-48 w-full object-cover"
            loading="lazy"
          />
        </div>
      ))}
      {post.videos.slice(0, 2).map((video) => (
        <div
          key={video.url}
          className="flex h-48 items-center justify-center overflow-hidden rounded-lg bg-muted"
        >
          {video.thumbnail_url ? (
            <div className="relative h-full w-full">
              <img
                src={video.thumbnail_url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                <Video className="size-8" />
              </div>
            </div>
          ) : (
            <Video className="size-8 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  )
}

export function XPostCard({
  post,
  label,
  compact = false,
}: {
  post: XPost
  label?: string
  compact?: boolean
}) {
  const date = formatDate(post.created_at)

  return (
    <ToolCard className={compact ? 'p-4' : undefined}>
      <div className="flex items-start gap-3">
        {label ? (
          <div className="shrink-0 text-sm font-medium text-muted-foreground">
            {label}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <XIdentity
              name={post.author.name}
              screenName={post.author.screen_name}
              avatarUrl={post.author.avatar_url}
              verified={post.author.verified}
              avatarSize="sm"
            />
            <ToolLink href={post.post_url}>Open on 𝕏</ToolLink>
          </div>
          {date ? (
            <div className="mt-2 text-sm text-muted-foreground">{date}</div>
          ) : null}
          <p className="mt-3 whitespace-pre-wrap text-sm/6 text-foreground">
            {post.text}
          </p>

          <PostMediaGrid post={post} />

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="size-4" />
              {formatCompactNumber(post.reply_count)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Repeat2 className="size-4" />
              {formatCompactNumber(post.retweet_count)}
            </span>
            <span>{formatCompactNumber(post.like_count)} likes</span>
            {post.photos.length ? (
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="size-4" />
                {post.photos.length}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </ToolCard>
  )
}

export function useAsyncTool<TResult>() {
  const [result, setResult] = useState<TResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const run = async (callback: () => Promise<TResult>) => {
    setError(null)
    setResult(null)
    setIsLoading(true)
    try {
      setResult(await callback())
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Request failed')
    } finally {
      setIsLoading(false)
    }
  }

  return { result, error, isLoading, run }
}

export function PostList({ posts }: { posts: XPost[] }) {
  if (!posts.length) {
    return <p className="text-muted-foreground">No posts found.</p>
  }
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <XPostCard key={post.post_id} post={post} />
      ))}
    </div>
  )
}

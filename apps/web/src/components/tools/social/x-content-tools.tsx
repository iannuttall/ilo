'use client'

import {
  Check,
  Copy,
  Download,
  FileText,
  Film,
  Search,
  ShieldAlert,
} from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ErrorText,
  ExampleButtons,
  FormPanel,
  fetchJson,
  formatCompactNumber,
  ToolCard,
  ToolLink,
  ToolPanelIntro,
  ToolResultPortal,
  XIdentity,
  type XPost,
  XPostCard,
} from './shared'

type Feed = 'latest' | 'top' | 'media'

type SearchResponse = {
  search: {
    feed: Feed
    query: string
    results: XPost[]
    next_cursor: string | null
  }
}

type ThreadResult = {
  root_post_id: string
  root_post_url: string
  author: {
    id: string
    name: string
    screen_name: string
    avatar_url: string | null
    verified: boolean
    protected: boolean
  }
  posts: XPost[]
  post_count: number
  word_count: number
  read_minutes: number
}

type VideoPost = {
  post_id: string
  post_url: string
  text: string
  created_at: string | null
  author: {
    id: string
    name: string
    screen_name: string
    avatar_url: string | null
    verified: boolean
  }
  media: Array<{
    kind: 'video' | 'gif'
    poster_url: string | null
    duration_ms: number | null
    width: number | null
    height: number | null
    variants: Array<{
      url: string
      content_type: string
      bitrate: number | null
      width: number | null
      height: number | null
      label: string
    }>
  }>
}

const FEEDS: Array<{ value: Feed; label: string }> = [
  { value: 'latest', label: 'Latest' },
  { value: 'top', label: 'Top' },
  { value: 'media', label: 'Media' },
]

const SEARCH_EXAMPLES = [
  'from:x min_faves:100',
  'open source filter:links',
  '"product launch"',
]
const POST_EXAMPLES = ['https://x.com/x/status/20', '20']

const formatBitrate = (value: number | null) => {
  if (!value) return 'Source'
  return `${Math.round(value / 1000)} kbps`
}

const filenameFor = (postId: string, index: number, label: string) =>
  `${postId}-${index + 1}-${label.toLowerCase()}.mp4`

const threadToMarkdown = (thread: ThreadResult) =>
  [
    `# ${thread.author.name} on X`,
    '',
    `Source: ${thread.root_post_url}`,
    '',
    ...thread.posts.flatMap((post, index) => [
      `## Post ${index + 1}`,
      '',
      post.text,
      '',
      post.post_url,
      '',
    ]),
  ].join('\n')

const downloadText = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function XSearchTool() {
  const [query, setQuery] = useState('')
  const [feed, setFeed] = useState<Feed>('latest')
  const [results, setResults] = useState<XPost[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSearch = async ({
    nextFeed = feed,
    cursor,
    append = false,
    rawQuery = query,
    updateUrl = true,
  }: {
    nextFeed?: Feed
    cursor?: string | null
    append?: boolean
    rawQuery?: string
    updateUrl?: boolean
  } = {}) => {
    const q = rawQuery.trim()
    if (!q) {
      setError('Enter a search.')
      return
    }

    setError(null)
    setIsLoading(true)
    setHasSearched(true)

    try {
      const params = new URLSearchParams()
      params.set('q', q)
      params.set('feed', nextFeed)
      params.set('count', '20')
      if (cursor) params.set('cursor', cursor)

      const payload = await fetchJson<SearchResponse>(
        `/api/tools/x/search?${params.toString()}`,
      )

      setFeed(payload.search.feed)
      setQuery(payload.search.query)
      setResults((current) =>
        append
          ? [...current, ...payload.search.results]
          : payload.search.results,
      )
      setNextCursor(payload.search.next_cursor)

      if (updateUrl && typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.set('q', payload.search.query)
        url.searchParams.set('feed', payload.search.feed)
        window.history.replaceState(null, '', url.toString())
      }
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : 'Could not run that search.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void runSearch()
  }

  const handleFeed = (nextFeed: Feed) => {
    setFeed(nextFeed)
    if (query.trim()) void runSearch({ nextFeed, cursor: null })
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: URL hydration should run once on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const initialQuery = params.get('q')
    const initialFeed = params.get('feed') as Feed | null
    if (initialQuery) {
      const nextFeed =
        initialFeed && FEEDS.some((item) => item.value === initialFeed)
          ? initialFeed
          : 'latest'
      setQuery(initialQuery)
      setFeed(nextFeed)
      void runSearch({ rawQuery: initialQuery, nextFeed, updateUrl: false })
    }
  }, [])

  return (
    <div className="w-full space-y-8">
      <FormPanel>
        <ToolPanelIntro title="Search public posts without the login wall">
          Enter a topic, handle, phrase, or 𝕏 search operator. The tool returns
          public posts you can scan, open, and refine without signing in.
        </ToolPanelIntro>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <Input
            type="text"
            placeholder="Search text, @handles, or 𝕏 operators"
            required
            className="h-11 sm:flex-1"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="submit" size="lg" disabled={isLoading}>
            <Search className="size-4" />
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </form>

        <ExampleButtons
          examples={SEARCH_EXAMPLES}
          disabled={isLoading}
          format={(example) => example}
          onSelect={(example) => {
            setQuery(example)
            void runSearch({ rawQuery: example })
          }}
        />

        <div className="mx-auto mt-6 flex max-w-md rounded-lg bg-muted p-1">
          {FEEDS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => handleFeed(item.value)}
              className={`flex-1 cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                feed === item.value
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <ErrorText error={error} />
        </div>
      </FormPanel>

      {results.length ||
      (hasSearched && !isLoading && results.length === 0) ||
      nextCursor ? (
        <ToolResultPortal>
          <div className="space-y-4">
            {results.length ? (
              <div className="space-y-4">
                {results.map((post) => (
                  <XPostCard key={post.post_id} post={post} />
                ))}
              </div>
            ) : null}

            {hasSearched && !isLoading && results.length === 0 ? (
              <ToolCard className="text-center text-muted-foreground">
                No public posts matched that search.
              </ToolCard>
            ) : null}

            {nextCursor ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  size="lg"
                  disabled={isLoading}
                  onClick={() =>
                    runSearch({ cursor: nextCursor, append: true })
                  }
                >
                  {isLoading ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            ) : null}
          </div>
        </ToolResultPortal>
      ) : null}
    </div>
  )
}

export function XThreadUnrollerTool() {
  const [url, setUrl] = useState('')
  const [thread, setThread] = useState<ThreadResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lookup = async (
    rawUrl: string,
    { updateUrl = true }: { updateUrl?: boolean } = {},
  ) => {
    const value = rawUrl.trim()
    if (!value) {
      setError('Enter a thread URL or post ID.')
      return
    }

    setError(null)
    setIsLoading(true)
    setThread(null)
    setCopied(false)

    try {
      const payload = await fetchJson<{ thread: ThreadResult }>(
        '/api/tools/x/thread',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: value }),
        },
      )

      setThread(payload.thread)
      setUrl(payload.thread.root_post_url)

      if (updateUrl && typeof window !== 'undefined') {
        const next = new URL(window.location.href)
        next.searchParams.set('url', payload.thread.root_post_url)
        window.history.replaceState(null, '', next.toString())
      }
    } catch (threadError) {
      setError(
        threadError instanceof Error
          ? threadError.message
          : 'Could not read that thread.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void lookup(url)
  }

  const handleCopy = async () => {
    if (!thread) return
    try {
      await navigator.clipboard.writeText(threadToMarkdown(thread))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Could not copy to clipboard.')
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: URL hydration should run once on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const initial = new URLSearchParams(window.location.search).get('url')
    if (initial) {
      setUrl(initial)
      void lookup(initial, { updateUrl: false })
    }
  }, [])

  return (
    <div className="w-full space-y-8">
      <FormPanel>
        <ToolPanelIntro title="Turn a thread into one clean read">
          Paste a public post URL or ID. The tool follows the thread, orders the
          posts, and gives you copyable Markdown plus a JSON export.
        </ToolPanelIntro>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <Input
            type="text"
            placeholder="https://x.com/username/status/..."
            required
            className="h-11 sm:flex-1"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <Button type="submit" size="lg" disabled={isLoading}>
            <FileText className="size-4" />
            {isLoading ? 'Reading...' : 'Read thread'}
          </Button>
        </form>
        <ExampleButtons
          examples={POST_EXAMPLES}
          disabled={isLoading}
          format={(example) => example}
          onSelect={(example) => {
            setUrl(example)
            void lookup(example)
          }}
        />
        <div className="mt-3">
          <ErrorText error={error} />
        </div>
      </FormPanel>

      {thread ? (
        <ToolResultPortal>
          <ToolCard>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <XIdentity
                name={thread.author.name}
                screenName={thread.author.screen_name}
                avatarUrl={thread.author.avatar_url}
                verified={thread.author.verified}
                avatarSize="lg"
              />

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleCopy}>
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copied ? 'Copied' : 'Copy Markdown'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    downloadText(
                      threadToMarkdown(thread),
                      `${thread.root_post_id}.md`,
                      'text/markdown',
                    )
                  }
                >
                  <Download className="size-4" />
                  Markdown
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    downloadText(
                      JSON.stringify(thread, null, 2),
                      `${thread.root_post_id}.json`,
                      'application/json',
                    )
                  }
                >
                  <Download className="size-4" />
                  JSON
                </Button>
              </div>
            </div>

            <dl className="mt-6 grid gap-0 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <ThreadStat label="Posts" value={String(thread.post_count)} />
              <ThreadStat
                label="Words"
                value={formatCompactNumber(thread.word_count)}
              />
              <ThreadStat
                label="Read time"
                value={`${thread.read_minutes} min`}
              />
            </dl>

            <div className="mt-8 space-y-4">
              {thread.posts.map((post, index) => (
                <XPostCard
                  key={post.post_id}
                  post={post}
                  label={`Post ${index + 1}`}
                  compact
                />
              ))}
            </div>
          </ToolCard>
        </ToolResultPortal>
      ) : null}
    </div>
  )
}

function ThreadStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 first:pl-0 last:pr-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  )
}

export function XVideoDownloaderTool() {
  const [url, setUrl] = useState('')
  const [post, setPost] = useState<VideoPost | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lookup = async (
    rawUrl: string,
    { updateUrl = true }: { updateUrl?: boolean } = {},
  ) => {
    const value = rawUrl.trim()
    if (!value) {
      setError('Enter a post URL or post ID.')
      return
    }

    setError(null)
    setIsLoading(true)
    setPost(null)

    try {
      const payload = await fetchJson<{ post: VideoPost }>(
        '/api/tools/x/video',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: value }),
        },
      )

      setPost(payload.post)
      setUrl(payload.post.post_url)

      if (updateUrl && typeof window !== 'undefined') {
        const next = new URL(window.location.href)
        next.searchParams.set('url', payload.post.post_url)
        window.history.replaceState(null, '', next.toString())
      }
    } catch (videoError) {
      setError(
        videoError instanceof Error
          ? videoError.message
          : 'Could not fetch that post.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void lookup(url)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: URL hydration should run once on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const initial = new URLSearchParams(window.location.search).get('url')
    if (initial) {
      setUrl(initial)
      void lookup(initial, { updateUrl: false })
    }
  }, [])

  return (
    <div className="w-full space-y-8">
      <FormPanel>
        <ToolPanelIntro title="Find the video files behind a public post">
          Paste a public 𝕏 post URL or ID. The tool finds available video and
          GIF files, shows the source post, and gives you direct MP4 links.
        </ToolPanelIntro>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <Input
            type="text"
            placeholder="https://x.com/username/status/..."
            required
            className="h-11 sm:flex-1"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <Button type="submit" size="lg" disabled={isLoading}>
            <Film className="size-4" />
            {isLoading ? 'Loading...' : 'Get video'}
          </Button>
        </form>
        <ExampleButtons
          examples={POST_EXAMPLES}
          disabled={isLoading}
          format={(example) => example}
          onSelect={(example) => {
            setUrl(example)
            void lookup(example)
          }}
        />
        <div className="mt-3">
          <ErrorText error={error} />
        </div>
      </FormPanel>

      {post ? (
        <ToolResultPortal>
          <ToolCard>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <XIdentity
                name={post.author.name}
                screenName={post.author.screen_name}
                avatarUrl={post.author.avatar_url}
                verified={post.author.verified}
              />
              <ToolLink href={post.post_url}>Open on 𝕏</ToolLink>
            </div>

            {post.text ? (
              <p className="mt-5 whitespace-pre-wrap text-sm/6">{post.text}</p>
            ) : null}

            <div className="mt-6 flex items-start gap-3 rounded-lg bg-muted p-4 text-sm/6 text-muted-foreground">
              <ShieldAlert className="mt-0.5 size-5 shrink-0" />
              <p>
                Only download media you have the right to use. This page links
                to public MP4 files and does not store videos.
              </p>
            </div>

            <div className="mt-8 space-y-8">
              {post.media.map((media, index) => (
                <section
                  key={`${media.kind}-${media.variants.map((variant) => variant.url).join(',')}`}
                  className="border-t border-border pt-8 first:border-t-0 first:pt-0"
                >
                  <div className="flex flex-col gap-5 lg:flex-row">
                    <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-muted lg:max-w-md">
                      {media.poster_url ? (
                        <img
                          src={media.poster_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Film className="size-10 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium">
                        {media.kind === 'gif' ? 'GIF' : 'Video'}{' '}
                        {post.media.length > 1 ? index + 1 : ''}
                      </h3>
                      <div className="mt-4 divide-y divide-border">
                        {media.variants.map((variant) => (
                          <div
                            key={variant.url}
                            className="flex flex-col gap-3 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <div className="font-medium">{variant.label}</div>
                              <div className="text-sm text-muted-foreground">
                                {variant.width && variant.height
                                  ? `${variant.width}x${variant.height}`
                                  : 'MP4'}{' '}
                                · {formatBitrate(variant.bitrate)}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button asChild>
                                <a
                                  href={variant.url}
                                  download={filenameFor(
                                    post.post_id,
                                    index,
                                    variant.label,
                                  )}
                                >
                                  <Download className="size-4" />
                                  Download MP4
                                </a>
                              </Button>
                              <Button variant="secondary" asChild>
                                <a
                                  href={variant.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </ToolCard>
        </ToolResultPortal>
      ) : null}
    </div>
  )
}

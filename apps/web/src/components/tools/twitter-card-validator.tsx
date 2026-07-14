'use client'

import { Loader2 } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormPanel, ToolPanelIntro, ToolResultPortal } from './social/shared'

type PreviewData = {
  title: string
  description: string
  image: string | null
  url: string
  card?: string
}

type PreviewResults = Record<string, string | null>

type PreviewResponse =
  | {
      data: PreviewData
      results: PreviewResults
    }
  | {
      error: true
      error_message?: string
    }

type PreviewVariant = 'twitter' | 'threads' | 'bluesky'

const PREVIEW_VARIANTS: Record<
  PreviewVariant,
  {
    endpoint: string
    button: string
    introTitle: string
    intro: string
    showTwitterCard: boolean
  }
> = {
  twitter: {
    endpoint: '/api/tools/twitter-card-validator',
    button: 'Get X preview',
    introTitle: 'Check the link preview 𝕏 can read',
    intro:
      'Paste a page URL before you post it. The tool shows the card preview, the tags that were found, and what 𝕏 is likely to use.',
    showTwitterCard: true,
  },
  threads: {
    endpoint: '/api/tools/threads-link-preview',
    button: 'Get Threads preview',
    introTitle: 'Check the Threads preview before you share',
    intro:
      'Paste a page URL and see the title, description, and image Threads can pull from the page before you publish the post.',
    showTwitterCard: false,
  },
  bluesky: {
    endpoint: '/api/tools/bluesky-link-preview',
    button: 'Get Bluesky preview',
    introTitle: 'Check the Bluesky preview before it goes live',
    intro:
      'Paste a page URL and see the card details Bluesky can read, including the image and Open Graph fields behind the preview.',
    showTwitterCard: false,
  },
}

const NotFound = () => <span className="text-muted-foreground">Not found</span>

const Code = ({ children }: { children: string }) => (
  <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{children}</code>
)

const hasTag = (results: PreviewResults, key: string) => Boolean(results[key])

const TagRow = ({
  label,
  found,
  preferred,
}: {
  label: string
  found: boolean
  preferred?: boolean
}) => (
  <p>
    <Code>{label}</Code> tag: {found ? 'Found' : <NotFound />}
    {preferred ? <span className="text-green-700"> OK</span> : null}
  </p>
)

const PreviewCard = ({
  data,
  imageNonce,
}: {
  data: PreviewData
  imageNonce: number
}) => {
  const cacheBustedImage = data.image
    ? (() => {
        try {
          const parsed = new URL(data.image)
          parsed.searchParams.set('v', String(imageNonce))
          return parsed.toString()
        } catch {
          const separator = data.image.includes('?') ? '&' : '?'
          return `${data.image}${separator}v=${imageNonce}`
        }
      })()
    : null

  if (data.card === 'summary_large_image') {
    return (
      <div className="max-w-[612px]">
        <div className="relative aspect-[1.91/1] overflow-hidden rounded-2xl border border-border">
          {cacheBustedImage ? (
            <img
              src={cacheBustedImage}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
          <div className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded bg-black/80 px-2 py-1 text-xs text-white">
            <span className="line-clamp-1">{data.title || 'Untitled'}</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          From {data.url}
        </div>
      </div>
    )
  }

  return (
    <div className="flex max-w-[612px] overflow-hidden rounded-2xl border border-border">
      <div className="flex h-[89px] w-[89px] shrink-0 items-center justify-center border-r border-border bg-muted sm:h-[129px] sm:w-[129px]">
        {cacheBustedImage ? (
          <img
            src={cacheBustedImage}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="text-sm text-muted-foreground">No image</div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3 text-sm">
        <div className="truncate text-muted-foreground">{data.url}</div>
        <div className="line-clamp-2 font-medium">{data.title}</div>
        <div className="line-clamp-2 text-muted-foreground">
          {data.description}
        </div>
      </div>
    </div>
  )
}

const PreviewNotes = ({
  results,
  showTwitterCard,
}: {
  results: PreviewResults
  showTwitterCard: boolean
}) => {
  const twitterTitle = hasTag(results, 'twitter:title')
  const ogTitle = hasTag(results, 'og:title')
  const titleMeta = hasTag(results, 'title_meta')
  const titleTag = hasTag(results, 'title_tag')
  const twitterDescription = hasTag(results, 'twitter:description')
  const ogDescription = hasTag(results, 'og:description')
  const twitterImage = hasTag(results, 'twitter:image')
  const ogImage = hasTag(results, 'og:image')
  const twitterCard = hasTag(results, 'twitter:card')

  return (
    <div className="max-w-[612px] space-y-4 text-sm">
      <div>
        <h2 className="text-base font-semibold">Title</h2>
        <TagRow label="twitter:title" found={twitterTitle} preferred />
        <TagRow label="og:title" found={ogTitle} preferred={!twitterTitle} />
        <TagRow
          label="title"
          found={titleMeta}
          preferred={!twitterTitle && !ogTitle}
        />
        <TagRow
          label="<title>"
          found={titleTag}
          preferred={!twitterTitle && !ogTitle && !titleMeta}
        />
      </div>
      <div>
        <h2 className="text-base font-semibold">Description</h2>
        <TagRow
          label="twitter:description"
          found={twitterDescription}
          preferred
        />
        <TagRow
          label="og:description"
          found={ogDescription}
          preferred={!twitterDescription}
        />
      </div>
      <div>
        <h2 className="text-base font-semibold">Image</h2>
        <TagRow label="twitter:image" found={twitterImage} preferred />
        <TagRow label="og:image" found={ogImage} preferred={!twitterImage} />
        {results.image ? (
          <p className="text-destructive">{results.image}</p>
        ) : null}
      </div>
      <div>
        <h2 className="text-base font-semibold">Card</h2>
        {showTwitterCard ? (
          <TagRow label="twitter:card" found={twitterCard} preferred />
        ) : (
          <p>
            <Code>og:title</Code>, <Code>og:description</Code>, and{' '}
            <Code>og:image</Code> drive this preview.
          </p>
        )}
      </div>
    </div>
  )
}

function LinkPreviewTool({ variant }: { variant: PreviewVariant }) {
  const config = PREVIEW_VARIANTS[variant]
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<{
    data: PreviewData
    results: PreviewResults
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [imageNonce, setImageNonce] = useState(0)

  const runPreview = async (
    rawUrl: string,
    { updateUrl = true }: { updateUrl?: boolean } = {},
  ) => {
    const value = rawUrl.trim()
    if (!value) {
      setError('Enter a URL.')
      return
    }

    setError(null)
    setResult(null)
    setIsLoading(true)

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: value }),
      })
      const payload = (await response.json()) as PreviewResponse
      if ('error' in payload) {
        setError(payload.error_message ?? 'Error fetching URL.')
        return
      }
      setResult(payload)
      setUrl(payload.data.url || value)
      setImageNonce(Date.now())
      if (updateUrl && typeof window !== 'undefined') {
        const next = new URL(window.location.href)
        next.searchParams.set('url', payload.data.url || value)
        window.history.replaceState(null, '', next.toString())
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void runPreview(url)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: URL hydration should run once on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const initial = new URLSearchParams(window.location.search).get('url')
    if (initial) {
      setUrl(initial)
      void runPreview(initial, { updateUrl: false })
    }
  }, [])

  return (
    <div className="space-y-10">
      <FormPanel>
        <ToolPanelIntro title={config.introTitle}>
          {config.intro}
        </ToolPanelIntro>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <Input
            type="text"
            inputMode="url"
            placeholder="https://example.com"
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="h-11 sm:flex-1"
          />
          <Button type="submit" size="lg" disabled={isLoading}>
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            {config.button}
          </Button>
        </form>
        {error ? (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        ) : null}
      </FormPanel>

      {result ? (
        <ToolResultPortal>
          <div className="space-y-8">
            <PreviewCard data={result.data} imageNonce={imageNonce} />
            <PreviewNotes
              results={result.results}
              showTwitterCard={config.showTwitterCard}
            />
          </div>
        </ToolResultPortal>
      ) : null}
    </div>
  )
}

export function TwitterCardValidatorTool() {
  return <LinkPreviewTool variant="twitter" />
}

export function ThreadsLinkPreviewTool() {
  return <LinkPreviewTool variant="threads" />
}

export function BlueskyLinkPreviewTool() {
  return <LinkPreviewTool variant="bluesky" />
}

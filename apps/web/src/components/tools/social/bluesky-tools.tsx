'use client'

import { Check, Copy } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  type BlueskyProfile,
  ErrorText,
  ExampleButtons,
  FormPanel,
  fetchJson,
  formatNumber,
  KeyValue,
  SubmitButton,
  ToolCard,
  ToolLink,
  ToolPanelIntro,
  ToolResultPortal,
  useAsyncTool,
} from './shared'

const BLUESKY_EXAMPLES = ['bsky.app', 'jay.bsky.team', 'pfrazee.com']

const normalizeBlueskyHandle = (input: string) => {
  const cleaned = input.trim().replace(/^@+/, '')
  if (!cleaned) return ''
  if (cleaned.startsWith('did:')) return cleaned
  return cleaned.includes('.') ? cleaned : `${cleaned}.bsky.social`
}

export function BlueskyDidTool() {
  const [handle, setHandle] = useState('')
  const tool = useAsyncTool<{ profile: BlueskyProfile }>()
  const [copied, setCopied] = useState(false)

  const lookup = useCallback(
    async (
      rawHandle: string,
      { updateUrl = true }: { updateUrl?: boolean } = {},
    ) => {
      const cleaned = normalizeBlueskyHandle(rawHandle)
      if (!cleaned) throw new Error('Enter a Bluesky handle.')
      const payload = await fetchJson<{ profile: BlueskyProfile }>(
        `/api/tools/bluesky/profile/${encodeURIComponent(cleaned)}`,
      )
      setHandle(payload.profile.handle)
      setCopied(false)
      if (updateUrl && typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.set('handle', payload.profile.handle)
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

  const copyDid = async () => {
    if (!tool.result?.profile.did) return
    await navigator.clipboard.writeText(tool.result.profile.did)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: URL hydration should run once on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const initial = params.get('handle') ?? params.get('u') ?? params.get('did')
    if (initial) {
      const cleaned = normalizeBlueskyHandle(initial)
      setHandle(cleaned)
      void tool.run(() => lookup(cleaned, { updateUrl: false }))
    }
  }, [lookup])

  return (
    <div className="space-y-8">
      <FormPanel>
        <ToolPanelIntro title="Resolve a Bluesky handle to its permanent identity">
          Paste a public Bluesky handle. The tool returns the DID, public
          profile details, and the account link you can use in exports or
          mapping work.
        </ToolPanelIntro>
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            placeholder="@username or username.bsky.social"
            aria-label="Bluesky handle"
            required
            className="h-11 sm:flex-1"
          />
          <SubmitButton isLoading={tool.isLoading}>Find DID</SubmitButton>
        </form>
        <ExampleButtons
          examples={BLUESKY_EXAMPLES}
          disabled={tool.isLoading}
          format={(example) => (example.startsWith('did:') ? example : example)}
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
        <ToolResultPortal>
          <BlueskyProfileResult
            profile={tool.result.profile}
            copied={copied}
            onCopyDid={() => void copyDid()}
          />
        </ToolResultPortal>
      ) : null}
    </div>
  )
}

export function BlueskyIdTool() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const tool = useAsyncTool<{ number: number }>()
  const [copied, setCopied] = useState(false)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void tool.run(() =>
      fetchJson('/api/tools/bluesky/signup-number', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: normalizeBlueskyHandle(username),
          password,
        }),
      }),
    )
  }

  const copyId = async () => {
    if (!tool.result) return
    await navigator.clipboard.writeText(String(tool.result.number))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const initial =
      new URLSearchParams(window.location.search).get('handle') ??
      new URLSearchParams(window.location.search).get('u')
    if (initial) {
      setUsername(normalizeBlueskyHandle(initial))
    }
  }, [])

  return (
    <div className="space-y-6">
      <FormPanel>
        <ToolPanelIntro title="Find the legacy number behind a Bluesky account">
          Enter a Bluesky handle and app password. Use a revocable app password
          when you need the older numerical ID for exports or older tools.
        </ToolPanelIntro>
        <form method="post" onSubmit={submit} className="space-y-3">
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="@username or username.bsky.social"
            aria-label="Bluesky username"
            required
            className="h-11"
          />
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="App password"
            aria-label="Bluesky app password"
            required
            className="h-11"
          />
          <SubmitButton isLoading={tool.isLoading}>Find ID</SubmitButton>
        </form>
        <p className="mt-3 text-sm text-muted-foreground">
          Use a Bluesky app password, not your main account password.
        </p>
        <div className="mt-3">
          <ErrorText error={tool.error} />
        </div>
      </FormPanel>
      {tool.result ? (
        <ToolResultPortal>
          <ToolCard>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Bluesky ID</div>
                <div className="mt-1 font-mono text-3xl/9 font-medium tracking-normal">
                  {tool.result.number.toLocaleString()}
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void copyId()}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? 'Copied' : 'Copy ID'}
              </Button>
            </div>
          </ToolCard>
        </ToolResultPortal>
      ) : null}
    </div>
  )
}

function BlueskyProfileResult({
  profile,
  copied,
  onCopyDid,
}: {
  profile: BlueskyProfile
  copied: boolean
  onCopyDid: () => void
}) {
  return (
    <ToolCard>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              '@'
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl/7 font-medium tracking-normal">
              {profile.displayName || profile.handle}
            </h2>
            <p className="truncate text-muted-foreground">@{profile.handle}</p>
          </div>
        </div>
        <ToolLink href={`https://bsky.app/profile/${profile.handle}`}>
          Open on Bluesky
        </ToolLink>
      </div>

      {profile.description ? (
        <p className="mt-4 text-sm/6 text-foreground-muted">
          {profile.description}
        </p>
      ) : null}

      <dl className="mt-5">
        <KeyValue
          label="DID"
          value={
            <span className="flex min-w-0 flex-wrap items-center gap-3">
              <code className="break-all rounded bg-muted px-2 py-1 font-mono text-sm">
                {profile.did}
              </code>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onCopyDid}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? 'Copied' : 'Copy DID'}
              </Button>
            </span>
          }
        />
        <KeyValue label="Handle" value={`@${profile.handle}`} />
        <KeyValue
          label="Followers"
          value={formatNumber(profile.followersCount)}
        />
        <KeyValue
          label="Following"
          value={formatNumber(profile.followsCount)}
        />
        <KeyValue label="Posts" value={formatNumber(profile.postsCount)} />
      </dl>
    </ToolCard>
  )
}

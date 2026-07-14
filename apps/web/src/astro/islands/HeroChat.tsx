import { Check } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'

/**
 * Hero showpiece: a local agent session that drafts, schedules, and publishes
 * through ilo. The first turn renders on load; everything after types out.
 */
const CLAUDE_ORANGE = '#D97757'

type Chart = { data: { label: string; value: number }[]; highlight?: number[] }

type Msg = {
  role: 'user' | 'agent'
  text?: string
  /** ilo queries this turn runs, shown inline then collapsed to a summary. */
  tools?: string[]
  bullets?: string[]
  chart?: Chart
  insight?: { title: string; body: string }
  action?: string
}

const SCRIPT: Msg[] = [
  {
    role: 'user',
    text: 'Draft a post about shipping v2. Keep it local and do not publish it.',
  },
  {
    role: 'agent',
    tools: ['checking the connected X account', 'creating a local draft'],
    text: 'Saved locally. Nothing was sent to X.',
    bullets: [
      'We shipped v2 today.',
      'It is faster, simpler, and built around the way people actually use it.',
      'Here is what changed and why.',
    ],
    action: 'Draft saved on this machine',
  },
  { role: 'user', text: 'Schedule that for tomorrow at 9am.' },
  {
    role: 'agent',
    tools: [
      'finding the draft',
      'parsing your local time',
      'saving the schedule',
    ],
    text: 'The draft is queued for tomorrow at 09:00 in your local timezone. The scheduler can publish it when it becomes due.',
    insight: {
      title: 'Scheduled locally',
      body: 'The queue lives in your local SQLite database. No ilo account or hosted service is involved.',
    },
    action: 'Added to the local queue',
  },
  { role: 'user', text: 'Actually, publish it now.' },
  {
    role: 'agent',
    tools: ['loading the scheduled draft'],
    text: 'This will post to your connected X account. I need your explicit confirmation before ilo can publish it.',
    action: 'Waiting for confirmation',
  },
  { role: 'user', text: 'Confirmed. Publish that exact draft.' },
  {
    role: 'agent',
    tools: ['checking confirmation', 'publishing through your X connection'],
    text: 'Published. ilo recorded the post ID and the successful attempt in your local database.',
    action: 'Published to X',
  },
  {
    role: 'user',
    text: 'What else is waiting in my queue?',
  },
  {
    role: 'agent',
    tools: ['listing local drafts'],
    text: 'There are two drafts left: one unscheduled idea and one post due Friday afternoon.',
    bullets: ['Launch notes — draft', 'What v2 taught us — Friday at 16:30'],
  },
  {
    role: 'user',
    text: 'Run anything that is due, but show me before it posts.',
  },
  {
    role: 'agent',
    tools: ['checking the local schedule'],
    text: 'Nothing is due right now. I did not publish anything. The next post is still queued for Friday at 16:30.',
    action: 'No changes made',
  },
  { role: 'user', text: 'How do I add ilo to another coding agent?' },
  {
    role: 'agent',
    tools: ['checking the local MCP command'],
    text: 'Run ilo as a local stdio MCP server. Your agent talks to the process on this machine, so there is no remote login or ilo API key.',
    insight: {
      title: 'Codex',
      body: 'codex mcp add ilo -- iloso mcp serve',
    },
  },
]

const INIT = 2 // first turn (user + agent) shown on load, untyped
const ALL_BULLETS = Number.POSITIVE_INFINITY
const APPEAR = 'animate-[fade-slide-in_0.4s_ease-out]'

function ThinkingDots() {
  return (
    <span className="grid grid-cols-3 gap-[3px]">
      {[1.4, 1.1, 1.6, 1.3, 1.8, 1, 1.5, 1.2, 1.7].map((d, i) => (
        <span
          key={d}
          className="size-[3px] rounded-full bg-muted-foreground"
          style={{
            animation: `braille-pulse ${d}s ease-in-out ${(i % 5) * 0.15}s infinite`,
          }}
        />
      ))}
    </span>
  )
}

function Caret() {
  return (
    <span className="ml-0.5 inline-block h-3.5 w-px translate-y-[2px] animate-pulse bg-current align-baseline" />
  )
}

function AgentMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`rounded-full ${className ?? ''}`}
      style={{ backgroundColor: CLAUDE_ORANGE }}
    />
  )
}

/** Bars use explicit pixel heights so they render regardless of flex sizing. */
function BarChart({ data, highlight = [] }: Chart) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const TRACK = 92
  return (
    <div className="flex items-end gap-2">
      {data.map((d, i) => {
        const on = highlight.includes(i)
        return (
          <div
            key={d.label}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <div
              className={`w-full rounded-sm ${on ? 'bg-primary' : 'bg-muted-foreground/20'}`}
              style={{
                height: Math.max(6, Math.round((d.value / max) * TRACK)),
              }}
            />
            <span
              className={`text-[10px] ${on ? 'font-medium text-primary' : 'text-muted-foreground'}`}
            >
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** The inline ilo tool runner: one active row while running, then a summary. */
function ToolRun({
  tools,
  active,
  done,
}: {
  tools: string[]
  /** index of the currently running query (only used while not done) */
  active: number
  done: boolean
}) {
  // Once done, the summary sits flush left, aligned with the answer text below.
  // While running, the dots lead the query name.
  if (done) {
    return (
      <div className="flex items-center text-muted-foreground text-sm">
        Used {tools.length} local ilo {tools.length === 1 ? 'tool' : 'tools'}
      </div>
    )
  }
  const name = tools[Math.min(active, tools.length - 1)]
  return (
    <div className="flex items-center gap-2 text-sm">
      <ThinkingDots />
      <span className="text-secondary-foreground">{name}</span>
    </div>
  )
}

export function HeroChat() {
  const [shown, setShown] = useState(INIT)
  const [typed, setTyped] = useState<string | null>(null)
  const [extras, setExtras] = useState(true)
  // False only on first load, where the opening turn renders fully untyped.
  // Once the loop starts, the active turn's text follows `typed` so it never
  // flashes the full string before typing.
  const [animating, setAnimating] = useState(false)
  // Active agent turn's query runner. null on user turns / before tools start.
  const [toolRun, setToolRun] = useState<{ idx: number; done: boolean } | null>(
    null,
  )
  // Bullet typing for the active turn: how many are fully shown, plus the one
  // currently typing. ALL_BULLETS means "show every bullet" (initial/historical
  // turns that aren't being typed out).
  const [bulletsShown, setBulletsShown] = useState(ALL_BULLETS)
  const [typedBullet, setTypedBullet] = useState<string | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let cancelled = false
    const timers = new Set<number>()
    const sleep = (ms: number) =>
      new Promise<void>((res) => {
        const id = window.setTimeout(() => {
          timers.delete(id)
          res()
        }, ms)
        timers.add(id)
      })

    // One typewriter for any line; bullets reuse it via their own setter so the
    // whole demo types at one steady speed.
    const typeInto = async (full: string, set: (s: string) => void) => {
      for (let i = 1; i <= full.length; i++) {
        if (cancelled) return
        set(full.slice(0, i))
        await sleep(full[i - 1] === ' ' ? 12 : 22)
      }
    }
    const type = (full: string) => typeInto(full, setTyped)

    const play = async () => {
      // Continuous feed: never collapse the list. Reveal the next message and
      // loop through the script by index forever. Only the most recent turns
      // render; older ones fade off the top and unmount, so it reads as one
      // ongoing session rather than restarting.
      let n = INIT
      await sleep(2600)
      setAnimating(true)
      while (!cancelled) {
        const m = SCRIPT[n % SCRIPT.length]
        if (m.role === 'user') {
          setExtras(false)
          setToolRun(null)
          setBulletsShown(0)
          setTypedBullet(null)
          setTyped('')
          setShown(n + 1)
          await type(m.text ?? '')
          await sleep(1000)
        } else {
          setExtras(false)
          setTyped(null)
          setBulletsShown(0)
          setTypedBullet(null)
          setShown(n + 1)
          // Run each ilo query inline, one row replacing the last. A touch
          // slower than reading speed so each one is legible.
          const tools = m.tools ?? []
          for (let i = 0; i < tools.length; i++) {
            if (cancelled) return
            setToolRun({ idx: i, done: false })
            await sleep(950)
          }
          if (cancelled) return
          setToolRun({ idx: tools.length - 1, done: true })
          await sleep(550)
          // Type the answer, then keep typing straight into the bullets so the
          // whole reply reads as one continuous stream (no pop-in, no gap). The
          // chart fades in alongside the bullets on chart turns.
          setTyped('')
          await type(m.text ?? '')
          setExtras(true)
          const bullets = m.bullets ?? []
          if (bullets.length > 0) {
            for (let bi = 0; bi < bullets.length; bi++) {
              if (cancelled) return
              setBulletsShown(bi)
              setTypedBullet('')
              await typeInto(bullets[bi], setTypedBullet)
              setTypedBullet(null)
              setBulletsShown(bi + 1)
              await sleep(160)
            }
          } else {
            setBulletsShown(ALL_BULLETS)
          }
          const dwell = 1600 + (m.chart ? 900 : 0) + (m.insight ? 2400 : 0)
          await sleep(dwell)
        }
        n++
      }
    }

    play()
    return () => {
      cancelled = true
      for (const id of timers) clearTimeout(id)
    }
  }, [])

  // Render only the most recent turns; older ones have faded off the top.
  const WINDOW = 9
  const indices: number[] = []
  for (let a = Math.max(0, shown - WINDOW); a < shown; a++) indices.push(a)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_8px_44px_-12px_rgba(0,0,0,0.1)] [contain:layout]">
      {/* Title bar with no divider line, kept clean. */}
      <div className="flex items-center gap-3 px-6 py-4">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-border" />
          <span className="size-3 rounded-full bg-border" />
          <span className="size-3 rounded-full bg-border" />
        </div>
        <span className="text-muted-foreground text-sm font-medium">
          Social media agent
        </span>
      </div>

      {/* Conversation is bottom-anchored, so the latest turn stays in view. The top
          fades out (like keep's feed) so scrolled-up turns don't hard-cut.
          overflow-anchor:none stops the browser from nudging the page scroll
          as turns are added and removed inside this region (scroll anchoring). */}
      <div
        className="flex h-[360px] flex-col justify-end gap-7 overflow-hidden px-6 pt-10 pb-8 [overflow-anchor:none]"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0, #000 64px)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0, #000 64px)',
        }}
      >
        {indices.map((a) => {
          const m = SCRIPT[a % SCRIPT.length]
          const isActive = a === shown - 1
          const full = m.text ?? ''
          // Non-active turns show full text. The active turn shows the typed
          // slice once animating (empty while a tool runs), or the full text on
          // the untyped first-load turn. The line is never cleared, so once the
          // typed slice reaches the full text it just stays put.
          const text = !isActive ? m.text : animating ? (typed ?? '') : full
          // Caret only while this line is still mid-type (a strict prefix).
          const typingNow =
            isActive && animating && typed !== null && typed !== full
          const showExtras = !isActive || extras
          const key = a

          if (m.role === 'user') {
            return (
              <div key={key} className={`flex gap-3 ${APPEAR}`}>
                <span className="mt-0.5 size-5 shrink-0 rounded-full bg-muted" />
                <p className="text-foreground text-sm leading-relaxed">
                  {text}
                  {typingNow && <Caret />}
                </p>
              </div>
            )
          }

          // While the active agent turn is still running its queries, show only
          // the inline runner; hold the answer until they finish.
          const running = isActive && toolRun !== null && !toolRun.done
          const tools = m.tools ?? []

          return (
            <div key={key} className={`flex gap-3 ${APPEAR}`}>
              <AgentMark className="mt-0.5 size-5 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                {tools.length > 0 ? (
                  <ToolRun
                    tools={tools}
                    active={
                      isActive && toolRun ? toolRun.idx : tools.length - 1
                    }
                    done={!isActive || (toolRun?.done ?? true)}
                  />
                ) : null}

                {!running && (
                  <div className="flex flex-col gap-3.5">
                    {text ? (
                      <p className="text-secondary-foreground text-sm leading-relaxed">
                        {text}
                        {typingNow && <Caret />}
                      </p>
                    ) : null}

                    {showExtras && m.chart ? (
                      <div className={APPEAR}>
                        <BarChart
                          data={m.chart.data}
                          highlight={m.chart.highlight}
                        />
                      </div>
                    ) : null}

                    {showExtras && m.bullets ? (
                      <ul className="flex flex-col gap-2">
                        {m.bullets.map((b, bi) => {
                          // On the active turn, reveal bullets as they type; the
                          // one at `bulletsShown` is mid-type, later ones wait.
                          const typingThis =
                            isActive &&
                            bi === bulletsShown &&
                            typedBullet !== null
                          if (isActive && !typingThis && bi >= bulletsShown) {
                            return null
                          }
                          return (
                            <li
                              key={b}
                              className="flex items-start gap-2.5 text-sm"
                            >
                              <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                              <span className="text-secondary-foreground">
                                {typingThis ? typedBullet : b}
                                {typingThis && <Caret />}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    ) : null}

                    {showExtras && m.insight ? (
                      <div className={`rounded-lg bg-muted/60 p-4 ${APPEAR}`}>
                        <p className="font-medium text-foreground text-sm">
                          {m.insight.title}
                        </p>
                        <p className="mt-2 text-secondary-foreground text-sm leading-relaxed">
                          {m.insight.body}
                        </p>
                      </div>
                    ) : null}

                    {showExtras && m.action ? (
                      <div
                        className={`flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary text-sm ${APPEAR}`}
                      >
                        <Check weight="bold" className="size-3.5" />
                        {m.action}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

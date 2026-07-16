import { spawn } from 'node:child_process'
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import {
  type FollowerSyncState,
  getXFollowerProfile,
  getXFollowersStatus,
  iloHome,
  normalizeXHandle,
  searchXFollowers,
  syncAllXFollowers,
  syncXFollowers,
} from '@ilo/core'
import { defineCommand } from 'citty'
import { printJson, printLine } from '../utils.js'
import {
  followerCoverageLines,
  renderFollowerSearch,
  writeFollowerSearchCsv,
} from './follower-output.js'

const BACKGROUND_WORKER_ENV = 'ILO_X_FOLLOWER_BACKGROUND_WORKER'

type BackgroundFollowerJob = {
  pid: number
  handle: string
  logPath: string
  startedAt: number
}

const followerJobPaths = (handle: string) => {
  const directory = join(iloHome(), 'followers')
  return {
    directory,
    pidPath: join(directory, `${handle.toLowerCase()}.pid.json`),
    logPath: join(directory, `${handle.toLowerCase()}.log`),
  }
}

const processIsRunning = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const readBackgroundFollowerJob = (
  handle: string,
): BackgroundFollowerJob | null => {
  const { pidPath } = followerJobPaths(handle)
  try {
    const job = JSON.parse(
      readFileSync(pidPath, 'utf8'),
    ) as BackgroundFollowerJob
    if (Number.isInteger(job.pid) && job.pid > 0 && processIsRunning(job.pid)) {
      return job
    }
    rmSync(pidPath, { force: true })
    return null
  } catch {
    rmSync(pidPath, { force: true })
    return null
  }
}

const startBackgroundFollowerSync = (handle: string, restart: boolean) => {
  const normalizedHandle = normalizeXHandle(handle)
  const existing = readBackgroundFollowerJob(normalizedHandle)
  if (existing) throw new Error('follower_sync_already_running')
  const script = process.argv[1]
  if (!script) throw new Error('background_follower_sync_unavailable')
  const { directory, pidPath, logPath } = followerJobPaths(normalizedHandle)
  mkdirSync(directory, { recursive: true })
  const startedAt = Date.now()
  try {
    writeFileSync(
      pidPath,
      `${JSON.stringify({
        pid: process.pid,
        handle: normalizedHandle,
        logPath,
        startedAt,
      })}\n`,
      { flag: 'wx', mode: 0o600 },
    )
  } catch {
    throw new Error('follower_sync_already_running')
  }
  let log: number
  try {
    log = openSync(logPath, 'a')
  } catch (error) {
    rmSync(pidPath, { force: true })
    throw error
  }
  let child: ReturnType<typeof spawn>
  try {
    child = spawn(
      process.execPath,
      [
        script,
        'x',
        'followers',
        'sync',
        normalizedHandle,
        '--all',
        ...(restart ? ['--restart'] : []),
      ],
      {
        detached: true,
        env: { ...process.env, [BACKGROUND_WORKER_ENV]: '1' },
        stdio: ['ignore', log, log],
      },
    )
  } catch (error) {
    rmSync(pidPath, { force: true })
    throw error
  } finally {
    closeSync(log)
  }
  if (!child.pid) {
    rmSync(pidPath, { force: true })
    throw new Error('background_follower_sync_failed')
  }
  const job: BackgroundFollowerJob = {
    pid: child.pid,
    handle: normalizedHandle,
    logPath,
    startedAt,
  }
  writeFileSync(pidPath, `${JSON.stringify(job)}\n`, { mode: 0o600 })
  child.unref()
  return job
}

const finishBackgroundFollowerSync = (handle: string) => {
  if (process.env[BACKGROUND_WORKER_ENV] !== '1') return
  const { pidPath } = followerJobPaths(handle)
  try {
    const job = JSON.parse(
      readFileSync(pidPath, 'utf8'),
    ) as BackgroundFollowerJob
    if (job.pid === process.pid) rmSync(pidPath, { force: true })
  } catch {
    // A stale or already removed job file needs no cleanup.
  }
}

const integerArg = (
  value: unknown,
  input: { name: string; minimum: number; maximum: number },
) => {
  const parsed = Number(value)
  if (
    !Number.isInteger(parsed) ||
    parsed < input.minimum ||
    parsed > input.maximum
  ) {
    throw new Error(
      `${input.name}_must_be_${input.minimum}_to_${input.maximum}`,
    )
  }
  return parsed
}

const followerSyncError = (error: unknown) => {
  if (
    error instanceof Error &&
    error.message === 'fxtwitter_follower_sync_no_progress'
  ) {
    return new Error(
      'Follower import stopped after 25 pages added no new profiles. Saved progress is still available.',
    )
  }
  return error
}

export const followersCommand = defineCommand({
  meta: {
    name: 'followers',
    description: 'Import and search public X followers',
  },
  subCommands: {
    sync: defineCommand({
      meta: {
        name: 'sync',
        description: 'Import public followers into the local search index',
      },
      args: {
        handle: {
          type: 'positional',
          required: true,
          description: 'Public X handle.',
        },
        pages: {
          type: 'string',
          default: '20',
          description: 'Pages to fetch before saving progress and returning.',
        },
        all: {
          type: 'boolean',
          default: false,
          description: 'Continue until the full public follower list is read.',
        },
        background: {
          type: 'boolean',
          default: false,
          description:
            'Run the full resumable import in a detached local process.',
        },
        restart: {
          type: 'boolean',
          default: false,
          description: 'Start a new full sync instead of resuming.',
        },
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        if (args.background) {
          const job = startBackgroundFollowerSync(
            String(args.handle),
            args.restart,
          )
          if (args.json) return printJson({ job })
          return printLine(
            `Started the full @${job.handle} follower import in the background (PID ${job.pid}). Progress: ${job.logPath}`,
          )
        }
        const maxPages = args.all
          ? 10_000
          : integerArg(args.pages, {
              name: 'pages',
              minimum: 1,
              maximum: 10_000,
            })
        const syncInput = {
          handle: String(args.handle),
          restart: args.restart,
          onPage: args.json
            ? undefined
            : (progress: FollowerSyncState) => {
                if (progress.complete || progress.pagesFetched % 25 === 0) {
                  printLine(
                    `Read ${progress.pagesFetched} pages and ${progress.importedProfiles} unique profiles.`,
                  )
                }
              },
        }
        let state: FollowerSyncState
        try {
          state = args.all
            ? await syncAllXFollowers(syncInput)
            : await syncXFollowers({ ...syncInput, maxPages })
        } catch (error) {
          throw followerSyncError(error)
        } finally {
          finishBackgroundFollowerSync(normalizeXHandle(String(args.handle)))
        }
        if (args.json) return printJson(state)
        if (state.complete) {
          return printLine(
            `Follower sync complete for @${state.handle}: ${state.importedProfiles.toLocaleString('en-GB')} profiles are searchable.`,
          )
        }
        return printLine(
          `Saved ${state.importedProfiles.toLocaleString('en-GB')} searchable follower profiles for @${state.handle}. Run the same command again to continue.`,
        )
      },
    }),
    status: defineCommand({
      meta: {
        name: 'status',
        description: 'Show local follower import coverage',
      },
      args: {
        handle: {
          type: 'positional',
          required: true,
          description: 'Public X handle.',
        },
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: ({ args }) => {
        const state = getXFollowersStatus({ handle: String(args.handle) })
        const handle = normalizeXHandle(String(args.handle))
        const job = readBackgroundFollowerJob(handle)
        if (args.json) return printJson({ sync: state, backgroundJob: job })
        if (!state) {
          printLine(
            `No follower data for @${String(args.handle).replace(/^@/, '')}.`,
          )
          if (job) {
            printLine(
              `Background import starting as PID ${job.pid}. Progress: ${job.logPath}`,
            )
          }
          return
        }
        printLine(`Follower data for @${state.handle}`)
        for (const line of followerCoverageLines(state, state.handle, {
          showResume: !job,
        })) {
          printLine(line)
        }
        if (job) {
          printLine(
            `Background import running as PID ${job.pid}. Progress: ${job.logPath}`,
          )
        }
        if (
          state.lastError &&
          ![
            'fxtwitter_follower_sync_no_progress',
            'fxtwitter_follower_cursor_stalled',
          ].includes(state.lastError)
        ) {
          printLine(`Last import error: ${state.lastError}`)
        }
      },
    }),
    profile: defineCommand({
      meta: {
        name: 'profile',
        description: 'Read a complete imported public follower profile',
      },
      args: {
        handle: {
          type: 'positional',
          required: true,
          description: 'Public X handle whose followers were imported.',
        },
        follower: {
          type: 'positional',
          required: true,
          description: 'Follower handle to inspect.',
        },
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON including raw FxTwitter data.',
        },
      },
      run: ({ args }) => {
        const result = getXFollowerProfile({
          handle: String(args.handle),
          followerHandle: String(args.follower),
        })
        if (args.json) return printJson(result)
        const { profile } = result
        printLine(`${profile.name} (@${profile.handle})`)
        if (profile.bio) printLine(profile.bio)
        if (profile.location) printLine(`Location: ${profile.location}`)
        if (profile.websiteUrl) {
          printLine(
            `Website: ${profile.websiteDisplayUrl ?? profile.websiteUrl} (${profile.websiteUrl})`,
          )
        }
        printLine(
          `Followers: ${profile.followers ?? 'unknown'}  Following: ${profile.following ?? 'unknown'}  Posts: ${profile.posts ?? 'unknown'}  Likes: ${profile.likes ?? 'unknown'}  Media: ${profile.mediaCount ?? 'unknown'}`,
        )
        if (profile.joinedAt) printLine(`Joined: ${profile.joinedAt}`)
        printLine(
          `Verified: ${profile.verified ? (profile.verificationType ?? 'yes') : 'no'}  Protected: ${profile.protected ? 'yes' : 'no'}`,
        )
        printLine(`Profile: ${profile.profileUrl}`)
        if (!result.coverage.complete) {
          for (const line of followerCoverageLines(
            result.coverage,
            result.handle,
          )) {
            printLine(line)
          }
        }
      },
    }),
    search: defineCommand({
      meta: {
        name: 'search',
        description:
          'Search imported follower names, handles, bios, and locations',
      },
      args: {
        handle: {
          type: 'positional',
          required: true,
          description: 'Public X handle.',
        },
        query: {
          type: 'string',
          required: true,
          description:
            'Question or pipe-separated terms such as "works at cursor|vercel".',
        },
        limit: {
          type: 'string',
          description:
            'Maximum listed profiles for each term. Omit to return them all.',
        },
        'include-former': {
          type: 'boolean',
          default: false,
          description: 'List former matches as well as current matches.',
        },
        'include-unclear': {
          type: 'boolean',
          default: false,
          description: 'List unclear matches as well as current matches.',
        },
        candidates: {
          type: 'string',
          default: '10000',
          description: 'Maximum matching profiles to classify for each term.',
        },
        csv: {
          type: 'string',
          description:
            'Write listed matches and their public profile fields to CSV.',
        },
        json: {
          type: 'boolean',
          default: false,
          description: 'Print structured JSON.',
        },
      },
      run: async ({ args }) => {
        const includeFormer = Boolean(args['include-former'])
        const includeUnclear = Boolean(args['include-unclear'])
        const resultLimit =
          typeof args.limit === 'string'
            ? integerArg(args.limit, {
                name: 'limit',
                minimum: 1,
                maximum: 10_000,
              })
            : undefined
        const candidateLimit = Math.max(
          resultLimit ?? 1,
          integerArg(args.candidates, {
            name: 'candidates',
            minimum: 1,
            maximum: 10_000,
          }),
        )
        const result = searchXFollowers({
          handle: String(args.handle),
          query: String(args.query),
          resultLimit,
          candidateLimit,
          includeFormer,
          includeUnclear,
        })
        const requestedCsv = typeof args.csv === 'string' ? args.csv.trim() : ''
        let csvExport: Awaited<
          ReturnType<typeof writeFollowerSearchCsv>
        > | null = null
        if (requestedCsv) {
          const exportResult = searchXFollowers({
            handle: String(args.handle),
            query: String(args.query),
            candidateLimit,
            includeFormer,
            includeUnclear,
          })
          csvExport = await writeFollowerSearchCsv(exportResult, requestedCsv)
        }
        if (args.json) {
          return printJson(csvExport ? { ...result, csvExport } : result)
        }
        printLine(renderFollowerSearch(result))
        if (csvExport) {
          printLine()
          printLine(
            `Wrote ${csvExport.rows.toLocaleString('en-GB')} matches to ${csvExport.path}`,
          )
        }
      },
    }),
  },
})

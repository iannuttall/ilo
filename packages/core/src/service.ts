import { createXPost, refreshXToken } from './providers/x/client.js'
import { validateXPostText } from './providers/x/text.js'
import { parseScheduleTime } from './scheduling/parse.js'
import {
  readConfig,
  readXCredentials,
  saveXCredentials,
} from './storage/config.js'
import {
  claimDraftRecord,
  claimDueDraftRecords,
  createDraftRecord,
  type Draft,
  finishDraftPublish,
  getDraftRecord,
  listDraftRecords,
  scheduleDraftRecord,
} from './storage/database.js'

export const createDraft = (body: string) => {
  const text = body.trim()
  const validation = validateXPostText(text)
  if (!validation.ok)
    throw new Error(
      `x_post_text_invalid:${validation.weighted}/${validation.limit}`,
    )
  return createDraftRecord(text)
}

export const listDrafts = () => listDraftRecords()
export const getDraft = (id: string) => getDraftRecord(id.trim())

export const scheduleDraft = async (id: string, value: string) => {
  const config = await readConfig()
  const parsed = parseScheduleTime(value, { timezone: config.timezone })
  if (!parsed.ok) throw new Error(parsed.code)
  if (parsed.scheduledFor <= Date.now())
    throw new Error('schedule_time_must_be_future')
  return scheduleDraftRecord(id.trim(), parsed.scheduledFor)
}

const freshXCredentials = async () => {
  const credentials = await readXCredentials()
  if (credentials.expiresAt > Date.now() + 60_000) return credentials
  if (!credentials.refreshToken) throw new Error('x_refresh_token_missing')
  const tokens = await refreshXToken({
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    refreshToken: credentials.refreshToken,
  })
  const next = {
    ...credentials,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? credentials.refreshToken,
    expiresAt: tokens.expiresAt,
    scopes: tokens.scopes || credentials.scopes,
  }
  await saveXCredentials(next)
  return next
}

const publishClaimedDraft = async (draft: Draft) => {
  try {
    const credentials = await freshXCredentials()
    const published = await createXPost(credentials.accessToken, draft.body)
    finishDraftPublish({
      id: draft.id,
      ok: true,
      providerPostId: published.providerPostId,
      providerUrl: published.providerUrl,
    })
    return { draftId: draft.id, ...published }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    finishDraftPublish({ id: draft.id, ok: false, error: message })
    throw error
  }
}

export const publishDraft = (id: string) =>
  publishClaimedDraft(claimDraftRecord(id.trim()))

export const publishPost = async (body: string) => {
  const draft = createDraft(body)
  return publishDraft(draft.id)
}

export const runScheduler = async (
  input: { now?: number; limit?: number } = {},
) => {
  const drafts = claimDueDraftRecords(input.now, input.limit)
  const published = []
  const failed = []
  for (const draft of drafts) {
    try {
      published.push(await publishClaimedDraft(draft))
    } catch (error) {
      failed.push({
        draftId: draft.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return { checked: drafts.length, published, failed }
}

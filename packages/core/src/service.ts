import { normalizeXPostId } from './providers/x/client.js'
import { normalizeXPostImages, type XPostImage } from './providers/x/media.js'
import { validateXPostText } from './providers/x/text.js'
import { publishDraftThroughAccount } from './publishing/delivery.js'
import { parseScheduleTime } from './scheduling/parse.js'
import {
  findPublishingAccount,
  getPublishingAccount,
} from './storage/accounts.js'
import type { PublishingAccount } from './storage/config.js'
import { readConfig } from './storage/config.js'
import {
  bindDraftPublishingAccountRecord,
  bindUnassignedDraftRecords,
  claimDraftRecord,
  claimDueDraftRecords,
  createDraftRecord,
  type Draft,
  finishDraftPublish,
  getDraftRecord,
  listDraftRecords,
  scheduleDraftRecord,
} from './storage/database.js'
import { markInboxItemRepliedRecord } from './storage/inbox.js'

export type XPostOptions = {
  replyToPostId?: string
  images?: XPostImage[]
  account?: string | null
}

export type PublishingAccountOptions = {
  account?: string
}

const accountTarget = (account: PublishingAccount) => ({
  id: account.id,
  provider: account.provider,
  username: account.username,
})

const normalizePostOptions = (options: XPostOptions = {}) => ({
  replyToPostId: options.replyToPostId
    ? normalizeXPostId(options.replyToPostId)
    : undefined,
  images: normalizeXPostImages(options.images),
})

const accountForNewDraft = async (selector?: string | null) => {
  if (selector === null) return null
  if (selector?.trim()) return getPublishingAccount(selector)
  return findPublishingAccount()
}

export const createDraft = async (body: string, options: XPostOptions = {}) => {
  const text = body.trim()
  const validation = validateXPostText(text)
  if (!validation.ok) {
    throw new Error(
      `x_post_text_invalid:${validation.weighted}/${validation.limit}`,
    )
  }
  const publishingAccount = await accountForNewDraft(options.account)
  return createDraftRecord(text, {
    ...normalizePostOptions(options),
    ...(publishingAccount
      ? { publishingAccount: accountTarget(publishingAccount) }
      : {}),
  })
}

export const listDrafts = () => listDraftRecords()
export const getDraft = (id: string) => getDraftRecord(id.trim())

export const resolveDraftPublishingAccount = async (
  draftOrId: Draft | string,
  selector?: string,
) => {
  const draft = typeof draftOrId === 'string' ? getDraft(draftOrId) : draftOrId
  if (draft.publishingAccount) {
    const account = await getPublishingAccount(
      draft.publishingAccount.id,
    ).catch((error) => {
      if (
        error instanceof Error &&
        error.message === 'publishing_account_not_found'
      ) {
        throw new Error('draft_publishing_account_unavailable')
      }
      throw error
    })
    if (selector) {
      const requested = await getPublishingAccount(selector)
      if (requested.id !== account.id) {
        throw new Error('draft_publishing_account_mismatch')
      }
    }
    return account
  }
  return getPublishingAccount(selector)
}

const bindDraftAccount = async (id: string, selector?: string) => {
  const draft = getDraft(id)
  const account = await resolveDraftPublishingAccount(draft, selector)
  if (draft.publishingAccount) return { draft, account }
  return {
    draft: bindDraftPublishingAccountRecord(id, accountTarget(account)),
    account,
  }
}

export const scheduleDraft = async (
  id: string,
  value: string,
  options: PublishingAccountOptions = {},
) => {
  const config = await readConfig()
  const parsed = parseScheduleTime(value, { timezone: config.timezone })
  if (!parsed.ok) throw new Error(parsed.code)
  if (parsed.scheduledFor <= Date.now()) {
    throw new Error('schedule_time_must_be_future')
  }
  const bound = await bindDraftAccount(id.trim(), options.account)
  return scheduleDraftRecord(bound.draft.id, parsed.scheduledFor)
}

const publishClaimedDraft = async (
  draft: Draft,
  account: PublishingAccount,
) => {
  try {
    const published = await publishDraftThroughAccount(draft, account)
    finishDraftPublish({
      id: draft.id,
      ok: true,
      provider: account.provider,
      publishingAccountId: account.id,
      providerPostId: published.providerPostId,
      providerUrl: published.providerUrl,
    })
    if (draft.replyToPostId) {
      try {
        markInboxItemRepliedRecord({
          accountHandle: account.username,
          postId: draft.replyToPostId,
        })
      } catch {
        // A published reply must not be reported as failed because local inbox
        // state could not be updated.
      }
    }
    return { draftId: draft.id, ...published }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    finishDraftPublish({
      id: draft.id,
      ok: false,
      provider: account.provider,
      publishingAccountId: account.id,
      error: message,
    })
    throw error
  }
}

export const publishDraft = async (
  id: string,
  options: PublishingAccountOptions = {},
) => {
  const bound = await bindDraftAccount(id.trim(), options.account)
  return publishClaimedDraft(claimDraftRecord(bound.draft.id), bound.account)
}

export const publishPost = async (body: string, options: XPostOptions = {}) => {
  const draft = await createDraft(body, options)
  return publishDraft(draft.id, {
    ...(draft.publishingAccount
      ? { account: draft.publishingAccount.id }
      : options.account
        ? { account: options.account }
        : {}),
  })
}

export const runScheduler = async (
  input: { now?: number; limit?: number } = {},
) => {
  const defaultAccount = await findPublishingAccount()
  if (defaultAccount) {
    bindUnassignedDraftRecords(accountTarget(defaultAccount))
  }
  const drafts = claimDueDraftRecords(input.now, input.limit)
  const published = []
  const failed = []
  for (const draft of drafts) {
    try {
      const account = await resolveDraftPublishingAccount(draft)
      published.push(await publishClaimedDraft(draft, account))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (
        draft.publishingAccount &&
        getDraftRecord(draft.id).status === 'publishing'
      ) {
        finishDraftPublish({
          id: draft.id,
          ok: false,
          provider: draft.publishingAccount.provider,
          publishingAccountId: draft.publishingAccount.id,
          error: message,
        })
      }
      failed.push({ draftId: draft.id, error: message })
    }
  }
  return { checked: drafts.length, published, failed }
}

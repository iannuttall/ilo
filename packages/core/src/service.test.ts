import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test, { mock } from 'node:test'
import {
  createDraft,
  getDraft,
  publishDraft,
  scheduleDraft,
} from './service.js'
import {
  saveTypefullyCredentials,
  setDefaultPublishingAccount,
} from './storage/accounts.js'
import { setKeyringForTests } from './storage/keyring.js'

test('publishes a draft through its bound account after the default changes', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-service-accounts-'))
  const previousHome = process.env.ILO_HOME
  process.env.ILO_HOME = directory
  const secrets = new Map<string, string>()
  setKeyringForTests({
    getPassword: async (service, account) =>
      secrets.get(`${service}:${account}`) ?? null,
    setPassword: async (service, account, password) => {
      secrets.set(`${service}:${account}`, password)
    },
    deletePassword: async (service, account) =>
      secrets.delete(`${service}:${account}`),
  })
  const requests: string[] = []
  mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = String(input)
    requests.push(url)
    return Response.json({
      id: 100,
      status: 'published',
      publish_state: 'finished',
      x_published_url: 'https://x.com/personal/status/789',
    })
  })

  try {
    const accounts = await saveTypefullyCredentials({
      apiKey: 'typefully-key',
      credentialId: '7',
      accounts: [
        {
          socialSetId: 10,
          username: 'personal',
          displayName: 'Personal',
        },
        {
          socialSetId: 20,
          username: 'company',
          displayName: 'Company',
        },
      ],
      makeDefault: true,
    })
    const draft = await createDraft('This stays personal')
    assert.equal(draft.publishingAccount?.id, accounts[0]?.id)

    await setDefaultPublishingAccount(accounts[1]?.id ?? '')
    await assert.rejects(
      publishDraft(draft.id, { account: accounts[1]?.id }),
      /draft_publishing_account_mismatch/,
    )
    assert.equal(requests.length, 0)

    const unassigned = await createDraft('Choose the account later', {
      account: null,
    })
    assert.equal(unassigned.publishingAccount, null)
    const scheduled = await scheduleDraft(
      unassigned.id,
      new Date(Date.now() + 3_600_000).toISOString(),
      { account: accounts[1]?.id },
    )
    assert.equal(scheduled.publishingAccount?.id, accounts[1]?.id)

    const published = await publishDraft(draft.id)

    assert.equal(published.account.id, accounts[0]?.id)
    assert.equal(published.provider, 'typefully')
    assert.equal(
      requests.some((url) => url.endsWith('/v2/social-sets/10/drafts')),
      true,
    )
    assert.equal(
      requests.some((url) => url.includes('/v2/social-sets/20/')),
      false,
    )
    assert.equal(getDraft(draft.id).status, 'published')
  } finally {
    mock.restoreAll()
    setKeyringForTests()
    if (previousHome === undefined) delete process.env.ILO_HOME
    else process.env.ILO_HOME = previousHome
    rmSync(directory, { recursive: true, force: true })
  }
})

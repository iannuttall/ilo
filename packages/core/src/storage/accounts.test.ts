import assert from 'node:assert/strict'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  findPublishingAccountForXHandle,
  getDefaultPublishingAccount,
  getPublishingAccount,
  listPublishingAccounts,
  readTypefullyCredentials,
  readXCredentials,
  removePublishingAccount,
  saveTypefullyCredentials,
  saveXCredentials,
  setDefaultPublishingAccount,
} from './accounts.js'
import { readConfig } from './config.js'
import {
  createDraftRecord,
  getDraftRecord,
  scheduleDraftRecord,
} from './database.js'
import { setKeyringForTests } from './keyring.js'

const testKeyring = () => {
  const secrets = new Map<string, string>()
  return {
    secrets,
    keyring: {
      getPassword: async (service: string, account: string) =>
        secrets.get(`${service}:${account}`) ?? null,
      setPassword: async (
        service: string,
        account: string,
        password: string,
      ) => {
        secrets.set(`${service}:${account}`, password)
      },
      deletePassword: async (service: string, account: string) =>
        secrets.delete(`${service}:${account}`),
    },
  }
}

test('migrates one legacy X account to the multi-account config', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-config-migration-'))
  const previousHome = process.env.ILO_HOME
  process.env.ILO_HOME = directory
  const { keyring, secrets } = testKeyring()
  setKeyringForTests(keyring)
  secrets.set('ilo:x:access-token', 'legacy-access')
  secrets.set('ilo:x:refresh-token', 'legacy-refresh')
  secrets.set('ilo:x:client-secret', 'legacy-secret')
  mkdirSync(directory, { recursive: true })
  writeFileSync(
    join(directory, 'config.json'),
    JSON.stringify({
      version: 1,
      timezone: 'UTC',
      x: {
        clientId: 'client-id',
        accountId: '123',
        username: 'ilodotso',
        displayName: 'ilo',
        scopes: 'tweet.write',
        expiresAt: 123_456,
      },
    }),
  )
  const legacyDraft = createDraftRecord('Created before account migration')

  try {
    const config = await readConfig()
    assert.equal(config.version, 2)
    assert.equal(config.defaultPublishingAccountId, 'x:123')
    assert.equal(config.publishingAccounts[0]?.username, 'ilodotso')
    assert.equal(config.publishingAccounts[0]?.provider, 'x')
    assert.equal(
      JSON.parse(readFileSync(join(directory, 'config.json'), 'utf8')).version,
      2,
    )
    assert.equal((await readXCredentials()).accessToken, 'legacy-access')
    assert.equal(getDraftRecord(legacyDraft.id).publishingAccount?.id, 'x:123')
    await removePublishingAccount('ilodotso')
    assert.equal(secrets.has('ilo:x:access-token'), false)
    assert.equal(secrets.has('ilo:x:refresh-token'), false)
    assert.equal(secrets.has('ilo:x:client-secret'), false)
  } finally {
    setKeyringForTests()
    if (previousHome === undefined) delete process.env.ILO_HOME
    else process.env.ILO_HOME = previousHome
    rmSync(directory, { recursive: true, force: true })
  }
})

test('does not trust malformed publishing account metadata', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-invalid-config-'))
  const previousHome = process.env.ILO_HOME
  process.env.ILO_HOME = directory
  mkdirSync(directory, { recursive: true })
  writeFileSync(
    join(directory, 'config.json'),
    JSON.stringify({
      version: 2,
      timezone: 'UTC',
      defaultPublishingAccountId: 'typefully:7:bad',
      publishingAccounts: [
        {
          id: 'typefully:7:bad',
          alias: 'bad',
          provider: 'typefully',
          platform: 'x',
          username: 'bad',
          displayName: 'Bad',
          socialSetId: 'not-a-number',
          credentialId: '7',
          createdAt: Date.now(),
        },
      ],
    }),
  )

  try {
    const config = await readConfig()
    assert.deepEqual(config.publishingAccounts, [])
    assert.equal(config.defaultPublishingAccountId, undefined)
  } finally {
    if (previousHome === undefined) delete process.env.ILO_HOME
    else process.env.ILO_HOME = previousHome
    rmSync(directory, { recursive: true, force: true })
  }
})

test('stores multiple providers and keeps drafts on their original account', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ilo-accounts-'))
  const previousHome = process.env.ILO_HOME
  process.env.ILO_HOME = directory
  const { keyring, secrets } = testKeyring()
  setKeyringForTests(keyring)

  try {
    const first = await saveXCredentials({
      clientId: 'client-a',
      accessToken: 'token-a',
      refreshToken: 'refresh-a',
      accountId: 'a',
      username: 'personal',
      displayName: 'Personal',
      scopes: 'tweet.write',
      expiresAt: Date.now() + 60_000,
      makeDefault: true,
    })
    const draft = createDraftRecord('Bound before switching')
    const second = await saveXCredentials({
      clientId: 'client-b',
      accessToken: 'token-b',
      accountId: 'b',
      username: 'company',
      displayName: 'Company',
      scopes: 'tweet.write',
      expiresAt: Date.now() + 60_000,
      makeDefault: true,
    })

    assert.equal((await getDefaultPublishingAccount())?.id, second.id)
    assert.equal(getDraftRecord(draft.id).publishingAccount?.id, first.id)
    assert.equal((await readXCredentials(first.id)).accessToken, 'token-a')
    assert.equal((await readXCredentials(second.id)).accessToken, 'token-b')

    const typefully = await saveTypefullyCredentials({
      apiKey: 'typefully-key',
      credentialId: 'typefully-user',
      accounts: [
        {
          socialSetId: 10,
          username: 'personal',
          displayName: 'Personal through Typefully',
        },
        {
          socialSetId: 20,
          username: 'product',
          displayName: 'Product',
        },
      ],
      makeDefault: true,
    })
    assert.equal((await listPublishingAccounts()).length, 4)
    assert.equal(typefully[0]?.alias, 'personal-2')
    assert.equal(
      (await findPublishingAccountForXHandle('personal'))?.id,
      typefully[0]?.id,
    )
    const product = await getPublishingAccount('product')
    assert.equal(product.provider, 'typefully')
    assert.equal(product.provider === 'typefully' && product.socialSetId, 20)

    await setDefaultPublishingAccount('company')
    assert.equal((await getDefaultPublishingAccount())?.id, second.id)

    await removePublishingAccount(product.id)
    assert.equal(
      (await readTypefullyCredentials(typefully[0]?.id ?? '')).apiKey,
      'typefully-key',
    )
    await removePublishingAccount(typefully[0]?.id ?? '')
    assert.equal(
      secrets.has('ilo:publishing:typefully:typefully-user:api-key'),
      false,
    )

    const scheduled = createDraftRecord('Scheduled for company', {
      publishingAccount: {
        id: second.id,
        provider: second.provider,
        username: second.username,
      },
    })
    scheduleDraftRecord(scheduled.id, Date.now() + 60_000)
    await assert.rejects(
      removePublishingAccount(second.id),
      /publishing_account_has_scheduled_drafts/,
    )

    await removePublishingAccount(first.id)
    assert.equal(
      secrets.has(`ilo:publishing:x:${first.accountId}:access-token`),
      false,
    )
  } finally {
    setKeyringForTests()
    if (previousHome === undefined) delete process.env.ILO_HOME
    else process.env.ILO_HOME = previousHome
    rmSync(directory, { recursive: true, force: true })
  }
})

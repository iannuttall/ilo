import {
  type IloConfig,
  normalizePublishingAlias,
  type PublishingAccount,
  readConfig,
  type TypefullyPublishingAccount,
  writeConfig,
  type XPublishingAccount,
} from './config.js'
import {
  bindUnassignedDraftRecords,
  releaseDraftsForPublishingAccountRecord,
} from './database.js'
import {
  deleteKeyringPassword,
  getKeyringPassword,
  setKeyringPassword,
} from './keyring.js'

const KEYRING_SERVICE = 'ilo'
const LEGACY_X_CLIENT_SECRET_ACCOUNT = 'x:client-secret'
const LEGACY_X_ACCESS_TOKEN_ACCOUNT = 'x:access-token'
const LEGACY_X_REFRESH_TOKEN_ACCOUNT = 'x:refresh-token'

const xKeyringAccount = (
  accountId: string,
  secret: 'client-secret' | 'access-token' | 'refresh-token',
) => `publishing:x:${accountId}:${secret}`

const typefullyKeyringAccount = (credentialId: string) =>
  `publishing:typefully:${credentialId}:api-key`

export type XCredentials = XPublishingAccount & {
  clientSecret?: string
  accessToken: string
  refreshToken?: string
}

export type SaveXCredentialsInput = {
  clientId: string
  clientSecret?: string
  accessToken: string
  refreshToken?: string
  accountId: string
  username: string
  displayName: string
  scopes: string
  expiresAt: number
  alias?: string
  makeDefault?: boolean
}

export type TypefullyAccountInput = {
  socialSetId: number
  username: string
  displayName: string
  alias?: string
}

export type SaveTypefullyCredentialsInput = {
  apiKey: string
  credentialId: string
  accounts: TypefullyAccountInput[]
  makeDefault?: boolean
}

export type TypefullyCredentials = {
  account: TypefullyPublishingAccount
  apiKey: string
}

const username = (value: string) => value.trim().replace(/^@/, '')

const accountTarget = (account: PublishingAccount) => ({
  id: account.id,
  provider: account.provider,
  username: account.username,
})

const uniqueAlias = (
  requested: string,
  accounts: PublishingAccount[],
  ignoreId?: string,
) => {
  const base = normalizePublishingAlias(requested)
  const aliases = new Set(
    accounts
      .filter((account) => account.id !== ignoreId)
      .map((account) => account.alias.toLowerCase()),
  )
  if (!aliases.has(base)) return base
  for (let index = 2; index < 10_000; index += 1) {
    const candidate = `${base}-${index}`
    if (!aliases.has(candidate)) return candidate
  }
  throw new Error('publishing_account_alias_unavailable')
}

const replaceAccount = (
  accounts: PublishingAccount[],
  next: PublishingAccount,
) => [...accounts.filter((account) => account.id !== next.id), next]

const resolveFromConfig = (
  config: IloConfig,
  selector?: string,
): PublishingAccount => {
  if (!selector?.trim()) {
    const account = config.publishingAccounts.find(
      (candidate) => candidate.id === config.defaultPublishingAccountId,
    )
    if (!account) throw new Error('publishing_account_required')
    return account
  }
  const value = selector.trim().toLowerCase()
  const handle = value.replace(/^@/, '')
  const exact = config.publishingAccounts.find(
    (account) =>
      account.id.toLowerCase() === value ||
      account.alias.toLowerCase() === value,
  )
  if (exact) return exact
  const matches = config.publishingAccounts.filter(
    (account) => account.username.toLowerCase() === handle,
  )
  if (matches.length === 1) return matches[0] as PublishingAccount
  if (matches.length > 1) throw new Error('publishing_account_ambiguous')
  throw new Error('publishing_account_not_found')
}

const bindBeforeDefaultChange = (config: IloConfig, nextId: string) => {
  if (
    !config.defaultPublishingAccountId ||
    config.defaultPublishingAccountId === nextId
  ) {
    return
  }
  const previous = config.publishingAccounts.find(
    (account) => account.id === config.defaultPublishingAccountId,
  )
  if (previous) bindUnassignedDraftRecords(accountTarget(previous))
}

export const listPublishingAccounts = async () =>
  (await readConfig()).publishingAccounts

export const getPublishingAccount = async (selector?: string) =>
  resolveFromConfig(await readConfig(), selector)

export const findPublishingAccount = async (selector?: string) => {
  try {
    return await getPublishingAccount(selector)
  } catch (error) {
    if (
      error instanceof Error &&
      ['publishing_account_required', 'publishing_account_not_found'].includes(
        error.message,
      )
    ) {
      return null
    }
    throw error
  }
}

export const getDefaultPublishingAccount = async () => findPublishingAccount()

export const findPublishingAccountForXHandle = async (handle: string) => {
  const config = await readConfig()
  const value = username(handle).toLowerCase()
  if (!value) return null
  const current = config.publishingAccounts.find(
    (account) => account.id === config.defaultPublishingAccountId,
  )
  if (current?.username.toLowerCase() === value) return current
  const matches = config.publishingAccounts.filter(
    (account) => account.username.toLowerCase() === value,
  )
  return matches.length === 1 ? (matches[0] as PublishingAccount) : null
}

export const getDefaultXHandle = async () => {
  const account = await getDefaultPublishingAccount()
  if (!account) throw new Error('x_account_required')
  return account.username
}

export const setDefaultPublishingAccount = async (selector: string) => {
  const config = await readConfig()
  const account = resolveFromConfig(config, selector)
  bindBeforeDefaultChange(config, account.id)
  config.defaultPublishingAccountId = account.id
  await writeConfig(config)
  return account
}

export const saveXCredentials = async (input: SaveXCredentialsInput) => {
  const config = await readConfig()
  const id = `x:${input.accountId}`
  const existing = config.publishingAccounts.find(
    (account): account is XPublishingAccount =>
      account.id === id && account.provider === 'x',
  )
  const account: XPublishingAccount = {
    id,
    alias: uniqueAlias(
      input.alias || existing?.alias || input.username,
      config.publishingAccounts,
      id,
    ),
    provider: 'x',
    platform: 'x',
    accountId: input.accountId,
    username: username(input.username),
    displayName: input.displayName,
    clientId: input.clientId,
    scopes: input.scopes,
    expiresAt: input.expiresAt,
    createdAt: existing?.createdAt ?? Date.now(),
  }
  const makeDefault =
    input.makeDefault ??
    (!existing || config.defaultPublishingAccountId === account.id)
  if (makeDefault) bindBeforeDefaultChange(config, account.id)

  await setKeyringPassword(
    KEYRING_SERVICE,
    xKeyringAccount(account.accountId, 'access-token'),
    input.accessToken,
  )
  if (input.refreshToken) {
    await setKeyringPassword(
      KEYRING_SERVICE,
      xKeyringAccount(account.accountId, 'refresh-token'),
      input.refreshToken,
    )
  } else {
    await deleteKeyringPassword(
      KEYRING_SERVICE,
      xKeyringAccount(account.accountId, 'refresh-token'),
    )
  }
  if (input.clientSecret) {
    await setKeyringPassword(
      KEYRING_SERVICE,
      xKeyringAccount(account.accountId, 'client-secret'),
      input.clientSecret,
    )
  } else {
    await deleteKeyringPassword(
      KEYRING_SERVICE,
      xKeyringAccount(account.accountId, 'client-secret'),
    )
  }

  config.publishingAccounts = replaceAccount(config.publishingAccounts, account)
  if (makeDefault || !config.defaultPublishingAccountId) {
    config.defaultPublishingAccountId = account.id
  }
  await writeConfig(config)
  if (existing?.legacyKeyring) {
    await Promise.all([
      deleteKeyringPassword(KEYRING_SERVICE, LEGACY_X_ACCESS_TOKEN_ACCOUNT),
      deleteKeyringPassword(KEYRING_SERVICE, LEGACY_X_REFRESH_TOKEN_ACCOUNT),
      deleteKeyringPassword(KEYRING_SERVICE, LEGACY_X_CLIENT_SECRET_ACCOUNT),
    ])
  }
  return account
}

const directXAccount = async (selector?: string) => {
  const config = await readConfig()
  if (selector?.trim()) {
    const account = resolveFromConfig(config, selector)
    if (account.provider !== 'x') throw new Error('x_account_not_direct')
    return account
  }
  const selected = config.publishingAccounts.find(
    (account) => account.id === config.defaultPublishingAccountId,
  )
  if (selected?.provider === 'x') return selected
  const directAccounts = config.publishingAccounts.filter(
    (account): account is XPublishingAccount => account.provider === 'x',
  )
  if (directAccounts.length === 1)
    return directAccounts[0] as XPublishingAccount
  if (directAccounts.length > 1) throw new Error('x_account_required')
  throw new Error('x_not_connected')
}

export const readXCredentials = async (
  selector?: string,
): Promise<XCredentials> => {
  const account = await directXAccount(selector)
  let [accessToken, refreshToken, clientSecret] = await Promise.all([
    getKeyringPassword(
      KEYRING_SERVICE,
      xKeyringAccount(account.accountId, 'access-token'),
    ),
    getKeyringPassword(
      KEYRING_SERVICE,
      xKeyringAccount(account.accountId, 'refresh-token'),
    ),
    getKeyringPassword(
      KEYRING_SERVICE,
      xKeyringAccount(account.accountId, 'client-secret'),
    ),
  ])
  if (!accessToken && account.legacyKeyring) {
    ;[accessToken, refreshToken, clientSecret] = await Promise.all([
      getKeyringPassword(KEYRING_SERVICE, LEGACY_X_ACCESS_TOKEN_ACCOUNT),
      getKeyringPassword(KEYRING_SERVICE, LEGACY_X_REFRESH_TOKEN_ACCOUNT),
      getKeyringPassword(KEYRING_SERVICE, LEGACY_X_CLIENT_SECRET_ACCOUNT),
    ])
  }
  if (!accessToken) throw new Error('x_access_token_missing')
  return {
    ...account,
    accessToken,
    refreshToken: refreshToken || undefined,
    clientSecret: clientSecret || undefined,
  }
}

export const saveTypefullyCredentials = async (
  input: SaveTypefullyCredentialsInput,
) => {
  if (!input.apiKey.trim()) throw new Error('typefully_api_key_required')
  if (!input.accounts.length) throw new Error('typefully_x_account_missing')
  const config = await readConfig()
  let accounts = config.publishingAccounts
  const saved: TypefullyPublishingAccount[] = []
  for (const source of input.accounts) {
    const id = `typefully:${input.credentialId}:${source.socialSetId}`
    const existing = accounts.find(
      (account): account is TypefullyPublishingAccount =>
        account.id === id && account.provider === 'typefully',
    )
    const account: TypefullyPublishingAccount = {
      id,
      alias: uniqueAlias(
        source.alias || existing?.alias || source.username,
        accounts,
        id,
      ),
      provider: 'typefully',
      platform: 'x',
      socialSetId: source.socialSetId,
      credentialId: input.credentialId,
      username: username(source.username),
      displayName: source.displayName,
      createdAt: existing?.createdAt ?? Date.now(),
    }
    accounts = replaceAccount(accounts, account)
    saved.push(account)
  }
  const makeDefault = input.makeDefault ?? true
  if (makeDefault && saved[0]) bindBeforeDefaultChange(config, saved[0].id)
  await setKeyringPassword(
    KEYRING_SERVICE,
    typefullyKeyringAccount(input.credentialId),
    input.apiKey.trim(),
  )
  config.publishingAccounts = accounts
  if (makeDefault && saved[0]) {
    config.defaultPublishingAccountId = saved[0].id
  } else if (!config.defaultPublishingAccountId && saved[0]) {
    config.defaultPublishingAccountId = saved[0].id
  }
  await writeConfig(config)
  return saved
}

export const readTypefullyCredentials = async (
  selector: string,
): Promise<TypefullyCredentials> => {
  const account = await getPublishingAccount(selector)
  if (account.provider !== 'typefully') {
    throw new Error('publishing_account_not_typefully')
  }
  const apiKey = await getKeyringPassword(
    KEYRING_SERVICE,
    typefullyKeyringAccount(account.credentialId),
  )
  if (!apiKey) throw new Error('typefully_api_key_missing')
  return { account, apiKey }
}

const deleteXCredentials = async (account: XPublishingAccount) => {
  const accountKeys = [
    deleteKeyringPassword(
      KEYRING_SERVICE,
      xKeyringAccount(account.accountId, 'access-token'),
    ),
    deleteKeyringPassword(
      KEYRING_SERVICE,
      xKeyringAccount(account.accountId, 'refresh-token'),
    ),
    deleteKeyringPassword(
      KEYRING_SERVICE,
      xKeyringAccount(account.accountId, 'client-secret'),
    ),
  ]
  if (account.legacyKeyring) {
    accountKeys.push(
      deleteKeyringPassword(KEYRING_SERVICE, LEGACY_X_ACCESS_TOKEN_ACCOUNT),
      deleteKeyringPassword(KEYRING_SERVICE, LEGACY_X_REFRESH_TOKEN_ACCOUNT),
      deleteKeyringPassword(KEYRING_SERVICE, LEGACY_X_CLIENT_SECRET_ACCOUNT),
    )
  }
  await Promise.all(accountKeys)
}

export const removePublishingAccount = async (selector: string) => {
  const config = await readConfig()
  const account = resolveFromConfig(config, selector)
  releaseDraftsForPublishingAccountRecord(account.id)
  config.publishingAccounts = config.publishingAccounts.filter(
    (candidate) => candidate.id !== account.id,
  )
  if (config.defaultPublishingAccountId === account.id) {
    config.defaultPublishingAccountId = config.publishingAccounts[0]?.id
  }
  await writeConfig(config)
  if (account.provider === 'x') {
    await deleteXCredentials(account)
  } else if (
    !config.publishingAccounts.some(
      (candidate) =>
        candidate.provider === 'typefully' &&
        candidate.credentialId === account.credentialId,
    )
  ) {
    await deleteKeyringPassword(
      KEYRING_SERVICE,
      typefullyKeyringAccount(account.credentialId),
    )
  }
  return account
}

export const disconnectX = async (selector?: string) => {
  const account = await directXAccount(selector)
  return removePublishingAccount(account.id)
}

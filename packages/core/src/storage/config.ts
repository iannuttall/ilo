import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { bindUnassignedDraftRecords } from './database.js'
import { iloConfigPath } from './paths.js'

export type PublishingProvider = 'x' | 'typefully'

type PublishingAccountBase = {
  id: string
  alias: string
  provider: PublishingProvider
  platform: 'x'
  username: string
  displayName: string
  createdAt: number
}

export type XPublishingAccount = PublishingAccountBase & {
  provider: 'x'
  accountId: string
  clientId: string
  scopes: string
  expiresAt: number
  legacyKeyring?: boolean
}

export type TypefullyPublishingAccount = PublishingAccountBase & {
  provider: 'typefully'
  socialSetId: number
  credentialId: string
}

export type PublishingAccount = XPublishingAccount | TypefullyPublishingAccount

export type IloConfig = {
  version: 2
  timezone: string
  defaultPublishingAccountId?: string
  publishingAccounts: PublishingAccount[]
}

type LegacyConfig = {
  version: 1
  timezone?: string
  x?: {
    clientId: string
    accountId: string
    username: string
    displayName: string
    scopes: string
    expiresAt: number
  }
}

const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

export const defaultConfig = (): IloConfig => ({
  version: 2,
  timezone: timezone(),
  publishingAccounts: [],
})

const accountAlias = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'account'

const migrateLegacyConfig = (legacy: LegacyConfig): IloConfig => {
  if (!legacy.x) {
    return {
      ...defaultConfig(),
      timezone: legacy.timezone || timezone(),
    }
  }
  const account: XPublishingAccount = {
    id: `x:${legacy.x.accountId}`,
    alias: accountAlias(legacy.x.username),
    provider: 'x',
    platform: 'x',
    accountId: legacy.x.accountId,
    username: legacy.x.username,
    displayName: legacy.x.displayName,
    clientId: legacy.x.clientId,
    scopes: legacy.x.scopes,
    expiresAt: legacy.x.expiresAt,
    createdAt: Date.now(),
    legacyKeyring: true,
  }
  return {
    version: 2,
    timezone: legacy.timezone || timezone(),
    defaultPublishingAccountId: account.id,
    publishingAccounts: [account],
  }
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && Boolean(value.trim())

const isPublishingAccount = (value: unknown): value is PublishingAccount => {
  if (!value || typeof value !== 'object') return false
  const account = value as Partial<PublishingAccount>
  if (
    !isNonEmptyString(account.id) ||
    !isNonEmptyString(account.alias) ||
    !isNonEmptyString(account.username) ||
    !isNonEmptyString(account.displayName) ||
    account.platform !== 'x' ||
    typeof account.createdAt !== 'number' ||
    !Number.isFinite(account.createdAt)
  ) {
    return false
  }
  if (account.provider === 'x') {
    const direct = account as Partial<XPublishingAccount>
    return (
      isNonEmptyString(direct.accountId) &&
      isNonEmptyString(direct.clientId) &&
      typeof direct.scopes === 'string' &&
      typeof direct.expiresAt === 'number' &&
      Number.isFinite(direct.expiresAt) &&
      (direct.legacyKeyring === undefined ||
        typeof direct.legacyKeyring === 'boolean')
    )
  }
  if (account.provider === 'typefully') {
    const typefully = account as Partial<TypefullyPublishingAccount>
    return (
      typeof typefully.socialSetId === 'number' &&
      Number.isInteger(typefully.socialSetId) &&
      typefully.socialSetId > 0 &&
      isNonEmptyString(typefully.credentialId)
    )
  }
  return false
}

const parseConfig = (value: unknown): IloConfig | null => {
  if (!value || typeof value !== 'object') return null
  const input = value as Partial<IloConfig> & Partial<LegacyConfig>
  if (input.version === 1) return migrateLegacyConfig(input as LegacyConfig)
  if (input.version !== 2 || !Array.isArray(input.publishingAccounts)) {
    return null
  }
  if (!input.publishingAccounts.every(isPublishingAccount)) return null
  const defaultPublishingAccountId =
    typeof input.defaultPublishingAccountId === 'string' &&
    input.publishingAccounts.some(
      (account) => account.id === input.defaultPublishingAccountId,
    )
      ? input.defaultPublishingAccountId
      : undefined
  return {
    version: 2,
    timezone:
      typeof input.timezone === 'string' && input.timezone.trim()
        ? input.timezone
        : timezone(),
    ...(defaultPublishingAccountId ? { defaultPublishingAccountId } : {}),
    publishingAccounts: input.publishingAccounts,
  }
}

export const writeConfig = async (config: IloConfig) => {
  const path = iloConfigPath()
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const temporaryPath = `${path}.${process.pid}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(config, null, 2)}\n`, {
    mode: 0o600,
  })
  await rename(temporaryPath, path)
}

export const readConfig = async (): Promise<IloConfig> => {
  try {
    const raw = JSON.parse(await readFile(iloConfigPath(), 'utf8')) as unknown
    const config = parseConfig(raw)
    if (!config) return defaultConfig()
    if ((raw as { version?: number }).version === 1) {
      await writeConfig(config)
      const account = config.publishingAccounts.find(
        (candidate) => candidate.id === config.defaultPublishingAccountId,
      )
      if (account) {
        bindUnassignedDraftRecords({
          id: account.id,
          provider: account.provider,
          username: account.username,
        })
      }
    }
    return config
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return defaultConfig()
    }
    throw error
  }
}

export const normalizePublishingAlias = accountAlias

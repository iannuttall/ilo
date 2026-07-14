import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import {
  deleteKeyringPassword,
  getKeyringPassword,
  setKeyringPassword,
} from './keyring.js'
import { iloConfigPath } from './paths.js'

const KEYRING_SERVICE = 'ilo'
const X_CLIENT_SECRET_ACCOUNT = 'x:client-secret'
const X_ACCESS_TOKEN_ACCOUNT = 'x:access-token'
const X_REFRESH_TOKEN_ACCOUNT = 'x:refresh-token'

export type IloConfig = {
  version: 1
  timezone: string
  x?: {
    clientId: string
    accountId: string
    username: string
    displayName: string
    scopes: string
    expiresAt: number
  }
}

export type XCredentials = NonNullable<IloConfig['x']> & {
  clientSecret?: string
  accessToken: string
  refreshToken?: string
}

const defaultConfig = (): IloConfig => ({
  version: 1,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
})

export const readConfig = async (): Promise<IloConfig> => {
  try {
    const parsed = JSON.parse(
      await readFile(iloConfigPath(), 'utf8'),
    ) as IloConfig
    return parsed?.version === 1 ? parsed : defaultConfig()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return defaultConfig()
    throw error
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

export const saveXCredentials = async (input: XCredentials) => {
  await setKeyringPassword(
    KEYRING_SERVICE,
    X_ACCESS_TOKEN_ACCOUNT,
    input.accessToken,
  )
  if (input.refreshToken) {
    await setKeyringPassword(
      KEYRING_SERVICE,
      X_REFRESH_TOKEN_ACCOUNT,
      input.refreshToken,
    )
  } else {
    await deleteKeyringPassword(KEYRING_SERVICE, X_REFRESH_TOKEN_ACCOUNT)
  }
  if (input.clientSecret) {
    await setKeyringPassword(
      KEYRING_SERVICE,
      X_CLIENT_SECRET_ACCOUNT,
      input.clientSecret,
    )
  } else {
    await deleteKeyringPassword(KEYRING_SERVICE, X_CLIENT_SECRET_ACCOUNT)
  }

  const config = await readConfig()
  config.x = {
    clientId: input.clientId,
    accountId: input.accountId,
    username: input.username,
    displayName: input.displayName,
    scopes: input.scopes,
    expiresAt: input.expiresAt,
  }
  await writeConfig(config)
}

export const readXCredentials = async (): Promise<XCredentials> => {
  const config = await readConfig()
  if (!config.x) throw new Error('x_not_connected')
  const [accessToken, refreshToken, clientSecret] = await Promise.all([
    getKeyringPassword(KEYRING_SERVICE, X_ACCESS_TOKEN_ACCOUNT),
    getKeyringPassword(KEYRING_SERVICE, X_REFRESH_TOKEN_ACCOUNT),
    getKeyringPassword(KEYRING_SERVICE, X_CLIENT_SECRET_ACCOUNT),
  ])
  if (!accessToken) throw new Error('x_access_token_missing')
  return {
    ...config.x,
    accessToken,
    refreshToken: refreshToken || undefined,
    clientSecret: clientSecret || undefined,
  }
}

export const disconnectX = async () => {
  const config = await readConfig()
  delete config.x
  await writeConfig(config)
  await Promise.all([
    deleteKeyringPassword(KEYRING_SERVICE, X_ACCESS_TOKEN_ACCOUNT),
    deleteKeyringPassword(KEYRING_SERVICE, X_REFRESH_TOKEN_ACCOUNT),
    deleteKeyringPassword(KEYRING_SERVICE, X_CLIENT_SECRET_ACCOUNT),
  ])
}

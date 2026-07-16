import { normalizeXHandle, readConfig } from '@ilo/core'

export const resolveXAccountHandle = async (value: unknown) => {
  if (typeof value === 'string' && value.trim()) {
    return normalizeXHandle(value)
  }
  const config = await readConfig()
  if (!config.x?.username) throw new Error('x_account_required')
  return normalizeXHandle(config.x.username)
}

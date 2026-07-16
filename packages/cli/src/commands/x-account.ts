import { getDefaultXHandle, normalizeXHandle } from '@ilo/core'

export const resolveXAccountHandle = async (value: unknown) => {
  if (typeof value === 'string' && value.trim()) {
    return normalizeXHandle(value)
  }
  return normalizeXHandle(await getDefaultXHandle())
}

import {
  discoverTypefullyXAccounts,
  type TypefullyClientOptions,
} from '../providers/typefully/client.js'
import { saveTypefullyCredentials } from '../storage/accounts.js'

export const connectTypefully = async (
  apiKey: string,
  options: Pick<TypefullyClientOptions, 'fetcher'> & {
    makeDefault?: boolean
  } = {},
) => {
  const discovered = await discoverTypefullyXAccounts(
    apiKey.trim(),
    options.fetcher,
  )
  const accounts = await saveTypefullyCredentials({
    apiKey,
    credentialId: String(discovered.me.id),
    accounts: discovered.accounts,
    makeDefault: options.makeDefault,
  })
  return { user: discovered.me, accounts }
}

type Keyring = {
  getPassword(service: string, account: string): Promise<string | null>
  setPassword(service: string, account: string, password: string): Promise<void>
  deletePassword(service: string, account: string): Promise<boolean>
}

let testKeyring: Keyring | undefined
let loadedKeyring: Promise<Keyring> | undefined

const resolveKeyring = async (): Promise<Keyring> => {
  if (testKeyring) return testKeyring
  loadedKeyring ??= import('@napi-rs/keyring/keytar.js').then(
    (module) => module as unknown as Keyring,
  )
  return loadedKeyring
}

export const getKeyringPassword = async (service: string, account: string) =>
  (await resolveKeyring()).getPassword(service, account)

export const setKeyringPassword = async (
  service: string,
  account: string,
  password: string,
) => (await resolveKeyring()).setPassword(service, account, password)

export const deleteKeyringPassword = async (service: string, account: string) =>
  (await resolveKeyring()).deletePassword(service, account)

export const setKeyringForTests = (keyring?: Keyring) => {
  testKeyring = keyring
}

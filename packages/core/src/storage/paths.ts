import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export const iloHome = (env: NodeJS.ProcessEnv = process.env) => {
  if (env.ILO_HOME?.trim()) return resolve(env.ILO_HOME.trim())
  const configHome = env.XDG_CONFIG_HOME?.trim() || join(homedir(), '.config')
  return join(configHome, 'ilo')
}

export const iloConfigPath = (env?: NodeJS.ProcessEnv) =>
  join(iloHome(env), 'config.json')

export const iloDatabasePath = (env?: NodeJS.ProcessEnv) =>
  join(iloHome(env), 'ilo.sqlite')

import { readFile } from 'node:fs/promises'
import { text } from '@clack/prompts'

export const printJson = (value: unknown) =>
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
export const printLine = (value = '') => process.stdout.write(`${value}\n`)
export const canPrompt = () =>
  Boolean(process.stdin.isTTY && process.stdout.isTTY && !process.env.CI)

const friendlyErrors: Record<string, string> = {
  draft_publishing_account_mismatch:
    'This draft belongs to a different publishing account. Run `ilo drafts list` to check its saved handle and provider.',
  draft_publishing_account_unavailable:
    "This draft's publishing account is no longer connected. Reconnect that account before publishing.",
  publishing_account_ambiguous:
    'More than one publishing route matches that handle. Run `ilo accounts list` and use its local alias or full account id.',
  publishing_account_has_scheduled_drafts:
    'This account still has scheduled drafts. Publish them or let the scheduler run before removing the account.',
  publishing_account_not_found:
    'No publishing account matched. Run `ilo accounts list` to see the available aliases and handles.',
  publishing_account_required:
    'No publishing account is connected. Run `ilo start`, or pass `--account` when an account already exists.',
  publishing_provider_invalid:
    'Choose `typefully` or `x` as the publishing provider.',
  publishing_provider_required:
    'Choose a publishing provider with `--provider typefully` or `--provider x`.',
  typefully_api_key_missing:
    'The Typefully API key is missing from the operating system keychain. Reconnect with `ilo accounts add typefully`.',
  typefully_api_key_required:
    'A Typefully v2 API key is required. Create one under Typefully Settings → API.',
  typefully_image_alt_text_unsupported:
    'Typefully publishing cannot send image alt text through its documented v2 API. Use a direct X account for this post.',
  typefully_x_account_missing:
    'This Typefully key does not expose a social set with an X account.',
  x_account_not_direct:
    'That account publishes through Typefully. Choose a direct X account for this command.',
  x_account_required:
    'Choose an X account. Run `ilo accounts list`, then pass its alias or handle with `--account`.',
  x_not_connected:
    'No direct X account is connected. Run `ilo accounts add x`, or use a Typefully publishing account.',
}

export const friendlyErrorMessage = (value: unknown) => {
  const message = value instanceof Error ? value.message : String(value)
  return friendlyErrors[message] ?? message
}

export const readTextInput = async (args: {
  text?: unknown
  file?: unknown
}) => {
  if (typeof args.text === 'string' && args.text.trim()) return args.text.trim()
  if (typeof args.file === 'string' && args.file.trim())
    return (await readFile(args.file.trim(), 'utf8')).trim()
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = []
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
    const value = Buffer.concat(chunks).toString('utf8').trim()
    if (value) return value
  }
  if (!canPrompt()) throw new Error('post_text_required')
  const value = await text({ message: 'What do you want to post?' })
  if (typeof value !== 'string' || !value.trim())
    throw new Error('post_text_required')
  return value.trim()
}

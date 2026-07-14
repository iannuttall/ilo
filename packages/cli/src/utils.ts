import { readFile } from 'node:fs/promises'
import { text } from '@clack/prompts'

export const printJson = (value: unknown) =>
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
export const printLine = (value = '') => process.stdout.write(`${value}\n`)
export const canPrompt = () =>
  Boolean(process.stdin.isTTY && process.stdout.isTTY && !process.env.CI)

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

import * as z from 'zod/v4'

export type ToolResult = {
  content: Array<{ type: 'text'; text: string }>
  structuredContent?: Record<string, unknown>
  isError?: boolean
}

export const success = (summary: string, data: unknown): ToolResult => ({
  content: [{ type: 'text', text: summary }],
  structuredContent: data as Record<string, unknown>,
})

export const failure = (error: unknown): ToolResult => {
  const message = error instanceof Error ? error.message : String(error)
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    structuredContent: { error: message },
    isError: true,
  }
}

export const openOutputSchema = z.looseObject({})

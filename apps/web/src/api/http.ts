export type AgentAction = { title: string; reason: string }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

export const withCors = (response: Response) => {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(corsHeaders))
    headers.set(key, value)
  return new Response(response.body, { status: response.status, headers })
}

export const json = (data: unknown, status = 200) =>
  withCors(
    new Response(JSON.stringify(data), {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    }),
  )

export type ApiErrorInput = {
  status: number
  error: string
  reason: string
  message: string
  whatBroke?: string
  howToFix?: AgentAction[]
  [key: string]: unknown
}

export const apiError = ({
  status,
  error,
  reason,
  message,
  whatBroke,
  howToFix,
  ...details
}: ApiErrorInput) =>
  json(
    {
      error,
      reason,
      message,
      whatBroke: whatBroke ?? message,
      howToFix: howToFix ?? [{ title: 'Check the input', reason: message }],
      ...details,
    },
    status,
  )

export const badRequestError = (
  reason: string,
  message: string,
  details: Record<string, unknown> = {},
) =>
  apiError({ status: 400, error: 'bad_request', reason, message, ...details })

export const parseJson = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

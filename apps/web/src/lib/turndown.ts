import { DOMParser } from 'linkedom/worker'

export type TurndownServiceInstance = {
  addRule(
    key: string,
    rule: {
      filter: string | string[] | ((node: Node) => boolean)
      replacement: (content: string, node: Node) => string
    },
  ): void
  remove(tags: string[]): void
  keep(tags: string[]): void
  turndown(input: string | Node): string
}

type TurndownServiceCtor = new (
  options?: Record<string, unknown>,
) => TurndownServiceInstance

let turndownServiceCtorPromise: Promise<TurndownServiceCtor> | undefined

export const withTurndownGlobals = async <T>(run: () => Promise<T>) => {
  const workerGlobals = globalThis as Record<string, unknown>
  const hadWindow = 'window' in workerGlobals
  const previousWindow = workerGlobals.window
  const hadDOMParser = 'DOMParser' in workerGlobals
  const previousDOMParser = workerGlobals.DOMParser
  const hadDocument = 'document' in workerGlobals
  const previousDocument = workerGlobals.document

  workerGlobals.window = globalThis
  workerGlobals.DOMParser = DOMParser
  workerGlobals.document =
    previousDocument ||
    new DOMParser().parseFromString(
      '<!doctype html><html><body></body></html>',
      'text/html',
    )

  try {
    return await run()
  } finally {
    if (hadWindow) workerGlobals.window = previousWindow
    else delete workerGlobals.window

    if (hadDOMParser) workerGlobals.DOMParser = previousDOMParser
    else delete workerGlobals.DOMParser

    if (hadDocument) workerGlobals.document = previousDocument
    else delete workerGlobals.document
  }
}

const getTurndownServiceCtor = async (): Promise<TurndownServiceCtor> => {
  if (!turndownServiceCtorPromise) {
    turndownServiceCtorPromise = withTurndownGlobals(async () => {
      const module = await import('turndown')
      return module.default as unknown as TurndownServiceCtor
    })
  }

  return turndownServiceCtorPromise
}

export const createTurndownService = async (
  configure?: (service: TurndownServiceInstance) => void,
) => {
  const TurndownService = await getTurndownServiceCtor()
  return withTurndownGlobals(async () => {
    const service = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      preformattedCode: true,
    })

    configure?.(service)
    return service
  })
}

export const turndownHtml = async (
  input: string | Node,
  configure?: (service: TurndownServiceInstance) => void,
) =>
  withTurndownGlobals(async () => {
    const service = await createTurndownService(configure)
    return service.turndown(input)
  })

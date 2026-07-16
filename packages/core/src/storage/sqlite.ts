import { createRequire } from 'node:module'
import type {
  DatabaseSync as NodeDatabaseSync,
  StatementSync as NodeStatementSync,
  SQLInputValue,
  StatementResultingChanges,
} from 'node:sqlite'

const require = createRequire(import.meta.url)

const loadNodeSqlite = () => {
  const originalEmitWarning = process.emitWarning
  process.emitWarning = ((warning, ...args) => {
    const options = args[0]
    const type =
      typeof options === 'string'
        ? options
        : typeof options === 'object' && options !== null && 'type' in options
          ? options.type
          : undefined
    const message = warning instanceof Error ? warning.message : String(warning)
    if (
      type === 'ExperimentalWarning' &&
      message.startsWith('SQLite is an experimental feature')
    ) {
      return
    }
    Reflect.apply(originalEmitWarning, process, [warning, ...args])
  }) as typeof process.emitWarning

  try {
    return require('node:sqlite') as typeof import('node:sqlite')
  } finally {
    process.emitWarning = originalEmitWarning
  }
}

const { DatabaseSync } = loadNodeSqlite()

class Statement {
  readonly #statement: NodeStatementSync

  constructor(statement: NodeStatementSync) {
    this.#statement = statement
    this.#statement.setAllowBareNamedParameters(true)
    this.#statement.setAllowUnknownNamedParameters(true)
  }

  all(...parameters: unknown[]): unknown[] {
    return this.#statement.all(...(parameters as SQLInputValue[]))
  }

  get(...parameters: unknown[]): unknown {
    return this.#statement.get(...(parameters as SQLInputValue[]))
  }

  run(...parameters: unknown[]): StatementResultingChanges {
    return this.#statement.run(...(parameters as SQLInputValue[]))
  }
}

export default class Database {
  readonly #database: NodeDatabaseSync

  constructor(path: string) {
    this.#database = new DatabaseSync(path, {
      allowBareNamedParameters: true,
      allowUnknownNamedParameters: true,
      timeout: 5_000,
    })
  }

  close() {
    this.#database.close()
  }

  exec(sql: string) {
    this.#database.exec(sql)
  }

  pragma(statement: string) {
    this.#database.exec(`PRAGMA ${statement}`)
  }

  prepare(sql: string) {
    return new Statement(this.#database.prepare(sql))
  }

  transaction<Result>(callback: () => Result) {
    return () => {
      this.#database.exec('BEGIN')
      try {
        const result = callback()
        this.#database.exec('COMMIT')
        return result
      } catch (error) {
        this.#database.exec('ROLLBACK')
        throw error
      }
    }
  }
}

export type AppErrorCode =
  'unauthorized' | 'forbidden' | 'not_found' | 'conflict' | 'invalid'

/** Expected business failure; `message` is user-facing UI copy. */
export class AppError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }
}

export const X_STANDARD_POST_TEXT_LIMIT = 280
export const X_PREMIUM_POST_TEXT_LIMIT = 25_000

const X_ALLOWED_TEXT_LIMITS = new Set([
  X_STANDARD_POST_TEXT_LIMIT,
  X_PREMIUM_POST_TEXT_LIMIT,
])

export const normalizeXPostTextLimit = (
  value: number | null | undefined,
): number => {
  if (value == null) return X_STANDARD_POST_TEXT_LIMIT
  const normalized = Math.floor(value)
  if (!X_ALLOWED_TEXT_LIMITS.has(normalized)) {
    throw new Error('invalid_x_text_limit')
  }
  return normalized
}

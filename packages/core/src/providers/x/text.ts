export const X_STANDARD_POST_TEXT_LIMIT = 280
export const X_TCO_URL_LENGTH = 23

const X_SINGLE_WEIGHT_RANGES = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
] as const
const URL_PATTERN =
  /(^|[\s([{<])((?:https?:\/\/)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d{2,5})?(?:\/[^\s<>"'`)]*)?)/giu
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
const isSingleWeight = (codePoint: number) =>
  X_SINGLE_WEIGHT_RANGES.some(
    ([start, end]) => codePoint >= start && codePoint <= end,
  )
const weight = (value: string) => {
  if (/\p{Extended_Pictographic}|\p{Emoji_Presentation}/u.test(value)) return 2
  return [...value].reduce(
    (sum, character) =>
      sum + (isSingleWeight(character.codePointAt(0) ?? 0) ? 1 : 2),
    0,
  )
}
const replaceUrls = (text: string) =>
  text.replace(
    URL_PATTERN,
    (_match, prefix: string) => `${prefix}${'x'.repeat(X_TCO_URL_LENGTH)}`,
  )

export const countXPostText = (text: string) =>
  Array.from(
    segmenter.segment(replaceUrls(text.normalize('NFC'))),
    (part) => part.segment,
  ).reduce((sum, grapheme) => sum + weight(grapheme), 0)

export const validateXPostText = (
  text: string,
  limit = X_STANDARD_POST_TEXT_LIMIT,
) => {
  const weighted = countXPostText(text)
  return {
    ok: weighted > 0 && weighted <= limit,
    weighted,
    limit,
    remaining: limit - weighted,
  }
}

import {
  normalizeXPostId,
  normalizeXPostImages,
  type XPostOptions,
} from '@ilo/core'

export const imageArgs = {
  image: {
    type: 'string' as const,
    description: 'Attach a JPEG, PNG, or WebP path. Repeat up to four times.',
  },
  alt: {
    type: 'string' as const,
    description: 'Alt text paired with each --image, in the same order.',
  },
}

export const destinationArgs = {
  'reply-to': {
    type: 'string' as const,
    description: 'Reply to an X post ID or URL.',
  },
  ...imageArgs,
}

const repeatedValues = (rawArgs: string[], name: string) => {
  const values: string[] = []
  const flag = `--${name}`
  for (let index = 0; index < rawArgs.length; index += 1) {
    const value = rawArgs[index]
    if (value === flag) {
      const next = rawArgs[index + 1]
      if (next === undefined || next.startsWith('--')) {
        throw new Error(`${name}_value_required`)
      }
      values.push(next)
      index += 1
    } else if (value?.startsWith(`${flag}=`)) {
      values.push(value.slice(flag.length + 1))
    }
  }
  return values
}

export const postOptions = (
  args: Record<string, unknown>,
  rawArgs: string[],
): XPostOptions => {
  const paths = repeatedValues(rawArgs, 'image')
  const altTexts = repeatedValues(rawArgs, 'alt')
  if (altTexts.length > paths.length) {
    throw new Error('x_image_alt_without_image')
  }
  const replyTo = args['reply-to']
  return {
    replyToPostId:
      typeof replyTo === 'string' && replyTo.trim()
        ? normalizeXPostId(replyTo)
        : undefined,
    images: normalizeXPostImages(
      paths.map((path, index) => ({ path, altText: altTexts[index] })),
    ),
  }
}

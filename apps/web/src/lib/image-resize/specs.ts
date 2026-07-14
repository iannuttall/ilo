export type ImageSpecShape = 'rectangle' | 'circle'

export type ImageSpec = {
  id: string
  label: string
  width: number
  height: number
  shape: ImageSpecShape
  note?: string
}

export type PlatformSpecs = {
  platform: string
  specs: ImageSpec[]
}

const X_SPECS: ImageSpec[] = [
  {
    id: 'x-header',
    label: 'Header / banner',
    width: 1500,
    height: 500,
    shape: 'rectangle',
    note: 'The wide image at the top of your profile. Stretches edge to edge on desktop.',
  },
  {
    id: 'x-profile',
    label: 'Profile photo',
    width: 400,
    height: 400,
    shape: 'circle',
    note: 'Square upload. X crops it to a circle for display.',
  },
  {
    id: 'x-in-stream-landscape',
    label: 'In stream, landscape',
    width: 1600,
    height: 900,
    shape: 'rectangle',
    note: '16:9. The safest single image aspect for a post.',
  },
  {
    id: 'x-in-stream-portrait',
    label: 'In stream, portrait',
    width: 1080,
    height: 1350,
    shape: 'rectangle',
    note: '4:5. Taller images get more vertical space in the feed.',
  },
  {
    id: 'x-in-stream-square',
    label: 'In stream, square',
    width: 1080,
    height: 1080,
    shape: 'rectangle',
    note: '1:1. Works well if the image will also be reused on Instagram.',
  },
  {
    id: 'x-card-large',
    label: 'Twitter card (large)',
    width: 1200,
    height: 628,
    shape: 'rectangle',
    note: 'summary_large_image og:image. Used by every link preview.',
  },
  {
    id: 'x-card-summary',
    label: 'Twitter card (summary)',
    width: 400,
    height: 400,
    shape: 'rectangle',
    note: 'Small summary card thumbnail.',
  },
]

export const X_PLATFORM: PlatformSpecs = {
  platform: 'X (Twitter)',
  specs: X_SPECS,
}

const COPY_PATH =
  'M20 22H8v-2h12v2ZM8 20H6v-2H4v-2h2V8h2v12Zm14 0h-2V8h2v12ZM4 16H2V4h2v12ZM18 6h2v2H8V6h8V4h2v2Zm-2-2H4V2h12v2Z'
const CHECK_PATH =
  'M20 22H8v-2h12v2ZM8 20H6v-2H4v-2h2V8h2v12Zm14 0h-2V8h2v12Zm-8-3h-2v-2h2v2ZM4 16H2V4h2v12Zm8-1h-2v-2h2v2Zm4 0h-2v-2h2v2Zm2-2h-2v-2h2v2Zm0-7h2v2H8V6h8V4h2v2Zm-2-2H4V2h12v2Z'

const icon = (path, hidden, marker) => ({
  type: 'element',
  tagName: 'svg',
  properties: {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    ariaHidden: 'true',
    className: hidden ? ['code-copy-icon', 'hidden'] : ['code-copy-icon'],
    [marker]: true,
  },
  children: [
    {
      type: 'element',
      tagName: 'path',
      properties: { d: path },
      children: [],
    },
  ],
})

const copyButton = () => ({
  type: 'element',
  tagName: 'button',
  properties: {
    type: 'button',
    className: ['code-copy-button'],
    ariaLabel: 'Copy code',
    dataCodeCopy: true,
  },
  children: [
    icon(COPY_PATH, false, 'dataCopyIcon'),
    icon(CHECK_PATH, true, 'dataCopyCheckIcon'),
  ],
})

const frame = (pre) => ({
  type: 'element',
  tagName: 'div',
  properties: { className: ['code-frame'] },
  children: [
    pre,
    {
      type: 'element',
      tagName: 'div',
      properties: { className: ['code-copy-strip'] },
      children: [copyButton()],
    },
  ],
})

const walk = (node) => {
  if (!Array.isArray(node.children)) return
  node.children = node.children.map((child) => {
    if (child.type !== 'element') return child
    if (child.tagName === 'pre') return frame(child)
    walk(child)
    return child
  })
}

export default function rehypeCodeFrame() {
  return (tree) => walk(tree)
}

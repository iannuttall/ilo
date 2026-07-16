import Copy from 'lucide/dist/esm/icons/copy.mjs'
import CopyCheck from 'lucide/dist/esm/icons/copy-check.mjs'

const icon = (iconNode, hidden, marker) => ({
  type: 'element',
  tagName: 'svg',
  properties: {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ariaHidden: 'true',
    className: hidden ? ['code-copy-icon', 'hidden'] : ['code-copy-icon'],
    [marker]: true,
  },
  children: iconNode.map(([tagName, properties]) => ({
    type: 'element',
    tagName,
    properties,
    children: [],
  })),
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
    icon(Copy, false, 'dataCopyIcon'),
    icon(CopyCheck, true, 'dataCopyCheckIcon'),
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

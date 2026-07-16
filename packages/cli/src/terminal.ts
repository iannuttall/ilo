export const terminalColumns = (
  requested: number | undefined,
  fallback = 120,
) => Math.max(40, requested ?? fallback)

export const wrapTerminalText = (value: string, width: number) => {
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const originalWord of words) {
    const chunks: string[] = []
    let word = originalWord
    while (word.length > width) {
      chunks.push(word.slice(0, width))
      word = word.slice(width)
    }
    if (word) chunks.push(word)
    for (const chunk of chunks) {
      if (!line) {
        line = chunk
      } else if (line.length + chunk.length + 1 <= width) {
        line += ` ${chunk}`
      } else {
        lines.push(line)
        line = chunk
      }
    }
  }
  if (line) lines.push(line)
  return lines.join('\n')
}

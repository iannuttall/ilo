declare global {
  interface Window {
    __OG_READY__?: boolean
    clicky?: {
      goal?: (name: string) => void
    }
    clicky_custom?: {
      visitor?: Record<string, string>
    }
  }
}

export {}

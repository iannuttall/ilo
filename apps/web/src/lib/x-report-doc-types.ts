import type { XReportWithGroup } from '@/lib/x-report-catalog'

export type XReportEvidence = {
  label: string
  detail: string
}

export type XReportMethodStep = {
  title: string
  instruction: string
  evidence: string
}

export type XReportExample = {
  title: string
  sample: string
  finding: string
  decision: string
}

export type XReportSurfaceGuide = {
  summary: string
  steps: string[]
  examples: {
    label: string
    code: string
  }[]
}

export type XReportDoc = XReportWithGroup & {
  lead: string
  question: string
  availability: string
  dataSources: string[]
  bestFor: string[]
  evidence: XReportEvidence[]
  method: XReportMethodStep[]
  checks: string[]
  interpretation: string[]
  caveats: string[]
  returns: string[]
  example: XReportExample
  agentPrompt: string
  surfaces: {
    cli: XReportSurfaceGuide
    mcp: XReportSurfaceGuide
    typescript: XReportSurfaceGuide
  }
  related: string[]
  seoTitle: string
  seoDescription: string
  seoHeading: string
  primaryKeyword: string
}

export type XReportDocGroup = {
  title: string
  description: string
  docs: XReportDoc[]
}

export type XReportSpecificContent = Pick<
  XReportDoc,
  | 'lead'
  | 'question'
  | 'dataSources'
  | 'bestFor'
  | 'evidence'
  | 'method'
  | 'interpretation'
  | 'caveats'
  | 'returns'
  | 'example'
  | 'agentPrompt'
> & {
  surfaceFocus: string
}

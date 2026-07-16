import { audienceResponseReportContent } from '@/lib/x-report-content/audience-response'
import { contentPatternReportContent } from '@/lib/x-report-content/content-patterns'
import { formatBreakdownReportContent } from '@/lib/x-report-content/format-breakdown'
import { nextStepReportContent } from '@/lib/x-report-content/next-steps'
import { performanceReportContent } from '@/lib/x-report-content/performance'
import { timingCadenceReportContent } from '@/lib/x-report-content/timing-cadence'
import type { XReportSpecificContent } from '@/lib/x-report-doc-types'

export const reportContent: Record<string, XReportSpecificContent> = {
  ...performanceReportContent,
  ...contentPatternReportContent,
  ...formatBreakdownReportContent,
  ...timingCadenceReportContent,
  ...audienceResponseReportContent,
  ...nextStepReportContent,
}

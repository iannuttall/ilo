import {
  BlueskyDidTool,
  BlueskyIdTool,
} from '@/components/tools/social/bluesky-tools'
import {
  XSearchTool,
  XThreadUnrollerTool,
  XVideoDownloaderTool,
} from '@/components/tools/social/x-content-tools'
import {
  TwitterFollowerCountTool,
  TwitterIdTool,
  TwitterIdToUsernameTool,
  TwitterProfileAnalyticsTool,
  TwitterProfilePictureDownloaderTool,
} from '@/components/tools/social/x-profile-tools'
import {
  BlueskyLinkPreviewTool,
  ThreadsLinkPreviewTool,
  TwitterCardValidatorTool,
} from '@/components/tools/twitter-card-validator'

/**
 * Client island that renders the interactive widget for a tool page. The slug
 * (without leading slash) selects the widget; the surrounding page chrome stays
 * server-rendered Astro.
 */
const WIDGETS: Record<string, () => React.JSX.Element> = {
  'twitter-search-without-account': XSearchTool,
  'twitter-profile-analytics': TwitterProfileAnalyticsTool,
  'twitter-thread-reader': XThreadUnrollerTool,
  'twitter-video-downloader': XVideoDownloaderTool,
  'twitter-id': TwitterIdTool,
  'twitter-id-to-username': TwitterIdToUsernameTool,
  'twitter-profile-picture-downloader': TwitterProfilePictureDownloaderTool,
  'twitter-follower-count': TwitterFollowerCountTool,
  'twitter-card-validator': TwitterCardValidatorTool,
  'threads-link-preview': ThreadsLinkPreviewTool,
  'bluesky-link-preview': BlueskyLinkPreviewTool,
  'bluesky-id': BlueskyIdTool,
  'bluesky-did': BlueskyDidTool,
}

export function ToolWidget({ slug }: { slug: string }) {
  const Widget = WIDGETS[slug]
  if (!Widget) return null
  return <Widget />
}

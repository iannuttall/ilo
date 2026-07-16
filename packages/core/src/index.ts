export {
  buildXAuthorizeUrl,
  exchangeXCode,
  fetchXMe,
  generateOAuthState,
  generatePkceVerifier,
  normalizeXPostId,
  X_USER_OAUTH_SCOPES,
} from './providers/x/client.js'
export type {
  FxTwitterClientOptions,
  FxTwitterFollowersPage,
  FxTwitterUser,
} from './providers/x/fxtwitter.js'
export {
  FxTwitterError,
  fetchFxTwitterFollowers,
  fetchFxTwitterProfile,
} from './providers/x/fxtwitter.js'
export type { XPostImage, XUploadedImage } from './providers/x/media.js'
export {
  normalizeXPostImages,
  uploadXImage,
  uploadXImages,
  X_MAX_ALT_TEXT_LENGTH,
  X_MAX_IMAGE_BYTES,
  X_MAX_POST_IMAGES,
} from './providers/x/media.js'
export { countXPostText, validateXPostText } from './providers/x/text.js'
export type {
  FollowerMatchKind,
  FollowerResearchClient,
  FollowerSearchGroup,
  FollowerSearchMatch,
  FollowerSearchResult,
  XFollowerProfile,
  XFollowerProfileResult,
  XFollowerSyncInput,
} from './research/followers.js'
export {
  buildProfileAliases,
  classifyFollowerMatch,
  getXFollowerProfile,
  getXFollowersStatus,
  normalizeXHandle,
  parseFollowerSearchTerms,
  searchXFollowers,
  syncAllXFollowers,
  syncXFollowers,
  toFtsQuery,
} from './research/followers.js'
export { parseScheduleTime } from './scheduling/parse.js'
export type { XPostOptions } from './service.js'
export {
  createDraft,
  getDraft,
  listDrafts,
  publishDraft,
  publishPost,
  runScheduler,
  scheduleDraft,
} from './service.js'
export {
  disconnectX,
  readConfig,
  readXCredentials,
  saveXCredentials,
  writeConfig,
} from './storage/config.js'
export type { Draft, DraftImage, DraftStatus } from './storage/database.js'
export type { FollowerSyncState, StoredXProfile } from './storage/followers.js'
export { iloConfigPath, iloDatabasePath, iloHome } from './storage/paths.js'
export { ILO_VERSION } from './version.js'

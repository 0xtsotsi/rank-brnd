/**
 * Rank Tracking Module
 *
 * Exports for the rank tracking feature using DataForSEO API.
 */

// Types from service
export type {
  RankTrackingJobResult,
  KeywordToTrack,
  TrackKeywordsOptions,
  GetKeywordsToTrackOptions,
} from './rank-tracker-service';

// Types from client
export type { TrackKeywordRequest, DomainPosition } from './dataforseo-client';

// Types from dataforseo-types
export type {
  DataForSEORankTrackerError,
  DataForSEORankTrackerOptions,
  DataForSEOAuthConfig,
  SERPDevice,
  SearchEngine,
  SERPType,
  SERPTaskRequest,
  GoogleOrganicSerpTaskRequest,
  SERPSearchParams,
  SERPResponse,
  SERPTaskResult,
  SERPItemBase,
  OrganicItem,
  FeaturedSnippetItem,
  KnowledgePanelItem,
  LocalPackItem,
  SERPItem,
  RankPositionResult,
  RankTrackingResult,
  BulkRankTrackingResult,
  LocationInfo,
} from './dataforseo-types';

export {
  getLocationCode,
  getLocationInfo,
  getLanguageCode,
  COMMON_LOCATIONS,
  COMMON_LANGUAGES,
} from './dataforseo-types';

// Client
export {
  DataForSEORankTracker,
  createDataForSEORankTracker,
  createRankTrackerFromEnv,
} from './dataforseo-client';

// Service
export {
  RankTrackerService,
  createRankTrackerService,
  runRankTrackingJob,
} from './rank-tracker-service';

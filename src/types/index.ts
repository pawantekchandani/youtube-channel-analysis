export interface VideoItem {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  duration: string; // ISO 8601 string (e.g. PT12M30S)
  durationSeconds: number;
  durationFormatted: string; // e.g. "12:30"
  isShort: boolean; // duration <= 180 seconds
  views: number;
  likes: number | 'hidden';
  comments: number | 'hidden';
  categoryId: string;
  defaultAudioLanguage?: string;
  madeForKids: boolean;
  isLiveOrPremiere: boolean;
  tags: string[];
  url: string;
  isOutlier: boolean; // > 2x average views
  outlierMultiplier: number; // e.g. 2.45

  // Sponsored content detection
  sponsored: 'yes' | 'no' | 'unknown';
  sponsorName: string | null;
  sponsorSource: 'flag' | 'description' | 'transcript' | null;
}

export interface ChannelInfo {
  id: string;
  title: string;
  handle: string;
  description: string;
  customUrl?: string;
  avatarUrl: string;
  bannerUrl?: string;
  subscriberCount: number | 'hidden';
  hiddenSubscriberCount: boolean;
  totalViews: number;
  totalVideosCount: number;
  publishedAt?: string;
  country?: string;
}

/** Cadence and view KPIs for one format (Long-form or Shorts) over the 90-day window. */
export interface FormatKPIs {
  count: number;
  weeklyUploadFrequency: number; // uploads per 7 days
  averageUploadGapDays: number; // avg days between consecutive uploads of this format
  averageViews: number;
  medianViews: number;
  totalViews: number;
  averageDurationSeconds: number;
}

export interface SponsorStat {
  name: string;
  count: number;
}

export interface KPIData {
  totalVideos90d: number;
  weeklyUploadFrequency: number; // uploads per 7 days
  averageUploadGapDays: number; // avg days between consecutive uploads
  averageViews: number;
  medianViews: number;
  totalViews90d: number;
  totalLikes90d: number;
  totalComments90d: number;
  shortsCount: number;
  longCount: number;
  shortsPercentage: number;
  longPercentage: number;
  outlierCount: number;
  outlierRate: number; // percentage of videos that are outliers
  highestViews: number;
  lowestViews: number;
  long: FormatKPIs;
  shorts: FormatKPIs;
  sponsoredCount: number;
  sponsoredPercentage: number;
  unknownCount: number;
  sponsors: SponsorStat[];
}

export interface GeminiInsights {
  niche: string;
  subNiche: string;
  channelSummary: string;
  contentPillars: string[];
  topPerformingAngles: Array<{
    angle: string;
    whyItWorks: string;
    avgMultiplier: string;
    exampleVideo?: string;
  }>;
  audiencePersona: {
    targetViewer: string;
    painPoints: string[];
    valueProposition: string;
  };
  competitorTakeaways: string[];
  growthRecommendations: string[];
  recommendedHooks: string[];
}

export interface ChannelAnalysisResponse {
  channel: ChannelInfo;
  kpis: KPIData;
  videos: VideoItem[];
  geminiInsights: GeminiInsights | null;
  fetchedAt: string;
  daysRange: number;
  source: 'api';
  warning?: string;
}

export interface ApiSettings {
  youtubeApiKey: string;
  geminiApiKey: string;
}

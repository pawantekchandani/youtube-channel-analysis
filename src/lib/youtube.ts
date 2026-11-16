import { ChannelInfo, FormatKPIs, KPIData, VideoItem, SponsorStat } from '@/types';
import {
  evaluateTranscriptSponsorship,
  fetchVideoTranscript,
  mapConcurrent,
} from './sponsor';

/**
 * Parses an ISO 8601 duration string (e.g., "PT15M33S", "PT58S", "PT1H2M10S") into seconds.
 */
export function parseISO8601Duration(duration: string): number {
  if (!duration) return 0;

  const regex = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = duration.match(regex);
  if (!matches) return 0;

  const days = parseInt(matches[1] || '0', 10);
  const hours = parseInt(matches[2] || '0', 10);
  const minutes = parseInt(matches[3] || '0', 10);
  const seconds = parseInt(matches[4] || '0', 10);

  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const paddedSecs = secs.toString().padStart(2, '0');

  if (hrs > 0) {
    const paddedMins = mins.toString().padStart(2, '0');
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }

  return `${mins}:${paddedSecs}`;
}

/**
 * Extracts a channel handle, ID, or search username from various user inputs
 */
export function parseChannelInput(input: string): { type: 'handle' | 'id' | 'username' | 'search'; value: string } {
  const trimmed = input.trim();

  // Channel ID direct (starts with UC and 24 chars)
  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return { type: 'id', value: trimmed };
  }

  // URL parsing
  if (trimmed.includes('youtube.com/') || trimmed.includes('youtu.be/')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const pathname = url.pathname;

      // /@handle
      const handleMatch = pathname.match(/@([a-zA-Z0-9_.-]+)/);
      if (handleMatch) {
        return { type: 'handle', value: `@${handleMatch[1]}` };
      }

      // /channel/UC...
      const channelMatch = pathname.match(/\/channel\/(UC[\w-]{22})/);
      if (channelMatch) {
        return { type: 'id', value: channelMatch[1] };
      }

      // /c/username or /user/username
      const customMatch = pathname.match(/\/(c|user)\/([a-zA-Z0-9_.-]+)/);
      if (customMatch) {
        return { type: 'username', value: customMatch[2] };
      }

      // Fallback path segment
      const cleanSegments = pathname.split('/').filter(Boolean);
      if (cleanSegments.length > 0) {
        const lastSegment = cleanSegments[cleanSegments.length - 1];
        if (lastSegment.startsWith('@')) {
          return { type: 'handle', value: lastSegment };
        }
        return { type: 'search', value: lastSegment };
      }
    } catch {
      // Not a valid URL, fall through
    }
  }

  // If starts with @
  if (trimmed.startsWith('@')) {
    return { type: 'handle', value: trimmed };
  }

  // If looks like handle without @ (alphanumeric with underscores, hyphens, dots)
  if (/^[a-zA-Z0-9_.-]{3,30}$/.test(trimmed)) {
    return { type: 'handle', value: `@${trimmed}` };
  }

  return { type: 'search', value: trimmed };
}

/**
 * Computes cadence and view KPIs for a subset of videos (one format) in the 90-day window.
 */
export function calculateFormatKPIs(videos: VideoItem[]): FormatKPIs {
  const count = videos.length;
  if (count === 0) {
    return {
      count: 0,
      weeklyUploadFrequency: 0,
      averageUploadGapDays: 0,
      averageViews: 0,
      medianViews: 0,
      totalViews: 0,
      averageDurationSeconds: 0,
    };
  }

  const totalViews = videos.reduce((acc, v) => acc + v.views, 0);
  const averageViews = Math.round(totalViews / count);

  const sortedViews = videos.map((v) => v.views).sort((a, b) => a - b);
  const mid = Math.floor(count / 2);
  const medianViews =
    count % 2 !== 0 ? sortedViews[mid] : Math.round((sortedViews[mid - 1] + sortedViews[mid]) / 2);

  const weeklyUploadFrequency = parseFloat((count / (90 / 7)).toFixed(1));

  const times = videos.map((v) => new Date(v.publishedAt).getTime()).sort((a, b) => a - b);
  let averageUploadGapDays = 0;
  if (times.length > 1) {
    const totalGapDays = (times[times.length - 1] - times[0]) / (1000 * 60 * 60 * 24);
    averageUploadGapDays = parseFloat((totalGapDays / (times.length - 1)).toFixed(1));
  }

  const totalDurationSeconds = videos.reduce((acc, v) => acc + (v.durationSeconds || 0), 0);
  const averageDurationSeconds = Math.round(totalDurationSeconds / count);

  return {
    count,
    weeklyUploadFrequency,
    averageUploadGapDays,
    averageViews,
    medianViews,
    totalViews,
    averageDurationSeconds,
  };
}

/**
 * Calculates all KPI metrics strictly from accurate video API data in the past 90 days.
 */
export function calculateKPIs(videos: VideoItem[]): KPIData {
  const totalVideos90d = videos.length;

  if (totalVideos90d === 0) {
    return {
      totalVideos90d: 0,
      weeklyUploadFrequency: 0,
      averageUploadGapDays: 0,
      averageViews: 0,
      medianViews: 0,
      totalViews90d: 0,
      totalLikes90d: 0,
      totalComments90d: 0,
      shortsCount: 0,
      longCount: 0,
      shortsPercentage: 0,
      longPercentage: 0,
      outlierCount: 0,
      outlierRate: 0,
      highestViews: 0,
      lowestViews: 0,
      long: calculateFormatKPIs([]),
      shorts: calculateFormatKPIs([]),
      sponsoredCount: 0,
      sponsoredPercentage: 0,
      unknownCount: 0,
      sponsors: [],
    };
  }

  // Views & statistics sums
  const totalViews90d = videos.reduce((acc, v) => acc + (typeof v.views === 'number' ? v.views : 0), 0);
  const totalLikes90d = videos.reduce((acc, v) => acc + (typeof v.likes === 'number' ? v.likes : 0), 0);
  const totalComments90d = videos.reduce((acc, v) => acc + (typeof v.comments === 'number' ? v.comments : 0), 0);
  const averageViews = Math.round(totalViews90d / totalVideos90d);

  // Median views
  const sortedViews = [...videos].map((v) => v.views).sort((a, b) => a - b);
  const mid = Math.floor(sortedViews.length / 2);
  const medianViews =
    sortedViews.length % 2 !== 0
      ? sortedViews[mid]
      : Math.round((sortedViews[mid - 1] + sortedViews[mid]) / 2);

  const highestViews = sortedViews[sortedViews.length - 1] || 0;
  const lowestViews = sortedViews[0] || 0;

  // Shorts vs Long-form (Shorts: duration <= 180 seconds)
  const shortsCount = videos.filter((v) => v.isShort).length;
  const longCount = totalVideos90d - shortsCount;
  const shortsPercentage = Math.round((shortsCount / totalVideos90d) * 100);
  const longPercentage = 100 - shortsPercentage;

  // Weekly upload frequency: (Total Videos in 90 days) / (90 / 7 weeks)
  const weeksInRange = 90 / 7;
  const weeklyUploadFrequency = parseFloat((totalVideos90d / weeksInRange).toFixed(1));

  // Average upload gap in days between consecutive uploads
  const sortedByDateAsc = [...videos].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );

  let averageUploadGapDays = 0;
  if (sortedByDateAsc.length > 1) {
    let totalGapDays = 0;
    for (let i = 1; i < sortedByDateAsc.length; i++) {
      const prevDate = new Date(sortedByDateAsc[i - 1].publishedAt).getTime();
      const currDate = new Date(sortedByDateAsc[i].publishedAt).getTime();
      const gapDays = Math.abs(currDate - prevDate) / (1000 * 60 * 60 * 24);
      totalGapDays += gapDays;
    }
    averageUploadGapDays = parseFloat(
      (totalGapDays / (sortedByDateAsc.length - 1)).toFixed(1)
    );
  }

  // Outliers (> 2x channel average views)
  const outlierThreshold = averageViews * 2;
  const outlierVideos = videos.filter((v) => v.views > outlierThreshold);
  const outlierCount = outlierVideos.length;
  const outlierRate = parseFloat(((outlierCount / totalVideos90d) * 100).toFixed(1));

  // Sponsored content metrics
  const sponsoredVideos = videos.filter((v) => v.sponsored === 'yes');
  const sponsoredCount = sponsoredVideos.length;
  const sponsoredPercentage =
    totalVideos90d > 0 ? Math.round((sponsoredCount / totalVideos90d) * 100) : 0;
  const unknownCount = videos.filter((v) => v.sponsored === 'unknown').length;

  const sponsorMap = new Map<string, number>();
  for (const v of sponsoredVideos) {
    const name = v.sponsorName?.trim() || 'Unnamed';
    sponsorMap.set(name, (sponsorMap.get(name) || 0) + 1);
  }

  const sponsors: SponsorStat[] = Array.from(sponsorMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

  return {
    totalVideos90d,
    weeklyUploadFrequency,
    averageUploadGapDays,
    averageViews,
    medianViews,
    totalViews90d,
    totalLikes90d,
    totalComments90d,
    shortsCount,
    longCount,
    shortsPercentage,
    longPercentage,
    outlierCount,
    outlierRate,
    highestViews,
    lowestViews,
    long: calculateFormatKPIs(videos.filter((v) => !v.isShort)),
    shorts: calculateFormatKPIs(videos.filter((v) => v.isShort)),
    sponsoredCount,
    sponsoredPercentage,
    unknownCount,
    sponsors,
  };
}

/**
 * Marks outlier status (>2x avg) and assigns outlier multipliers
 */
export function enrichVideosWithOutliers(
  videos: VideoItem[],
  avgViews: number
): VideoItem[] {
  const threshold = avgViews * 2;

  return videos.map((video) => {
    const isOutlier = avgViews > 0 && video.views > threshold;
    const outlierMultiplier =
      avgViews > 0 ? parseFloat((video.views / avgViews).toFixed(2)) : 1;

    return {
      ...video,
      isOutlier,
      outlierMultiplier,
    };
  });
}

/**
 * Fetch Channel from YouTube Data API v3
 */
export async function fetchChannelFromYouTube(
  input: string,
  apiKey: string
): Promise<{ channelInfo: ChannelInfo; uploadsPlaylistId: string }> {
  const parsed = parseChannelInput(input);
  const baseUrl = 'https://www.googleapis.com/youtube/v3';

  let channelUrl = '';

  if (parsed.type === 'id') {
    channelUrl = `${baseUrl}/channels?part=snippet,contentDetails,statistics&id=${encodeURIComponent(
      parsed.value
    )}&key=${apiKey}`;
  } else if (parsed.type === 'handle') {
    const cleanHandle = parsed.value.startsWith('@') ? parsed.value : `@${parsed.value}`;
    channelUrl = `${baseUrl}/channels?part=snippet,contentDetails,statistics&forHandle=${encodeURIComponent(
      cleanHandle
    )}&key=${apiKey}`;
  } else if (parsed.type === 'username') {
    channelUrl = `${baseUrl}/channels?part=snippet,contentDetails,statistics&forUsername=${encodeURIComponent(
      parsed.value
    )}&key=${apiKey}`;
  } else {
    // Avoid search.list when possible; only fallback for free-text queries
    const searchUrl = `${baseUrl}/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(
      parsed.value
    )}&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `YouTube Search API error: ${searchRes.statusText}`);
    }
    const searchData = await searchRes.json();
    if (!searchData.items || searchData.items.length === 0) {
      throw new Error(`No YouTube channel found matching "${parsed.value}"`);
    }
    const channelId = searchData.items[0].snippet?.channelId || searchData.items[0].id?.channelId;
    channelUrl = `${baseUrl}/channels?part=snippet,contentDetails,statistics&id=${encodeURIComponent(
      channelId
    )}&key=${apiKey}`;
  }

  const res = await fetch(channelUrl);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `YouTube Channels API error: ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    // If handle search failed, try fallback search
    if (parsed.type === 'handle') {
      const fallbackSearchUrl = `${baseUrl}/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(
        parsed.value
      )}&key=${apiKey}`;
      const searchRes = await fetch(fallbackSearchUrl);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.items && searchData.items.length > 0) {
          const fallbackId = searchData.items[0].snippet?.channelId || searchData.items[0].id?.channelId;
          const fallbackRes = await fetch(
            `${baseUrl}/channels?part=snippet,contentDetails,statistics&id=${encodeURIComponent(
              fallbackId
            )}&key=${apiKey}`
          );
          if (fallbackRes.ok) {
            const fbData = await fallbackRes.json();
            if (fbData.items && fbData.items.length > 0) {
              return extractChannelData(fbData.items[0]);
            }
          }
        }
      }
    }
    throw new Error(`Channel "${parsed.value}" not found on YouTube.`);
  }

  return extractChannelData(data.items[0]);
}

function extractChannelData(item: any): { channelInfo: ChannelInfo; uploadsPlaylistId: string } {
  const snippet = item.snippet || {};
  const stats = item.statistics || {};
  const contentDetails = item.contentDetails || {};

  const uploadsPlaylistId = contentDetails.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error('Could not find uploads playlist for this channel.');
  }

  const hiddenSubscriberCount = Boolean(stats.hiddenSubscriberCount);
  const subscriberCount = hiddenSubscriberCount
    ? 'hidden'
    : parseInt(stats.subscriberCount || '0', 10);

  const channelInfo: ChannelInfo = {
    id: item.id,
    title: snippet.title || 'Unknown Channel',
    handle: snippet.customUrl || (item.id ? `@${item.id}` : ''),
    description: snippet.description || '',
    customUrl: snippet.customUrl,
    avatarUrl:
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      '',
    bannerUrl: item.brandingSettings?.image?.bannerExternalUrl,
    subscriberCount,
    hiddenSubscriberCount,
    totalViews: parseInt(stats.viewCount || '0', 10),
    totalVideosCount: parseInt(stats.videoCount || '0', 10),
    publishedAt: snippet.publishedAt,
    country: snippet.country,
  };

  return { channelInfo, uploadsPlaylistId };
}

export interface FetchVideosResult {
  videos: VideoItem[];
  warning?: string;
}

/**
 * Fetch all videos uploaded by the channel in the past 90 days.
 * Includes a video only when its API publishedAt is within the last 90 days.
 * Raised cap of 2,500 videos with a visible warning if hit.
 */
export async function fetchPast90DaysVideos(
  uploadsPlaylistId: string,
  apiKey: string
): Promise<FetchVideosResult> {
  const baseUrl = 'https://www.googleapis.com/youtube/v3';
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  // Add a small safety buffer for playlist ordering so items near boundary are not missed
  const playlistCutoff = new Date(Date.now() - 92 * 24 * 60 * 60 * 1000);

  const MAX_VIDEOS = 2500;
  let playlistVideoItems: Array<{ videoId: string; publishedAt?: string }> = [];
  let nextPageToken: string | undefined = undefined;
  let reachedOlder = false;
  let capHit = false;

  // 1. Fetch playlist items page by page until older than 90 days
  do {
    let url = `${baseUrl}/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(
      uploadsPlaylistId
    )}&maxResults=50&key=${apiKey}`;
    if (nextPageToken) {
      url += `&pageToken=${encodeURIComponent(nextPageToken)}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch uploads playlist: ${res.statusText}`);
    }

    const data = await res.json();
    const items = data.items || [];

    if (items.length === 0) break;

    for (const item of items) {
      const publishedAt = item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt;
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;

      if (!videoId) continue;

      if (publishedAt) {
        const itemDate = new Date(publishedAt);
        if (itemDate < playlistCutoff) {
          reachedOlder = true;
          break;
        }
      }

      playlistVideoItems.push({
        videoId,
        publishedAt,
      });

      if (playlistVideoItems.length >= MAX_VIDEOS) {
        capHit = true;
        break;
      }
    }

    if (capHit) break;
    nextPageToken = data.nextPageToken;
  } while (nextPageToken && !reachedOlder);

  if (playlistVideoItems.length === 0) {
    return { videos: [] };
  }

  // 2. Fetch full video statistics, duration, status, and live details in chunks of 50
  const videoIds = playlistVideoItems.map((v) => v.videoId);
  const chunks: string[][] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }

  const rawVideos: VideoItem[] = [];

  for (const chunk of chunks) {
    const videosUrl = `${baseUrl}/videos?part=snippet,contentDetails,statistics,status,liveStreamingDetails&id=${encodeURIComponent(
      chunk.join(',')
    )}&key=${apiKey}`;
    const res = await fetch(videosUrl);
    if (!res.ok) {
      continue;
    }

    const data = await res.json();
    const items = data.items || [];

    for (const item of items) {
      const publishedAt = item.snippet?.publishedAt;
      if (!publishedAt) continue;

      // Filter strictly to the last 90 days
      const videoDate = new Date(publishedAt);
      if (videoDate < ninetyDaysAgo) {
        continue;
      }

      const durationIso = item.contentDetails?.duration || 'PT0S';
      const durationSeconds = parseISO8601Duration(durationIso);

      // Shorts rule: 180 seconds or less. Do not use title keywords.
      const isShort = durationSeconds <= 180;

      // Views
      const views = parseInt(item.statistics?.viewCount || '0', 10);

      // Likes: if hidden by API, show 'hidden'
      const likes =
        item.statistics?.likeCount !== undefined
          ? parseInt(item.statistics.likeCount, 10)
          : 'hidden';

      // Comments: if disabled/hidden by API, show 'hidden'
      const comments =
        item.statistics?.commentCount !== undefined
          ? parseInt(item.statistics.commentCount, 10)
          : 'hidden';

      // Category ID
      const categoryId = item.snippet?.categoryId || '';

      // Default audio language
      const defaultAudioLanguage =
        item.snippet?.defaultAudioLanguage || item.snippet?.defaultLanguage || undefined;

      // Made for kids (from part=status)
      const madeForKids = Boolean(item.status?.madeForKids);

      // Live / premiere flag (from liveStreamingDetails or snippet.liveBroadcastContent)
      const isLiveOrPremiere = Boolean(
        item.liveStreamingDetails ||
          (item.snippet?.liveBroadcastContent && item.snippet.liveBroadcastContent !== 'none')
      );

      rawVideos.push({
        id: item.id,
        title: item.snippet?.title || 'Untitled',
        description: item.snippet?.description || '',
        publishedAt,
        thumbnail:
          item.snippet?.thumbnails?.maxres?.url ||
          item.snippet?.thumbnails?.standard?.url ||
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`,
        duration: durationIso,
        durationSeconds,
        durationFormatted: formatDuration(durationSeconds),
        isShort,
        views,
        likes,
        comments,
        categoryId,
        defaultAudioLanguage,
        madeForKids,
        isLiveOrPremiere,
        tags: item.snippet?.tags || [],
        url: `https://www.youtube.com/watch?v=${item.id}`,
        isOutlier: false,
        outlierMultiplier: 1,
        sponsored: 'no',
        sponsorName: null,
        sponsorSource: null,
      });
    }
  }

  // Fetch transcript for EVERY video in the 90-day window (concurrency 3)
  const transcriptResults = await mapConcurrent(rawVideos, 3, async (video) => {
    const transcriptText = await fetchVideoTranscript(video.id);
    return { id: video.id, transcriptText };
  });

  const transcriptMap = new Map(transcriptResults.map((r) => [r.id, r.transcriptText]));

  for (const video of rawVideos) {
    const transcriptText = transcriptMap.has(video.id)
      ? transcriptMap.get(video.id)!
      : null;

    const evalResult = evaluateTranscriptSponsorship(transcriptText);

    video.sponsored = evalResult.sponsored;
    video.sponsorName = evalResult.sponsorName;
    video.sponsorSource = evalResult.sponsorSource;
    video.sponsorSnippet = evalResult.matchedSnippet;
  }

  // Calculate avg views and enrich outlier flags
  const totalViews = rawVideos.reduce((acc, v) => acc + (typeof v.views === 'number' ? v.views : 0), 0);
  const avgViews = rawVideos.length > 0 ? Math.round(totalViews / rawVideos.length) : 0;
  const enrichedVideos = enrichVideosWithOutliers(rawVideos, avgViews);

  let warning: string | undefined = undefined;
  if (capHit) {
    warning = `Channel upload cap of ${MAX_VIDEOS} videos reached. Some older uploads within the 90-day window may not be displayed.`;
  }

  return {
    videos: enrichedVideos,
    warning,
  };
}

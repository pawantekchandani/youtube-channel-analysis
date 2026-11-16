import { NextRequest, NextResponse } from 'next/server';
import {
  fetchChannelFromYouTube,
  fetchPast90DaysVideos,
  calculateKPIs,
} from '@/lib/youtube';
import { analyzeChannelWithGemini } from '@/lib/gemini';

export const maxDuration = 60; // Allow sufficient time for YouTube API + Gemini AI

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      channelQuery,
      youtubeApiKey: clientYtKey,
      geminiApiKey: clientGeminiKey,
    } = body;

    if (!channelQuery || !channelQuery.trim()) {
      return NextResponse.json(
        { error: 'Please enter a YouTube channel URL, @handle, or Channel ID.' },
        { status: 400 }
      );
    }

    // Check environment variables as fallback
    const ytKey = clientYtKey?.trim() || process.env.YOUTUBE_API_KEY?.trim() || '';
    const geminiKey = clientGeminiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || '';

    // If no YouTube Data API v3 key provided, return error requesting key
    if (!ytKey) {
      return NextResponse.json(
        {
          error:
            'YouTube Data API v3 key is required. Please set YOUTUBE_API_KEY in .env.local or enter your API key in Settings (gear icon).',
        },
        { status: 400 }
      );
    }

    // 1. Fetch Channel Info
    const { channelInfo, uploadsPlaylistId } = await fetchChannelFromYouTube(channelQuery.trim(), ytKey);

    // 2. Fetch past 90 days videos (filtered strictly to past 90 days)
    const { videos, warning } = await fetchPast90DaysVideos(uploadsPlaylistId, ytKey);

    // 3. Compute KPI Metrics strictly from accurate API data
    const kpis = calculateKPIs(videos);

    // 4. Gemini Strategic Analysis
    const geminiInsights = await analyzeChannelWithGemini(channelInfo, videos, geminiKey);

    return NextResponse.json({
      channel: channelInfo,
      kpis,
      videos,
      geminiInsights,
      fetchedAt: new Date().toISOString(),
      daysRange: 90,
      source: 'api',
      warning,
    });
  } catch (error: any) {
    console.error('API /api/analyze error:', error);
    return NextResponse.json(
      {
        error: error.message || 'An unexpected error occurred while analyzing the YouTube channel.',
      },
      { status: 500 }
    );
  }
}

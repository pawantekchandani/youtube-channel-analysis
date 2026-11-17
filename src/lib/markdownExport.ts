import { ChannelAnalysisResponse } from '@/types';
import { formatCompactNumber, formatCalendarDate } from './formatters';
import { formatDuration } from './format';

/**
 * Generates a structured Markdown report from the analyzed channel data.
 */
export function generateMarkdownReport(data: ChannelAnalysisResponse): string {
  const { channel, kpis, videos, geminiInsights, fetchedAt } = data;
  const outliers = videos.filter((v) => v.isOutlier);

  const lines: string[] = [];

  // Header
  lines.push(`# YouTube Channel Public Metrics Report`);
  lines.push(`**Channel:** ${channel.title} (${channel.handle})`);
  lines.push(`**Channel ID:** ${channel.id}`);
  lines.push(`**Generated At:** ${new Date(fetchedAt).toLocaleString()}`);
  lines.push(`**Data Source:** YouTube Data API v3`);
  lines.push(`**Channel Link:** ${channel.customUrl ? `https://www.youtube.com/${channel.customUrl}` : `https://www.youtube.com/channel/${channel.id}`}`);
  lines.push('');

  // 1. Channel Overview
  const subsFormatted =
    channel.hiddenSubscriberCount || channel.subscriberCount === 'hidden'
      ? 'Hidden'
      : `${formatCompactNumber(channel.subscriberCount)} (${channel.subscriberCount.toLocaleString()})`;

  lines.push(`## 1. Channel Overview`);
  lines.push(`- **Subscribers:** ${subsFormatted}`);
  lines.push(`- **Lifetime Views:** ${formatCompactNumber(channel.totalViews)} (${channel.totalViews.toLocaleString()})`);
  lines.push(`- **Total Uploads (Lifetime):** ${channel.totalVideosCount.toLocaleString()}`);
  if (channel.country) lines.push(`- **Country:** ${channel.country}`);
  if (channel.publishedAt) lines.push(`- **Joined Date:** ${formatCalendarDate(channel.publishedAt)}`);
  lines.push(`- **Bio/Description:**`);
  lines.push(`  > ${channel.description ? channel.description.replace(/\n+/g, ' ') : 'No description provided.'}`);
  lines.push('');

  // 2. 90-Day Upload & Performance KPIs
  lines.push(`## 2. 90-Day Upload Cadence & Performance KPIs`);
  lines.push(`| Metric | Value | Insights / Benchmark |`);
  lines.push(`| :--- | :--- | :--- |`);
  lines.push(`| **All-Time Videos** | ${channel.totalVideosCount.toLocaleString()} videos | Public uploads since channel start |`);
  lines.push(`| **Analyzed Uploads (90d)** | ${kpis.totalVideos90d} videos | All formats combined |`);
  lines.push(`| **Total 90d Views** | ${formatCompactNumber(kpis.totalViews90d)} (${kpis.totalViews90d.toLocaleString()}) | Total views across 90-day uploads |`);
  lines.push('');
  lines.push(`| Metric | Long-form (>180s) | Shorts (≤180s) |`);
  lines.push(`| :--- | :--- | :--- |`);
  lines.push(`| **Videos (90d)** | ${kpis.long.count} | ${kpis.shorts.count} |`);
  lines.push(`| **Weekly Upload Frequency** | ${kpis.long.weeklyUploadFrequency} vids/week | ${kpis.shorts.weeklyUploadFrequency} vids/week |`);
  lines.push(`| **Average Upload Gap** | ${kpis.long.averageUploadGapDays} days | ${kpis.shorts.averageUploadGapDays} days |`);
  lines.push(`| **Average Views** | ${formatCompactNumber(kpis.long.averageViews)} | ${formatCompactNumber(kpis.shorts.averageViews)} |`);
  lines.push(`| **Median Views** | ${formatCompactNumber(kpis.long.medianViews)} | ${formatCompactNumber(kpis.shorts.medianViews)} |`);
  lines.push(`| **Total Views** | ${formatCompactNumber(kpis.long.totalViews)} | ${formatCompactNumber(kpis.shorts.totalViews)} |`);
  lines.push(`| **Avg Length** | ${kpis.long.count > 0 ? formatDuration(kpis.long.averageDurationSeconds) : '—'} | ${kpis.shorts.count > 0 ? formatDuration(kpis.shorts.averageDurationSeconds) : '—'} |`);
  lines.push('');
  lines.push(`| Metric | Value | Insights / Benchmark |`);
  lines.push(`| :--- | :--- | :--- |`);
  lines.push(`| **Shorts vs. Long-form** | ${kpis.longPercentage}% Long / ${kpis.shortsPercentage}% Shorts | ${kpis.longCount} Long-form, ${kpis.shortsCount} Shorts (≤180s) |`);
  lines.push(`| **Outlier Hit Rate (>2x Avg)** | ${kpis.outlierCount} videos (${kpis.outlierRate}%) | Videos generating more than 2x channel average |`);
  lines.push(`| **Highest Video Views** | ${formatCompactNumber(kpis.highestViews)} | Peak performer in window |`);
  lines.push(`| **Lowest Video Views** | ${formatCompactNumber(kpis.lowestViews)} | Minimum performer in window |`);
  lines.push('');

  // 3. Sponsored Content Analysis
  lines.push(`## 3. Sponsored Content Analysis (90d)`);
  lines.push(`> Detection is from video transcripts only. Videos without transcripts are Unknown.`);
  lines.push('');
  lines.push(`| Metric | Value | Insights / Benchmark |`);
  lines.push(`| :--- | :--- | :--- |`);
  lines.push(`| **Sponsored Uploads** | ${kpis.sponsoredCount} videos (${kpis.sponsoredPercentage}%) | Videos identified with commercial sponsorship from transcript |`);
  lines.push(`| **Inconclusive / Unknown** | ${kpis.unknownCount} videos | Transcripts unavailable to verify |`);
  lines.push('');

  if (kpis.sponsors && kpis.sponsors.length > 0) {
    lines.push(`### Detected Sponsors (from Transcript)`);
    lines.push(`| Sponsor | Videos |`);
    lines.push(`| :--- | :--- |`);
    kpis.sponsors.forEach((s) => {
      lines.push(`| **${s.name}** | ${s.count} |`);
    });
    lines.push('');
  } else {
    lines.push(`*No sponsored videos detected in the 90-day window.*`);
    lines.push('');
  }

  // 4. Gemini Strategic AI Niche & Content Dossier
  if (geminiInsights) {
    lines.push(`## 4. Gemini AI Strategic Niche & Algorithmic Dossier`);
    lines.push(`- **Primary Niche:** ${geminiInsights.niche}`);
    lines.push(`- **Sub-Niche:** ${geminiInsights.subNiche}`);
    lines.push('');
    if (geminiInsights.channelSummary) {
      lines.push(`### Strategic Positioning`);
      lines.push(`${geminiInsights.channelSummary}`);
      lines.push('');
    }

    if (geminiInsights.contentPillars && geminiInsights.contentPillars.length > 0) {
      lines.push(`### Core Content Pillars`);
      geminiInsights.contentPillars.forEach((p, idx) => {
        lines.push(`${idx + 1}. **${p}**`);
      });
      lines.push('');
    }

    if (geminiInsights.topPerformingAngles && geminiInsights.topPerformingAngles.length > 0) {
      lines.push(`### Top-Performing Content Angles`);
      geminiInsights.topPerformingAngles.forEach((angle, idx) => {
        lines.push(`#### ${idx + 1}. ${angle.angle} ${angle.avgMultiplier ? `(🔥 ${angle.avgMultiplier} Avg)` : ''}`);
        lines.push(`- **Why It Works:** ${angle.whyItWorks}`);
        if (angle.exampleVideo) lines.push(`- **Example:** *"${angle.exampleVideo}"*`);
        lines.push('');
      });
    }

    if (geminiInsights.audiencePersona) {
      lines.push(`### Target Audience Persona`);
      lines.push(`- **Viewer Profile:** ${geminiInsights.audiencePersona.targetViewer}`);
      lines.push(`- **Core Value Proposition:** *"${geminiInsights.audiencePersona.valueProposition}"*`);
      if (geminiInsights.audiencePersona.painPoints?.length > 0) {
        lines.push(`- **Key Viewer Pain Points:**`);
        geminiInsights.audiencePersona.painPoints.forEach((pain) => {
          lines.push(`  - ${pain}`);
        });
      }
      lines.push('');
    }

    if (geminiInsights.competitorTakeaways && geminiInsights.competitorTakeaways.length > 0) {
      lines.push(`### Actionable Competitor Takeaways`);
      geminiInsights.competitorTakeaways.forEach((t) => lines.push(`- [x] ${t}`));
      lines.push('');
    }

    if (geminiInsights.growthRecommendations && geminiInsights.growthRecommendations.length > 0) {
      lines.push(`### Growth Recommendations`);
      geminiInsights.growthRecommendations.forEach((r) => lines.push(`- 🚀 ${r}`));
      lines.push('');
    }

    if (geminiInsights.recommendedHooks && geminiInsights.recommendedHooks.length > 0) {
      lines.push(`### High-Converting Next Video Hooks`);
      geminiInsights.recommendedHooks.forEach((hook, i) => lines.push(`${i + 1}. *"${hook}"*`));
      lines.push('');
    }
  }

  // 5. Viral Outlier Videos
  if (outliers.length > 0) {
    lines.push(`## 5. Viral Outlier Videos (>2x Channel Average Views)`);
    lines.push(`| Title | Views | Multiplier | Duration | Link |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
    outliers.forEach((v) => {
      const cleanTitle = v.title.replace(/\|/g, '-');
      lines.push(`| **${cleanTitle}** | ${formatCompactNumber(v.views)} (${v.views.toLocaleString()}) | 🔥 ${v.outlierMultiplier}x Avg | ${v.durationFormatted} | [Watch on YouTube](${v.url}) |`);
    });
    lines.push('');
  }

  // 6. Full Video Performance Catalog
  lines.push(`## 6. Complete Video Performance Catalog (${videos.length} Videos)`);
  lines.push(`| # | Video ID | Title | Published | Duration (s) | Format | Views | Likes | Comments | Sponsored | Sponsor | Category | Audio Lang | Made for Kids | Live/Premiere | Link |`);
  lines.push(`| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);
  videos.forEach((v, idx) => {
    const cleanTitle = v.title.replace(/\|/g, '-');
    const format = v.isShort ? 'Short' : 'Long-form';
    const likesStr = v.likes === 'hidden' ? 'hidden' : v.likes.toLocaleString();
    const commentsStr = v.comments === 'hidden' ? 'hidden' : v.comments.toLocaleString();
    const kidsStr = v.madeForKids ? 'Yes' : 'No';
    const liveStr = v.isLiveOrPremiere ? 'Yes' : 'No';
    const langStr = v.defaultAudioLanguage || '—';

    const sponsorDisplay = v.sponsorName ? v.sponsorName : (v.sponsored === 'yes' ? 'Unnamed' : '—');
    const sponsoredDisplay = v.sponsored === 'yes' ? 'Yes' : (v.sponsored === 'no' ? 'No' : 'Unknown');
    lines.push(`| ${idx + 1} | ${v.id} | ${cleanTitle} | ${formatCalendarDate(v.publishedAt)} | ${v.durationSeconds}s | ${format} | ${v.views.toLocaleString()} | ${likesStr} | ${commentsStr} | ${sponsoredDisplay} | ${sponsorDisplay} | ${v.categoryId || '—'} | ${langStr} | ${kidsStr} | ${liveStr} | [Watch](${v.url}) |`);
  });
  lines.push('');

  lines.push(`---`);
  lines.push(`*Report generated by TubePulse YouTube Public Metrics Studio*`);

  return lines.join('\n');
}

/**
 * Initiates an instant download of the Markdown file in the browser.
 */
export function downloadMarkdownReport(data: ChannelAnalysisResponse): void {
  const content = generateMarkdownReport(data);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const cleanTitle = (data.channel.title || 'Channel').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanTitle}_YouTube_Analytics_Report.md`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

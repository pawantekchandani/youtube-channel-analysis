'use client';

import React, { useState, useMemo } from 'react';
import { VideoItem } from '@/types';
import {
  formatCompactNumber,
  formatRelativeDate,
  formatCalendarDate,
} from '@/lib/formatters';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Flame,
  ThumbsUp,
  MessageSquare,
  Clock,
  Film,
  Zap,
  Copy,
  Check,
  Download,
  Radio,
  Baby,
} from 'lucide-react';

interface VideoTableProps {
  videos: VideoItem[];
  averageViews: number;
}

type SortField = 'views' | 'date' | 'multiplier' | 'duration' | 'likes' | 'comments';
type SortOrder = 'asc' | 'desc';
type FilterType = 'all' | 'outliers' | 'long' | 'shorts';

export const VideoTable: React.FC<VideoTableProps> = ({
  videos,
  averageViews,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('views');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [copiedTsv, setCopiedTsv] = useState(false);

  const maxViews = useMemo(() => {
    return Math.max(...videos.map((v) => v.views), 1);
  }, [videos]);

  const outlierCount = useMemo(() => {
    return videos.filter((v) => v.isOutlier).length;
  }, [videos]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedVideos = useMemo(() => {
    return videos
      .filter((video) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = video.title.toLowerCase().includes(q);
          const matchesId = video.id.toLowerCase().includes(q);
          const matchesCategory = video.categoryId.toLowerCase().includes(q);
          const matchesLang = (video.defaultAudioLanguage || '').toLowerCase().includes(q);
          const matchesTags = video.tags.some((t) => t.toLowerCase().includes(q));
          const matchesSponsor = (video.sponsorName || '').toLowerCase().includes(q);
          if (!matchesTitle && !matchesId && !matchesCategory && !matchesLang && !matchesTags && !matchesSponsor) {
            return false;
          }
        }

        if (filterType === 'outliers') return video.isOutlier;
        if (filterType === 'shorts') return video.isShort;
        if (filterType === 'long') return !video.isShort;

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'views') {
          comparison = a.views - b.views;
        } else if (sortField === 'date') {
          comparison = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
        } else if (sortField === 'multiplier') {
          comparison = a.outlierMultiplier - b.outlierMultiplier;
        } else if (sortField === 'duration') {
          comparison = a.durationSeconds - b.durationSeconds;
        } else if (sortField === 'likes') {
          const aLikes = typeof a.likes === 'number' ? a.likes : -1;
          const bLikes = typeof b.likes === 'number' ? b.likes : -1;
          comparison = aLikes - bLikes;
        } else if (sortField === 'comments') {
          const aComments = typeof a.comments === 'number' ? a.comments : -1;
          const bComments = typeof b.comments === 'number' ? b.comments : -1;
          comparison = aComments - bComments;
        }

        return sortOrder === 'desc' ? -comparison : comparison;
      });
  }, [videos, searchQuery, filterType, sortField, sortOrder]);

  const copyToClipboardTSV = () => {
    const headers = [
      'Video ID',
      'Title',
      'Published At',
      'Duration (seconds)',
      'Duration Formatted',
      'Is Short',
      'Views',
      'Likes',
      'Comments',
      'Category ID',
      'Default Audio Language',
      'Made For Kids',
      'Live/Premiere',
      'Sponsored',
      'Sponsor Name',
      'Sponsor Source',
      'URL',
    ];

    const rows = filteredAndSortedVideos.map((v) => [
      v.id,
      v.title.replace(/\t/g, ' '),
      v.publishedAt,
      v.durationSeconds,
      v.durationFormatted,
      v.isShort ? 'TRUE' : 'FALSE',
      v.views,
      v.likes === 'hidden' ? 'hidden' : v.likes,
      v.comments === 'hidden' ? 'hidden' : v.comments,
      v.categoryId,
      v.defaultAudioLanguage || '',
      v.madeForKids ? 'TRUE' : 'FALSE',
      v.isLiveOrPremiere ? 'TRUE' : 'FALSE',
      v.sponsored,
      v.sponsorName || '',
      v.sponsorSource || '',
      v.url,
    ]);

    const tsvContent = [
      headers.join('\t'),
      ...rows.map((r) => r.join('\t')),
    ].join('\n');

    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopiedTsv(true);
      setTimeout(() => setCopiedTsv(false), 2000);
    });
  };

  const downloadCSV = () => {
    const headers = [
      'Video ID',
      'Title',
      'Published At',
      'Duration (seconds)',
      'Duration Formatted',
      'Is Short',
      'Views',
      'Likes',
      'Comments',
      'Category ID',
      'Default Audio Language',
      'Made For Kids',
      'Live/Premiere',
      'Sponsored',
      'Sponsor Name',
      'Sponsor Source',
      'URL',
    ];

    const escapeCsv = (val: any) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredAndSortedVideos.map((v) => [
      v.id,
      v.title,
      v.publishedAt,
      v.durationSeconds,
      v.durationFormatted,
      v.isShort,
      v.views,
      v.likes === 'hidden' ? 'hidden' : v.likes,
      v.comments === 'hidden' ? 'hidden' : v.comments,
      v.categoryId,
      v.defaultAudioLanguage || '',
      v.madeForKids,
      v.isLiveOrPremiere,
      v.sponsored,
      v.sponsorName || '',
      v.sponsorSource || '',
      v.url,
    ]);

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map((r) => r.map(escapeCsv).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `youtube_videos_90days.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 shadow-xl space-y-5">
      {/* Table Header Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">
              Public Video Metrics Catalog (90 Days)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700/60">
              {filteredAndSortedVideos.length} of {videos.length} videos
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Exact API metrics returned by YouTube Data API v3. Hidden values are reported as &quot;hidden&quot;.
          </p>
        </div>

        {/* Action buttons: Copy for spreadsheet & CSV export */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={copyToClipboardTSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white transition shadow-sm active:scale-95"
            title="Copy all rows in Tab-Separated format to paste directly into Google Sheets or Excel"
          >
            {copiedTsv ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied TSV!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy for Spreadsheet (TSV)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={downloadCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white transition shadow-sm active:scale-95"
            title="Download video rows as CSV file"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, ID, category, language, or tags..."
            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/40 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-zinc-950/60 p-1 rounded-xl border border-zinc-800 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({videos.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('outliers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              filterType === 'outliers'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-amber-400'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
            <span>Outliers ({outlierCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('long')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap ${
              filterType === 'long'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Film className="w-3 h-3 text-red-400" />
            <span>Long-form</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('shorts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap ${
              filterType === 'shorts'
                ? 'bg-zinc-800 text-purple-300 shadow-sm'
                : 'text-zinc-400 hover:text-purple-300'
            }`}
          >
            <Zap className="w-3 h-3 text-purple-400" />
            <span>Shorts (≤180s)</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-zinc-950/80 text-zinc-400 text-xs uppercase tracking-wider font-semibold border-b border-zinc-800">
            <tr>
              <th className="py-3 px-4">Video & Details</th>
              <th
                onClick={() => handleSort('date')}
                className="py-3 px-3 cursor-pointer hover:text-white transition whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Published</span>
                  {sortField === 'date' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('duration')}
                className="py-3 px-3 cursor-pointer hover:text-white transition whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Duration</span>
                  {sortField === 'duration' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('views')}
                className="py-3 px-4 cursor-pointer hover:text-white transition whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Views</span>
                  {sortField === 'views' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('likes')}
                className="py-3 px-3 cursor-pointer hover:text-white transition whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Likes</span>
                  {sortField === 'likes' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('comments')}
                className="py-3 px-3 cursor-pointer hover:text-white transition whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Comments</span>
                  {sortField === 'comments' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>
              <th className="py-3 px-3 whitespace-nowrap">Meta</th>
              <th className="py-3 px-3 whitespace-nowrap">Sponsored</th>
              <th className="py-3 px-3 whitespace-nowrap">Sponsor</th>
              <th
                onClick={() => handleSort('multiplier')}
                className="py-3 px-4 cursor-pointer hover:text-white transition text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Multiplier</span>
                  {sortField === 'multiplier' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filteredAndSortedVideos.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-zinc-500">
                  No videos found matching your filters.
                </td>
              </tr>
            ) : (
              filteredAndSortedVideos.map((video) => {
                const viewPercentage = Math.min(100, (video.views / maxViews) * 100);

                const likesDisplay =
                  video.likes === 'hidden'
                    ? 'hidden'
                    : formatCompactNumber(video.likes);

                const commentsDisplay =
                  video.comments === 'hidden'
                    ? 'hidden'
                    : formatCompactNumber(video.comments);

                return (
                  <tr
                    key={video.id}
                    className={`hover:bg-zinc-800/40 transition group ${
                      video.isOutlier ? 'bg-amber-500/[0.03]' : ''
                    }`}
                  >
                    {/* Video Column */}
                    <td className="py-3 px-4 max-w-sm sm:max-w-md">
                      <div className="flex items-start gap-3">
                        {/* Thumbnail */}
                        <div className="relative w-24 sm:w-28 h-14 sm:h-16 shrink-0 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/60 shadow">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=320&auto=format&fit=crop&q=80';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                          <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 font-mono text-[10px] text-zinc-200">
                            {video.durationFormatted}
                          </span>
                        </div>

                        {/* Title and tags */}
                        <div className="flex-1 min-w-0">
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-zinc-200 hover:text-white transition line-clamp-2 text-xs sm:text-sm leading-snug group-hover:text-red-400"
                            title={video.title}
                          >
                            {video.title}
                          </a>

                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-[10px]">
                            <span className="font-mono text-zinc-500 bg-zinc-800/80 px-1 py-0.5 rounded border border-zinc-700/50">
                              ID: {video.id}
                            </span>

                            {video.isShort ? (
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                                Short
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium border border-zinc-700/60">
                                Long-form
                              </span>
                            )}

                            {video.isOutlier && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                <Flame className="w-2.5 h-2.5 fill-amber-400" />
                                {video.outlierMultiplier}x Avg
                              </span>
                            )}

                            {video.isLiveOrPremiere && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium border border-rose-500/30">
                                <Radio className="w-2.5 h-2.5 text-rose-400" /> Live/Premiere
                              </span>
                            )}

                            {video.madeForKids && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-medium border border-sky-500/30">
                                <Baby className="w-2.5 h-2.5 text-sky-400" /> Kids
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Published Date */}
                    <td className="py-3 px-3 text-zinc-400 whitespace-nowrap">
                      <div className="text-zinc-200 font-medium text-xs">
                        {formatCalendarDate(video.publishedAt)}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {formatRelativeDate(video.publishedAt)}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-3 text-zinc-300 font-mono text-xs whitespace-nowrap">
                      <div>{video.durationFormatted}</div>
                      <div className="text-[10px] text-zinc-500">{video.durationSeconds}s</div>
                    </td>

                    {/* Views & Bar */}
                    <td className="py-3 px-4 min-w-[120px]">
                      <div className="font-bold text-white text-sm" title={video.views.toLocaleString()}>
                        {formatCompactNumber(video.views)}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {video.views.toLocaleString()}
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1 max-w-[100px]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            video.isOutlier
                              ? 'bg-gradient-to-r from-amber-500 to-red-500'
                              : 'bg-zinc-500'
                          }`}
                          style={{ width: `${viewPercentage}%` }}
                        />
                      </div>
                    </td>

                    {/* Likes */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs">
                        <ThumbsUp className="w-3 h-3 text-zinc-400" />
                        <span
                          className={video.likes === 'hidden' ? 'italic text-zinc-500' : 'text-zinc-300 font-medium'}
                          title={typeof video.likes === 'number' ? video.likes.toLocaleString() : 'hidden'}
                        >
                          {likesDisplay}
                        </span>
                      </div>
                    </td>

                    {/* Comments */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs">
                        <MessageSquare className="w-3 h-3 text-zinc-400" />
                        <span
                          className={video.comments === 'hidden' ? 'italic text-zinc-500' : 'text-zinc-300 font-medium'}
                          title={typeof video.comments === 'number' ? video.comments.toLocaleString() : 'hidden'}
                        >
                          {commentsDisplay}
                        </span>
                      </div>
                    </td>

                    {/* Meta: Category & Audio Language */}
                    <td className="py-3 px-3 text-zinc-400 whitespace-nowrap text-xs">
                      <div>Cat: <span className="text-zinc-300 font-mono">{video.categoryId || '—'}</span></div>
                      <div>Lang: <span className="text-zinc-300">{video.defaultAudioLanguage || '—'}</span></div>
                    </td>

                    {/* Sponsored */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {video.sponsored === 'yes' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-xs border border-emerald-500/30">
                          Yes
                        </span>
                      ) : video.sponsored === 'no' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium text-xs border border-zinc-700/50">
                          No
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-800/60 text-zinc-500 italic text-xs border border-zinc-800"
                          title="Transcript unavailable to verify sponsorship"
                        >
                          Unknown
                        </span>
                      )}
                    </td>

                    {/* Sponsor Name & Source */}
                    <td className="py-3 px-3 whitespace-nowrap text-xs">
                      {video.sponsorName ? (
                        <div>
                          <div
                            className="text-zinc-200 font-medium max-w-[130px] truncate"
                            title={video.sponsorName}
                          >
                            {video.sponsorName}
                          </div>
                          <div className="text-[10px] text-zinc-500 capitalize">
                            via {video.sponsorSource}
                          </div>
                        </div>
                      ) : video.sponsored === 'yes' ? (
                        <div>
                          <div className="text-zinc-400 italic text-xs">Unnamed</div>
                          <div className="text-[10px] text-zinc-500 capitalize">
                            via {video.sponsorSource || 'flag'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Multiplier Badge */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {video.isOutlier ? (
                        <div className="inline-flex flex-col items-end">
                          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-red-500/20 text-amber-300 font-bold text-xs border border-amber-500/40 shadow-sm flex items-center gap-1">
                            <Flame className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {video.outlierMultiplier}x
                          </span>
                          <span className="text-[10px] text-zinc-500 mt-0.5">Viral Outlier</span>
                        </div>
                      ) : (
                        <div className="inline-flex flex-col items-end">
                          <span className="text-xs text-zinc-400 font-medium">
                            {video.outlierMultiplier}x
                          </span>
                          <span className="text-[10px] text-zinc-600">Standard</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

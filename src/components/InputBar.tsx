'use client';

import React, { useState } from 'react';
import { Search, Loader2, ArrowRight } from 'lucide-react';

interface InputBarProps {
  onAnalyze: (query: string) => void;
  isLoading: boolean;
  loadingStep?: string;
  hasApiKey: boolean;
  onOpenSettings?: () => void;
}

export const InputBar: React.FC<InputBarProps> = ({
  onAnalyze,
  isLoading,
  loadingStep = 'Analyzing channel...',
  hasApiKey,
  onOpenSettings,
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onAnalyze(query.trim());
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3">
      {/* Search Bar Form */}
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl focus-within:border-red-500/80 focus-within:ring-2 focus-within:ring-red-500/20 transition-all p-1.5 sm:p-2">
          {/* Icon */}
          <div className="pl-3 pr-2 text-zinc-400">
            <Search className="w-5 h-5 text-zinc-400 group-focus-within:text-red-400 transition" />
          </div>

          {/* Input field */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            placeholder="Enter YouTube Channel URL, @handle (e.g., @mkbhd), or Channel ID..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-zinc-500 outline-none px-2 py-1.5 disabled:opacity-50"
          />

          {/* Quick Clear */}
          {query && !isLoading && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="px-2 text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              Clear
            </button>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm shadow-lg shadow-red-600/30 transition active:scale-95 shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span className="hidden sm:inline">Analyzing...</span>
              </>
            ) : (
              <>
                <span>Analyze</span>
                <ArrowRight className="w-4 h-4 hidden sm:inline" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Loading Progress State */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2.5 text-xs text-zinc-400 py-1 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
          <span>{loadingStep}</span>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="text-xs text-zinc-400">
          Accurate public numbers from YouTube Data API v3 for the past 90 days
        </div>

        {!hasApiKey ? (
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-[11px] text-amber-400/90 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer"
          >
            ⚠️ YouTube Data API v3 key required — Configure in Settings
          </button>
        ) : (
          <span className="text-[11px] text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            🟢 YouTube Data API v3 connected
          </span>
        )}
      </div>
    </div>
  );
};

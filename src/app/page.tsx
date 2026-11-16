'use client';

import React, { useState, useEffect } from 'react';
import { ChannelAnalysisResponse, ApiSettings } from '@/types';
import { Header } from '@/components/Header';
import { SettingsModal } from '@/components/SettingsModal';
import { InputBar } from '@/components/InputBar';
import { ChannelHeader } from '@/components/ChannelHeader';
import { KPICards } from '@/components/KPICards';
import { GeminiNicheCard } from '@/components/GeminiNicheCard';
import { ChartsSection } from '@/components/ChartsSection';
import { VideoTable } from '@/components/VideoTable';
import { downloadMarkdownReport } from '@/lib/markdownExport';
import { AlertCircle, AlertTriangle, Key, Search, BarChart3, Film, Sparkles } from 'lucide-react';
import { YoutubeIcon } from '@/components/icons/YoutubeIcon';

const STORAGE_KEY = 'tubepulse_api_settings';

export default function HomePage() {
  const [data, setData] = useState<ChannelAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('Analyzing channel...');
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [apiSettings, setApiSettings] = useState<ApiSettings>({
    youtubeApiKey: '',
    geminiApiKey: '',
  });
  const [serverConfig, setServerConfig] = useState<{
    serverYoutubeKey: boolean;
    serverGeminiKey: boolean;
  }>({
    serverYoutubeKey: false,
    serverGeminiKey: false,
  });

  // Load API keys from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setApiSettings(parsed);
      }
    } catch {
      // LocalStorage access fallback
    }
  }, []);

  // Fetch server API key availability on mount
  useEffect(() => {
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((config) => {
        if (config) {
          setServerConfig({
            serverYoutubeKey: Boolean(config.serverYoutubeKey),
            serverGeminiKey: Boolean(config.serverGeminiKey),
          });
        }
      })
      .catch((err) => {
        console.error('Failed to fetch server config:', err);
      });
  }, []);

  const hasYtKey = Boolean(apiSettings.youtubeApiKey?.trim()) || serverConfig.serverYoutubeKey;
  const hasGeminiKey = Boolean(apiSettings.geminiApiKey?.trim()) || serverConfig.serverGeminiKey;

  const handleSaveSettings = (newSettings: ApiSettings) => {
    setApiSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch {
      // ignore
    }
  };

  const handleAnalyze = async (query: string) => {
    setError(null);
    setIsLoading(true);

    try {
      setLoadingStep('Fetching channel data & 90-day uploads from YouTube Data API v3...');

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelQuery: query,
          youtubeApiKey: apiSettings.youtubeApiKey,
          geminiApiKey: apiSettings.geminiApiKey,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze channel.');
      }

      setData(result);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err.message || 'An error occurred during analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        apiSettings={apiSettings}
        hasYtKey={hasYtKey}
        hasGeminiKey={hasGeminiKey}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Search & Channel Input */}
        <section className="space-y-4">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              YouTube Public Metrics & Upload Analytics
            </h1>
            <p className="text-sm text-zinc-400">
              Accurate, verified public metrics directly from YouTube Data API v3 for all videos published in the past 90 days.
            </p>
          </div>

          <InputBar
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            loadingStep={loadingStep}
            hasApiKey={hasYtKey}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </section>

        {/* Error Alert Banner */}
        {error && (
          <div className="rounded-2xl bg-red-950/40 border border-red-500/40 p-4 flex items-start gap-3 text-red-200 text-sm shadow-xl animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-white">Analysis Error</p>
              <p className="text-xs text-red-300 leading-relaxed">{error}</p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-xs font-semibold underline hover:text-white flex items-center gap-1"
                >
                  <Key className="w-3.5 h-3.5" /> Configure YouTube Data API Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state when no channel analyzed yet */}
        {!data && !isLoading && !error && (
          <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto text-zinc-400 shadow-inner">
              <Search className="w-7 h-7 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white">Ready to Audit Channel Uploads</h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                Enter any public channel URL, @handle (e.g., <code className="text-zinc-300">@mkbhd</code>), or channel ID above to retrieve official 90-day upload numbers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" /> Verified Data
                </div>
                <p className="text-[11px] text-zinc-400">
                  Exact views, likes, comments, and durations directly from YouTube API.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Film className="w-3.5 h-3.5 text-purple-400" /> 90-Day Cadence
                </div>
                <p className="text-[11px] text-zinc-400">
                  Calculates weekly frequency, gaps, and Shorts split (≤180s).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Spreadsheet Copy
                </div>
                <p className="text-[11px] text-zinc-400">
                  1-click TSV & CSV export formatted for Google Sheets or Excel.
                </p>
              </div>
            </div>

            {!hasYtKey && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
                >
                  <Key className="w-3.5 h-3.5" />
                  Configure YouTube Data API v3 Key
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dashboard Loaded Content */}
        {data && (
          <div className="space-y-8">
            {/* Warning Alert Banner (e.g. video upload cap reached) */}
            {data.warning && (
              <div className="rounded-2xl bg-amber-950/40 border border-amber-500/40 p-4 flex items-start gap-3 text-amber-200 text-sm shadow-xl">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Upload Catalog Notice</p>
                  <p className="text-xs text-amber-300 mt-0.5">{data.warning}</p>
                </div>
              </div>
            )}

            {/* 1. Channel Profile Header with Markdown Export */}
            <ChannelHeader
              channel={data.channel}
              source={data.source}
              onExportMarkdown={() => downloadMarkdownReport(data)}
            />

            {/* 2. KPI Cards */}
            <KPICards kpis={data.kpis} allTimeVideos={data.channel.totalVideosCount} />

            {/* 3. Gemini Strategic AI Niche Dossier */}
            <GeminiNicheCard insights={data.geminiInsights} />

            {/* 4. Interactive Charts Section */}
            <ChartsSection videos={data.videos} averageViews={data.kpis.averageViews} />

            {/* (5) Searchable & Sortable Video Catalog Table */}
            <VideoTable
              videos={data.videos}
              averageViews={data.kpis.averageViews}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950/60 py-6 mt-12 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-red-600 flex items-center justify-center text-white">
              <YoutubeIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-zinc-300">TubePulse Analytics</span>
            <span>&mdash; Powered strictly by YouTube Data API v3</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-zinc-400">
            <span>Past 90-day Horizon</span>
            <span>•</span>
            <span>Outlier Detection (&gt;2x Avg)</span>
            <span>•</span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-white transition"
            >
              Settings
            </button>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiSettings={apiSettings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

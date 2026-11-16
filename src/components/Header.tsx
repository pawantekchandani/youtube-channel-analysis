'use client';

import React from 'react';
import { Settings, CheckCircle2, AlertCircle } from 'lucide-react';
import { YoutubeIcon } from './icons/YoutubeIcon';
import { ApiSettings } from '@/types';

interface HeaderProps {
  onOpenSettings: () => void;
  apiSettings: ApiSettings;
  hasYtKey?: boolean;
  hasGeminiKey?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  apiSettings,
  hasYtKey: propHasYtKey,
  hasGeminiKey: propHasGeminiKey,
}) => {
  const hasYtKey =
    propHasYtKey !== undefined
      ? propHasYtKey
      : Boolean(apiSettings.youtubeApiKey?.trim());
  const hasGeminiKey =
    propHasGeminiKey !== undefined
      ? propHasGeminiKey
      : Boolean(apiSettings.geminiApiKey?.trim());

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-lg shadow-red-600/20 ring-1 ring-white/20">
            <YoutubeIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">TubePulse</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                Metrics
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">YouTube Channel Public Metrics (90d Horizon)</p>
          </div>
        </div>

        {/* Actions & Settings */}
        <div className="flex items-center gap-2.5">
          {/* Key status indicator badge */}
          <button
            onClick={onOpenSettings}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              hasYtKey
                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-amber-950/30 border-amber-800/40 text-amber-300 hover:bg-amber-900/40'
            }`}
          >
            {hasYtKey ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>API Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>API Key Required</span>
              </>
            )}
          </button>

          {/* Settings gear button */}
          <button
            onClick={onOpenSettings}
            className="relative p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition flex items-center justify-center shadow-sm"
            title="Configure API Keys"
          >
            <Settings className="w-5 h-5" />
            {/* Status dot */}
            <span
              className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                hasYtKey && hasGeminiKey
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : hasYtKey
                  ? 'bg-blue-400'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
          </button>
        </div>
      </div>
    </header>
  );
};

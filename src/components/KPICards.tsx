'use client';

import React from 'react';
import { KPIData } from '@/types';
import { formatCompactNumber } from '@/lib/formatters';
import {
  Film,
  CalendarDays,
  Clock,
  Eye,
  PieChart,
} from 'lucide-react';

interface KPICardsProps {
  kpis: KPIData;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis }) => {
  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          90-Day Upload Cadence & Performance KPIs
        </span>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Videos (90d) */}
        <div className="relative overflow-hidden rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 shadow-lg group hover:border-zinc-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Total Videos
            </span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <Film className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {kpis.totalVideos90d}
            </span>
            <span className="text-xs text-zinc-400 font-medium">videos / 90d</span>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Active catalog horizon</span>
          </div>
        </div>

        {/* Weekly Upload Frequency */}
        <div className="relative overflow-hidden rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 shadow-lg group hover:border-zinc-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Weekly Frequency
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {kpis.weeklyUploadFrequency}
            </span>
            <span className="text-xs text-zinc-400 font-medium">vids / week</span>
          </div>

          <div className="mt-3 text-[11px] text-zinc-400 flex items-center justify-between">
            <span>
              {kpis.weeklyUploadFrequency >= 3
                ? '🔥 High output pace'
                : kpis.weeklyUploadFrequency >= 1
                ? '⚡ Consistent weekly'
                : '🐢 Low frequency'}
            </span>
          </div>
        </div>

        {/* Average Upload Gap */}
        <div className="relative overflow-hidden rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 shadow-lg group hover:border-zinc-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Avg Upload Gap
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {kpis.averageUploadGapDays}
            </span>
            <span className="text-xs text-zinc-400 font-medium">days</span>
          </div>

          <div className="mt-3 text-[11px] text-zinc-400">
            <span>Between consecutive uploads</span>
          </div>
        </div>

        {/* Average Views */}
        <div className="relative overflow-hidden rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 shadow-lg group hover:border-zinc-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Average Views
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Eye className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {formatCompactNumber(kpis.averageViews)}
            </span>
            <span className="text-xs text-zinc-400 font-medium">/ video</span>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Median: {formatCompactNumber(kpis.medianViews)}</span>
            <span className="text-emerald-400 font-medium">90d Avg</span>
          </div>
        </div>

        {/* Shorts vs. Long-form Ratio */}
        <div className="relative overflow-hidden rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 shadow-lg group hover:border-zinc-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Shorts vs Long
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <PieChart className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold text-white">
                {kpis.longPercentage}%
              </span>
              <span className="text-[10px] text-zinc-400 uppercase">Long</span>
            </div>
            <span className="text-xs text-zinc-600">/</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold text-purple-400">
                {kpis.shortsPercentage}%
              </span>
              <span className="text-[10px] text-zinc-400 uppercase">Shorts</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-2 w-full rounded-full bg-zinc-800 overflow-hidden flex">
            <div
              className="h-full bg-red-500 transition-all duration-500"
              style={{ width: `${kpis.longPercentage}%` }}
              title={`Long-form: ${kpis.longCount} videos (${kpis.longPercentage}%)`}
            />
            <div
              className="h-full bg-purple-500 transition-all duration-500"
              style={{ width: `${kpis.shortsPercentage}%` }}
              title={`Shorts: ${kpis.shortsCount} videos (${kpis.shortsPercentage}%)`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

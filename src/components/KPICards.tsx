'use client';

import React from 'react';
import { FormatKPIs, KPIData } from '@/types';
import { formatCompactNumber } from '@/lib/formatters';
import { formatDuration } from '@/lib/youtube';
import { Film, CalendarDays, Clock, Eye, PieChart, Smartphone, Timer, Library, Handshake } from 'lucide-react';

interface KPICardsProps {
  kpis: KPIData;
  allTimeVideos: number;
}

const cardClass =
  'relative overflow-hidden rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 shadow-lg group hover:border-zinc-700 transition';

interface StatCardProps {
  label: string;
  icon: React.ReactNode;
  iconClass: string;
  value: React.ReactNode;
  unit: string;
  footer: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, icon, iconClass, value, unit, footer }) => (
  <div className={cardClass}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
      <div className={`p-2 rounded-xl border ${iconClass}`}>{icon}</div>
    </div>
    <div className="mt-3 flex items-baseline gap-2">
      <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{value}</span>
      <span className="text-xs text-zinc-400 font-medium">{unit}</span>
    </div>
    <div className="mt-3 text-[11px] text-zinc-400">{footer}</div>
  </div>
);

const paceLabel = (perWeek: number) =>
  perWeek >= 3 ? '🔥 High output pace' : perWeek >= 1 ? '⚡ Consistent weekly' : '🐢 Low frequency';

interface FormatRowProps {
  title: string;
  accentClass: string;
  icon: React.ReactNode;
  iconClass: string;
  data: FormatKPIs;
}

const FormatRow: React.FC<FormatRowProps> = ({ title, accentClass, icon, iconClass, data }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 px-1">
      <span className={`w-2 h-2 rounded-full ${accentClass}`} />
      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{title}</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <StatCard
        label="Videos"
        icon={icon}
        iconClass={iconClass}
        value={data.count}
        unit="videos / 90d"
        footer={`Total views: ${formatCompactNumber(data.totalViews)}`}
      />
      <StatCard
        label="Weekly Frequency"
        icon={<CalendarDays className="w-4 h-4" />}
        iconClass="bg-blue-500/10 text-blue-400 border-blue-500/20"
        value={data.weeklyUploadFrequency}
        unit="vids / week"
        footer={data.count > 0 ? paceLabel(data.weeklyUploadFrequency) : 'No uploads in 90 days'}
      />
      <StatCard
        label="Avg Upload Gap"
        icon={<Clock className="w-4 h-4" />}
        iconClass="bg-amber-500/10 text-amber-400 border-amber-500/20"
        value={data.count > 1 ? data.averageUploadGapDays : '—'}
        unit="days"
        footer="Between consecutive uploads"
      />
      <StatCard
        label="Average Views"
        icon={<Eye className="w-4 h-4" />}
        iconClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        value={formatCompactNumber(data.averageViews)}
        unit="/ video"
        footer={`Median: ${formatCompactNumber(data.medianViews)}`}
      />
      <StatCard
        label="Avg Length"
        icon={<Timer className="w-4 h-4" />}
        iconClass="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
        value={data.count > 0 ? formatDuration(data.averageDurationSeconds) : '—'}
        unit=""
        footer="Mean duration per video"
      />
    </div>
  </div>
);

export const KPICards: React.FC<KPICardsProps> = ({ kpis, allTimeVideos }) => {
  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          90-Day Upload Cadence & Performance KPIs
        </span>
      </div>

      {/* Overall: total uploads and format mix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="All-Time Videos"
          icon={<Library className="w-4 h-4" />}
          iconClass="bg-sky-500/10 text-sky-400 border-sky-500/20"
          value={allTimeVideos.toLocaleString()}
          unit="videos"
          footer="Public uploads since channel start"
        />
        <StatCard
          label="Total Videos"
          icon={<Film className="w-4 h-4" />}
          iconClass="bg-red-500/10 text-red-400 border-red-500/20"
          value={kpis.totalVideos90d}
          unit="videos / 90d"
          footer="Long-form and Shorts combined"
        />
        <StatCard
          label="Sponsored (90d)"
          icon={<Handshake className="w-4 h-4" />}
          iconClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          value={kpis.sponsoredCount}
          unit="videos"
          footer={`${kpis.sponsoredPercentage}% of 90d videos (${kpis.unknownCount} without transcript)`}
        />

        <div className={cardClass}>
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
              <span className="text-xl sm:text-2xl font-bold text-white">{kpis.longPercentage}%</span>
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

      {/* Detected sponsors list */}
      {kpis.sponsors && kpis.sponsors.length > 0 && (
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Handshake className="w-3.5 h-3.5 text-emerald-400" /> Detected Sponsors from Transcripts ({kpis.sponsors.length})
            </span>
            <span className="text-[11px] text-zinc-500">From transcript matches</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {kpis.sponsors.map((sponsor) => (
              <span
                key={sponsor.name}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-xs text-zinc-200"
              >
                <span className="font-medium text-white">{sponsor.name}</span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-semibold border border-emerald-500/30">
                  {sponsor.count} {sponsor.count === 1 ? 'video' : 'videos'}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <FormatRow
        title="Long-form (over 3 min)"
        accentClass="bg-red-500"
        icon={<Film className="w-4 h-4" />}
        iconClass="bg-red-500/10 text-red-400 border-red-500/20"
        data={kpis.long}
      />

      <FormatRow
        title="Shorts (3 min or less)"
        accentClass="bg-purple-500"
        icon={<Smartphone className="w-4 h-4" />}
        iconClass="bg-purple-500/10 text-purple-400 border-purple-500/20"
        data={kpis.shorts}
      />
    </div>
  );
};

'use client';

import React from 'react';
import { type EventPlan, type Thumbnail } from '@/lib/schema';
import { color, themes } from '@/lib/tokens';

interface ThumbnailPreviewProps {
  plan: EventPlan;
  thumbnail: Thumbnail;
}

export function ThumbnailPreview({ plan, thumbnail }: ThumbnailPreviewProps) {
  const currentTheme = themes[plan.theme] || themes.BUILD_WITH_AI;
  const accentHex =
    color[thumbnail.style.accent] || color[currentTheme.primaryAccent];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          티켓팅 썸네일 (이벤터스 1280x720 · 티켓타코 1200x630)
        </h3>
        <span className="text-[11px] text-slate-400">
          Accent: {thumbnail.style.accent}
        </span>
      </div>

      <div
        className="rounded-2xl p-6 border border-slate-200 relative overflow-hidden transition-all"
        style={{
          backgroundColor: currentTheme.coverBg,
          color: currentTheme.coverText,
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: accentHex }}
        />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {plan.designAssets?.logoUrl && (
                <div className="w-6 h-6 bg-white rounded p-0.5 flex items-center justify-center shrink-0 border border-black/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={plan.designAssets.logoUrl}
                    alt="Logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <span className="text-xs font-bold tracking-widest opacity-80 uppercase">
                {plan.year || '2026'} · {plan.hostName || 'GDG'} · 팀 귀찮앙
              </span>
            </div>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
              style={{ backgroundColor: accentHex, color: color.white }}
            >
              {currentTheme.label}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
            <div className="flex-1 space-y-2">
              <h4 className="text-2xl font-black tracking-tight leading-snug whitespace-pre-line">
                {plan.title || thumbnail.headline}
              </h4>
              <p className="text-sm font-medium opacity-80">
                {plan.hook || thumbnail.subline}
              </p>
            </div>

            {plan.designAssets?.keyVisualUrl && (
              <div className="w-24 h-24 rounded-xl overflow-hidden border border-black/10 shrink-0 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={plan.designAssets.keyVisualUrl}
                  alt="Key Visual"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5">
              <span>📅</span>
              <span>
                {plan.date || '일시 미정'} {plan.startTime && `· ${plan.startTime}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5">
              <span>📍</span>
              <span>{plan.venue || '장소 미정'}</span>
            </div>
            {plan.capacity && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5">
                <span>👥</span>
                <span>정원 {plan.capacity}명</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

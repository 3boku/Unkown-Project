'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { TerminalChatPlanner } from '@/components/TerminalChatPlanner';
import { type EventPlan, type Generated } from '@/lib/schema';
import { brandCycle, color, themes } from '@/lib/tokens';
import {
  loadGeneratedFromStorage,
  loadPlanFromStorage,
  sampleGenerated,
  samplePlan,
  saveGeneratedToStorage,
  savePlanToStorage,
} from '@/lib/storage';

const subscribeNoop = () => () => {};

export default function Home() {
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const [plan, setPlan] = useState<EventPlan>(() => {
    if (typeof window !== 'undefined') {
      const loaded = loadPlanFromStorage();
      return {
        ...loaded,
        hostName:
          loaded.hostName === 'GDG Campus Korea' ? 'GDG' : loaded.hostName || 'GDG',
      };
    }
    return samplePlan;
  });

  const [generated, setGenerated] = useState<Generated>(() => {
    if (typeof window !== 'undefined') {
      return loadGeneratedFromStorage();
    }
    return sampleGenerated;
  });

  const [isGeneratingKit, setIsGeneratingKit] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'all' | 'thumbnail' | 'cards' | 'reel' | 'sns'
  >('all');

  const handlePlanChange = (updated: EventPlan) => {
    const normalized: EventPlan = {
      ...updated,
      hostName:
        updated.hostName === 'GDG Campus Korea'
          ? 'GDG'
          : updated.hostName || 'GDG',
    };
    setPlan(normalized);
    savePlanToStorage(normalized);
  };

  const handleGeneratedChange = (updated: Generated) => {
    setGenerated(updated);
    saveGeneratedToStorage(updated);
  };

  const handleGenerateBrandKit = async (targetPlan: EventPlan = plan) => {
    setIsGeneratingKit(true);
    setGenError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json();
      if (data.success && data.generated) {
        handleGeneratedChange(data.generated);
      } else {
        setGenError(data.error?.message || '브랜드 킷 생성에 실패했습니다.');
      }
    } catch (err) {
      setGenError(
        err instanceof Error ? err.message : '브랜드 킷 생성 중 오류가 발생했습니다.',
      );
    } finally {
      setIsGeneratingKit(false);
    }
  };

  const currentTheme = themes[plan.theme] || themes.BUILD_WITH_AI;

  return (
    <div
      className="flex flex-1 flex-col min-h-screen"
      style={{ backgroundColor: color.paper, color: color.ink }}
    >
      {/* Global Header */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md"
        style={{ backgroundColor: color.white }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: color.blue }}
            />
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: color.red }}
            />
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: color.yellow }}
            />
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: color.green }}
            />
          </div>
          <h1 className="text-lg font-bold tracking-tight">
            GDG BrandKit &amp; Reels Studio
          </h1>
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: color.blue }}
          >
            팀 귀찮앙
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isGeneratingKit}
            onClick={() => handleGenerateBrandKit(plan)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
            style={{ backgroundColor: color.green }}
          >
            {isGeneratingKit
              ? '⏳ Gemini 4 생성 중...'
              : '✨ 브랜드 킷 생성 (Gemini 4)'}
          </button>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: color.paper,
              color: color.ink,
            }}
          >
            테마: {currentTheme.label}
          </span>
          <span className="text-xs font-bold text-slate-600 hidden sm:inline">
            GDG · 팀 귀찮앙
          </span>
        </div>
      </header>

      {/* Main Workspace: Left (Terminal + Basic Event Info Summary) / Right (BrandKit Preview) */}
      <main className="grid flex-1 grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl w-full mx-auto">
        {/* Left Column: Interactive Terminal + Basic Event Info Readout */}
        <section className="lg:col-span-5 flex flex-col gap-5">
          <TerminalChatPlanner
            onPlanComplete={(newPlan) => {
              handlePlanChange(newPlan);
            }}
            onGeneratedComplete={(newGen) => {
              handleGeneratedChange(newGen);
            }}
          />

          {/* 기본 행사 정보 (터미널 대화 실시간 반영 영역) */}
          <div
            className="rounded-2xl p-5 shadow-xs border border-slate-200 space-y-3"
            style={{ backgroundColor: color.white }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2 h-4 rounded-full"
                  style={{ backgroundColor: color.blue }}
                />
                <h2 className="text-sm font-bold" style={{ color: color.ink }}>
                  기본 행사 정보 (터미널 연동 결과)
                </h2>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                GDG · 귀찮앙
              </span>
            </div>

            {isClient ? (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="col-span-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold">
                    행사 공식 명칭 (Title)
                  </div>
                  <div className="font-bold text-sm mt-0.5">
                    {plan.title || '터미널에서 행사명을 입력해 주세요'}
                  </div>
                  {plan.hook && (
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      &ldquo;{plan.hook}&rdquo;
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold">
                    테마 / 주최
                  </div>
                  <div className="font-semibold mt-0.5">
                    {currentTheme.label} · {plan.hostName || 'GDG'}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold">
                    일시 (Date &amp; Time)
                  </div>
                  <div className="font-semibold mt-0.5">
                    {plan.date || '-'}{' '}
                    {plan.startTime &&
                      `(${plan.startTime}${plan.endTime ? `~${plan.endTime}` : ''})`}
                  </div>
                </div>

                <div className="col-span-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold">
                    장소 (Venue) / 정원
                  </div>
                  <div className="font-semibold mt-0.5">
                    {plan.venue || '-'}{' '}
                    {plan.capacity ? `(정원 ${plan.capacity}명)` : ''}
                  </div>
                </div>

                <div className="col-span-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold">
                    프로그램 구성 &amp; 연사 ({plan.schedule.length}개 세션 /{' '}
                    {plan.speakers.length}명)
                  </div>
                  <div className="font-medium text-slate-700 mt-0.5">
                    {plan.programSummary ||
                      plan.schedule.map((s) => s.title).join(', ') ||
                      '-'}
                  </div>
                  {plan.perks.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {plan.perks.map((perk, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-slate-600"
                        >
                          🎁 {perk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                로딩 중...
              </div>
            )}
          </div>
        </section>

        {/* Right Column: BrandKit Asset Preview (4 Tabs: Thumbnail, Cards, Reel, SNS) */}
        <section
          className="lg:col-span-7 rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col max-h-[calc(100vh-7rem)] overflow-y-auto"
          style={{ backgroundColor: color.white }}
        >
          {/* Header & Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold" style={{ color: color.ink }}>
                브랜드 킷 프리뷰 (Gemini 4 · BK-03)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                터미널에서 대화한 기획서(EventPlan)와 Gemini 4 생성 문구(Generated)가 실시간 동기화됩니다.
              </p>
            </div>

            {/* Navigation tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-medium">
              {(
                [
                  ['all', '전체'],
                  ['thumbnail', '썸네일'],
                  ['cards', '카드뉴스'],
                  ['reel', '릴스'],
                  ['sns', 'SNS 문구'],
                ] as const
              ).map(([tabKey, label]) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveTab(tabKey)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeTab === tabKey
                      ? 'bg-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  style={activeTab === tabKey ? { color: color.ink } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {genError && (
            <div className="mt-4 p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700 font-medium">
              ⚠️ {genError}
            </div>
          )}

          {/* Preview Contents Container */}
          <div className="space-y-6 flex-1 pt-4">
            {/* 1. 티켓팅 썸네일 미리보기 */}
            {(activeTab === 'all' || activeTab === 'thumbnail') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    1. 티켓팅 썸네일 (이벤터스 1280x720 · 티켓타코 1200x630)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Accent: {generated.thumbnail.style.accent}
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
                    style={{
                      backgroundColor:
                        color[generated.thumbnail.style.accent] ||
                        color[currentTheme.primaryAccent],
                    }}
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
                        style={{
                          backgroundColor:
                            color[generated.thumbnail.style.accent] ||
                            color[currentTheme.primaryAccent],
                          color: color.white,
                        }}
                      >
                        {currentTheme.label}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                      <div className="flex-1 space-y-2">
                        <h4 className="text-2xl font-black tracking-tight leading-snug whitespace-pre-line">
                          {plan.title || generated.thumbnail.headline}
                        </h4>

                        <p className="text-sm font-medium opacity-80">
                          {plan.hook || generated.thumbnail.subline}
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
                          {plan.date || '일시 미정'}{' '}
                          {plan.startTime && `· ${plan.startTime}`}
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
            )}

            {/* 2. 카드뉴스 슬라이드 미리보기 */}
            {(activeTab === 'all' || activeTab === 'cards') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    2. 인스타 카드뉴스 세트 ({generated.cards.length}장 · 1080x1350)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    GDG 포맷 · 실시간 팩트 바인딩
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Slide: Timetable */}
                  <div
                    className="rounded-2xl p-4 border border-slate-200 flex flex-col justify-between min-h-[240px]"
                    style={{ backgroundColor: color.paper }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor: color.yellow,
                            color: color.ink,
                          }}
                        >
                          Time Table
                        </span>
                        <span className="text-[10px] text-slate-400">
                          TIMETABLE
                        </span>
                      </div>
                      <h5 className="font-bold text-sm mb-2">{plan.title}</h5>

                      {plan.schedule.length === 0 ? (
                        <p className="text-xs text-slate-400 py-6 text-center">
                          타임테이블이 비어 있습니다.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {plan.schedule.slice(0, 5).map((s, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-1.5 rounded text-xs ${
                                s.highlight
                                  ? 'font-bold bg-blue-50 text-blue-700'
                                  : 'text-slate-700'
                              }`}
                            >
                              <span className="font-mono text-[11px] shrink-0 w-24">
                                {s.start} - {s.end}
                              </span>
                              <span className="truncate flex-1 text-left px-2">
                                {s.title || '세션'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-200 flex justify-between">
                      <span>{plan.venue}</span>
                      <span>{plan.date}</span>
                    </div>
                  </div>

                  {/* Slide: Speakers */}
                  <div
                    className="rounded-2xl p-4 border border-slate-200 flex flex-col justify-between min-h-[240px]"
                    style={{ backgroundColor: color.paper }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: color.blue }}
                        >
                          Speakers
                        </span>
                        <span className="text-[10px] text-slate-400">
                          SPEAKERS
                        </span>
                      </div>
                      <h5 className="font-bold text-sm mb-2">연사 라인업</h5>

                      {plan.speakers.length === 0 ? (
                        <p className="text-xs text-slate-400 py-6 text-center">
                          연사 정보가 비어 있습니다.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {plan.speakers.slice(0, 3).map((sp, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2.5 p-1.5 rounded-lg bg-white border border-slate-100"
                            >
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                                {sp.photoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={sp.photoUrl}
                                    alt={sp.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span>
                                    {sp.name ? sp.name.slice(0, 2) : '연사'}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold truncate">
                                    {sp.name || '연사 이름'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 truncate">
                                    {sp.affiliation}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 truncate">
                                  {sp.sessionTitle || '세션명 미입력'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-200 flex justify-between">
                      <span>GDG · 팀 귀찮앙</span>
                      <span>총 {plan.speakers.length}명</span>
                    </div>
                  </div>
                </div>

                {/* Generated Card Slides List */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {generated.cards.map((card, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                          style={{ backgroundColor: color[card.style.accent] }}
                        >
                          #{i + 1} {card.type}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {card.style.emphasis}
                        </span>
                      </div>
                      <p className="font-semibold truncate text-slate-800">
                        {'headline' in card
                          ? card.headline
                          : 'hookTitle' in card
                            ? card.hookTitle
                            : 'title' in card
                              ? card.title
                              : `D-${card.daysLeft}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. 릴스 프리뷰 (Generated.reel 연동) */}
            {(activeTab === 'all' || activeTab === 'reel') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    3. 릴스 씬 구성 ({generated.reel.scenes.length}개 씬 · 총{' '}
                    {generated.reel.scenes.reduce(
                      (acc, s) => acc + s.durationSec,
                      0,
                    )}
                    초)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    1080x1920 · 60fps
                  </span>
                </div>

                <div className="space-y-2">
                  {generated.reel.scenes.map((scene, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                      style={{ backgroundColor: color.paper }}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                            style={{
                              backgroundColor:
                                color[brandCycle[idx % brandCycle.length]],
                            }}
                          >
                            Scene {idx + 1} · {scene.component}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {scene.durationSec}s (
                            {Math.round(scene.durationSec * 60)}f)
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800">
                          {scene.overlayText}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {scene.highlightWords.map((w, wIdx) => (
                            <span
                              key={wIdx}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                              style={{
                                backgroundColor:
                                  color[brandCycle[wIdx % brandCycle.length]],
                              }}
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. SNS 문구 미리보기 (Generated.sns 연동) */}
            {(activeTab === 'all' || activeTab === 'sns') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    4. SNS 홍보 문구 (인스타 캡션 · 스레드 본문 &amp; 대댓글)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Gemini 4 생성 완료
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      인스타그램 캡션 ({generated.sns.instagramCaption.length}
                      /2,200자)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard?.writeText(
                          generated.sns.instagramCaption,
                        )
                      }
                      className="px-2 py-1 rounded bg-white border border-slate-200 text-[11px] font-semibold hover:bg-slate-100 cursor-pointer"
                    >
                      📋 복사
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed bg-white p-3 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                    {generated.sns.instagramCaption}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          스레드 본문 ({generated.sns.threadsMain.length}/500자)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard?.writeText(
                              generated.sns.threadsMain,
                            )
                          }
                          className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-semibold hover:bg-slate-100 cursor-pointer"
                        >
                          📋 복사
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 whitespace-pre-line bg-white p-2.5 rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
                        {generated.sns.threadsMain}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          스레드 대댓글 (신청 링크)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard?.writeText(
                              generated.sns.threadsReply,
                            )
                          }
                          className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-semibold hover:bg-slate-100 cursor-pointer"
                        >
                          📋 복사
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 whitespace-pre-line bg-white p-2.5 rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
                        {generated.sns.threadsReply}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

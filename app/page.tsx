'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { PlanForm } from '@/components/PlanForm';
import { TerminalChatPlanner } from '@/components/TerminalChatPlanner';
import { type EventPlan, type Generated } from '@/lib/schema';
import { color, themes } from '@/lib/tokens';
import {
  emptyPlan,
  loadGeneratedFromStorage,
  loadPlanFromStorage,
  sampleGenerated,
  samplePlan,
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
      return loadPlanFromStorage();
    }
    return samplePlan;
  });

  const [generated] = useState<Generated | null>(() => {
    if (typeof window !== 'undefined') {
      return loadGeneratedFromStorage();
    }
    return sampleGenerated;
  });

  const [activeTab, setActiveTab] = useState<
    'all' | 'thumbnail' | 'cards' | 'reel' | 'sns'
  >('all');
  const [viewMode, setViewMode] = useState<'terminal' | 'studio'>('terminal');

  const handlePlanChange = (updated: EventPlan) => {
    setPlan(updated);
    savePlanToStorage(updated);
  };

  const handleLoadSample = () => {
    setPlan(samplePlan);
    savePlanToStorage(samplePlan);
  };

  const handleReset = () => {
    setPlan(emptyPlan);
    savePlanToStorage(emptyPlan);
  };

  const handleGenerate = () => {
    alert(
      '✨ 기획서가 검증되었습니다. Gemini 전체 생성(/api/generate)은 BK-03 스프린트에서 연동됩니다.',
    );
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
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setViewMode(viewMode === 'terminal' ? 'studio' : 'terminal')
            }
            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
            style={{ color: color.ink }}
          >
            {viewMode === 'terminal'
              ? '📝 스튜디오 폼으로 이동'
              : '💻 대화형 터미널 모드'}
          </button>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: color.paper,
              color: color.ink,
              border: `1px solid ${color.paper}`,
            }}
          >
            테마: {currentTheme.label}
          </span>
          <span className="text-xs font-medium text-slate-400 hidden sm:inline">
            GDG Campus Korea
          </span>
        </div>
      </header>

      {viewMode === 'terminal' ? (
        <TerminalChatPlanner
          onPlanComplete={(newPlan) => {
            handlePlanChange(newPlan);
            setViewMode('studio');
          }}
          onSkipToStudio={() => setViewMode('studio')}
        />
      ) : (
        /* Main Workspace: Left (Plan Form) / Right (Asset Preview) */
        <main className="grid flex-1 grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl w-full mx-auto">
        {/* Left Column: Event Plan Web Form */}
        <section
          className="lg:col-span-5 rounded-2xl p-6 shadow-xs border border-slate-200 overflow-y-auto max-h-[calc(100vh-7rem)]"
          style={{ backgroundColor: color.white }}
        >
          <div className="mb-4">
            <h2 className="text-base font-bold" style={{ color: color.ink }}>
              행사 기획서 입력 (BK-02)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              한 곳에서 한 번만 입력하면 모든 에셋(썸네일·카드뉴스·릴스·문구)에
              즉시 반영됩니다.
            </p>
          </div>

          {isClient ? (
            <PlanForm
              plan={plan}
              onChange={handlePlanChange}
              onLoadSample={handleLoadSample}
              onReset={handleReset}
              onGenerate={handleGenerate}
            />
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              기획서 로딩 중...
            </div>
          )}
        </section>

        {/* Right Column: Asset Preview with Live Fact Synchronization */}
        <section
          className="lg:col-span-7 rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col max-h-[calc(100vh-7rem)] overflow-y-auto"
          style={{ backgroundColor: color.white }}
        >
          {/* Header & Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold" style={{ color: color.ink }}>
                브랜드 킷 프리뷰
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                사실 필드(일시·장소·연사 등) 변경 시 실시간으로 동기화됩니다.
              </p>
            </div>

            {/* Navigation tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                style={activeTab === 'all' ? { color: color.ink } : {}}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('thumbnail')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'thumbnail'
                    ? 'bg-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                style={activeTab === 'thumbnail' ? { color: color.ink } : {}}
              >
                썸네일
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cards')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'cards'
                    ? 'bg-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                style={activeTab === 'cards' ? { color: color.ink } : {}}
              >
                카드뉴스
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reel')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'reel'
                    ? 'bg-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                style={activeTab === 'reel' ? { color: color.ink } : {}}
              >
                릴스
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sns')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'sns'
                    ? 'bg-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                style={activeTab === 'sns' ? { color: color.ink } : {}}
              >
                SNS 문구
              </button>
            </div>
          </div>

          {/* Live Fact Synchronization Banner */}
          <div className="my-4 p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center gap-2.5 text-xs text-blue-900">
            <span
              className="w-2 h-2 rounded-full shrink-0 animate-pulse"
              style={{ backgroundColor: color.blue }}
            />
            <span>
              <strong>실시간 사실 동기화 (Live Fact Binding):</strong> 좌측
              기획서에서 일시, 장소, 타임테이블, 연사를 수정하면 다시 생성하지
              않아도 아래 프리뷰에 즉시 반영됩니다.
            </span>
          </div>

          {/* Preview Contents Container */}
          <div className="space-y-6 flex-1">
            {/* 1. 티켓팅 썸네일 미리보기 (이벤터스 1280x720 / 티켓타코 1200x630 목업) */}
            {(activeTab === 'all' || activeTab === 'thumbnail') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    티켓팅 썸네일 미리보기 (BK-04 연동 규격)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    이벤터스(16:9) · 티켓타코(1.91:1)
                  </span>
                </div>

                <div
                  className="rounded-2xl p-6 border border-slate-200 relative overflow-hidden transition-all"
                  style={{
                    backgroundColor: currentTheme.coverBg,
                    color: currentTheme.coverText,
                  }}
                >
                  {/* Theme Accent Border Indicator */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: color[currentTheme.primaryAccent] }}
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
                          {plan.year || '2026'} · {plan.hostName || 'GDG Campus Korea'}
                        </span>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                        style={{
                          backgroundColor: color[currentTheme.primaryAccent],
                          color: color.white,
                        }}
                      >
                        {currentTheme.label}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                      <div className="flex-1 space-y-2">
                        <h4 className="text-2xl font-black tracking-tight leading-snug">
                          {plan.title || '행사명을 입력하세요'}
                        </h4>

                        {plan.hook && (
                          <p className="text-sm font-medium opacity-80">
                            &quot;{plan.hook}&quot;
                          </p>
                        )}
                      </div>

                      {/* Key Visual Graphic if provided */}
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

                    {/* Sponsor Logos in Thumbnail Preview if present */}
                    {plan.designAssets?.sponsorLogos &&
                      plan.designAssets.sponsorLogos.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">
                            후원:
                          </span>
                          {plan.designAssets.sponsorLogos.map((sp, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/5 text-[11px] font-medium"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={sp.logoUrl}
                                alt={sp.name}
                                className="w-3.5 h-3.5 object-contain"
                              />
                              <span>{sp.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

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
            )}

            {/* 2. 카드뉴스 슬라이드 미리보기 (1080x1350 규격 대응 목업) */}
            {(activeTab === 'all' || activeTab === 'cards') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    인스타 카드뉴스 라이브 슬라이드 (BK-05 연동 규격)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    실시간 팩트 바인딩
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Slide 1: Timetable Slide */}
                  <div
                    className="rounded-2xl p-4 border border-slate-200 flex flex-col justify-between min-h-[260px]"
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
                          슬라이드 03
                        </span>
                      </div>
                      <h5 className="font-bold text-sm mb-2">행사 타임테이블</h5>

                      {plan.schedule.length === 0 ? (
                        <p className="text-xs text-slate-400 py-6 text-center">
                          타임테이블이 비어 있습니다.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {plan.schedule.slice(0, 4).map((s, idx) => (
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
                          {plan.schedule.length > 4 && (
                            <p className="text-[10px] text-slate-400 text-center pt-1">
                              +{plan.schedule.length - 4}개 세션 더 있음
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-200 flex justify-between">
                      <span>{plan.venue}</span>
                      <span>{plan.date}</span>
                    </div>
                  </div>

                  {/* Slide 2: Speakers Slide */}
                  <div
                    className="rounded-2xl p-4 border border-slate-200 flex flex-col justify-between min-h-[260px]"
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
                          슬라이드 04
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
                                  <span>{sp.name ? sp.name.slice(0, 2) : '연사'}</span>
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
                          {plan.speakers.length > 3 && (
                            <p className="text-[10px] text-slate-400 text-center pt-1">
                              +{plan.speakers.length - 3}명 연사 더 있음
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-200 flex justify-between">
                      <span>{plan.hostName}</span>
                      <span>총 {plan.speakers.length}명</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. 릴스 및 SNS 문구 미리보기 (Generated 연동) */}
            {(activeTab === 'all' || activeTab === 'reel' || activeTab === 'sns') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    생성된 에셋 미리보기 (릴스 / SNS 문구)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Gemini 연동(BK-03) 대기
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      인스타그램 캡션 예시
                    </span>
                    <span className="text-slate-400">
                      {generated?.sns.instagramCaption ? '생성 완료' : '샘플 데이터'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed bg-white p-3 rounded-lg border border-slate-200 max-h-36 overflow-y-auto">
                    {generated?.sns.instagramCaption ||
                      `[${plan.title || '행사'}] 참여 신청 안내\n\n일시: ${plan.date} ${plan.startTime}\n장소: ${plan.venue}\n신청: ${plan.registration.url}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      )}
    </div>
  );
}

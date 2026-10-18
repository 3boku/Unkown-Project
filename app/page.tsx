'use client';

import React, { useState } from 'react';
import ArgonReelsStudio from '@/components/reels/ArgonReelsStudio';
import sampleGeneratedRaw from '@/fixtures/sample-generated.json';
import samplePlanRaw from '@/fixtures/sample-plan.json';
import { EventPlanSchema, type EventPlan } from '@/lib/schema';
import { type ThemeId, brandCycle, color, themes } from '@/lib/tokens';
import type { ArgonReel } from '@/remotion/Reel';

const INITIAL_PLAN: EventPlan = EventPlanSchema.parse(samplePlanRaw);
const INITIAL_REEL: ArgonReel = sampleGeneratedRaw.reel as ArgonReel;

export default function Home() {
  const [plan, setPlan] = useState<EventPlan>(INITIAL_PLAN);

  function updatePlanField<K extends keyof EventPlan>(
    key: K,
    value: EventPlan[K]
  ) {
    setPlan((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  return (
    <div
      className="flex flex-1 flex-col min-h-screen"
      style={{ backgroundColor: color.paper, color: color.ink }}
    >
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
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
        <span className="text-xs font-medium opacity-60">
          GDG Campus Korea · BrandKit MVP
        </span>
      </header>

      <main className="grid flex-1 grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl w-full mx-auto">
        {/* Left Column (lg:col-span-5): EventPlan Fact Form & Quick Editor */}
        <section
          className="lg:col-span-5 rounded-2xl p-6 shadow-xs border flex flex-col gap-5 self-start"
          style={{ backgroundColor: color.white }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">행사 기획서 입력</h2>
              <p className="text-xs opacity-60 mt-0.5">
                일시·장소·연사 등 사실(EventPlan)은 수정 즉시 우측 60fps 릴스
                템플릿에 직결됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPlan(INITIAL_PLAN)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer"
              style={{
                backgroundColor: color.paper,
                color: color.ink,
              }}
            >
              샘플 복원
            </button>
          </div>

          {/* Theme Selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold">브랜드 테마 프리셋</span>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(themes) as ThemeId[]).map((themeKey, idx) => {
                const isSelected = plan.theme === themeKey;
                const accentHex = color[brandCycle[idx % brandCycle.length]];
                return (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => updatePlanField('theme', themeKey)}
                    className="px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer text-left"
                    style={{
                      backgroundColor: isSelected ? color.ink : color.paper,
                      color: isSelected ? color.white : color.ink,
                      borderColor: isSelected ? accentHex : color.ink,
                    }}
                  >
                    <div>{themes[themeKey].label}</div>
                    <div className="text-xs opacity-65 font-normal mt-0.5">
                      {themeKey}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Core Event Facts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold">연도</span>
              <input
                type="text"
                value={plan.year}
                onChange={(e) => updatePlanField('year', e.target.value)}
                className="rounded-xl px-3 py-2 text-xs border"
                style={{ backgroundColor: color.paper, color: color.ink }}
              />
            </label>
            <label className="sm:col-span-2 flex flex-col gap-1">
              <span className="text-xs font-bold">주최 챕터 (hostName)</span>
              <input
                type="text"
                value={plan.hostName}
                onChange={(e) => updatePlanField('hostName', e.target.value)}
                className="rounded-xl px-3 py-2 text-xs border"
                style={{ backgroundColor: color.paper, color: color.ink }}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold">행사 타이틀 (title)</span>
            <input
              type="text"
              value={plan.title}
              onChange={(e) => updatePlanField('title', e.target.value)}
              className="rounded-xl px-3 py-2 text-xs font-semibold border"
              style={{ backgroundColor: color.paper, color: color.ink }}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold">핵심 훅 질문 (hook)</span>
            <input
              type="text"
              value={plan.hook}
              onChange={(e) => updatePlanField('hook', e.target.value)}
              className="rounded-xl px-3 py-2 text-xs border"
              style={{ backgroundColor: color.paper, color: color.ink }}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold">일자 (date)</span>
              <input
                type="date"
                value={plan.date}
                onChange={(e) => updatePlanField('date', e.target.value)}
                className="rounded-xl px-3 py-2 text-xs border"
                style={{ backgroundColor: color.paper, color: color.ink }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold">시작 시간</span>
              <input
                type="time"
                value={plan.startTime}
                onChange={(e) => updatePlanField('startTime', e.target.value)}
                className="rounded-xl px-3 py-2 text-xs border"
                style={{ backgroundColor: color.paper, color: color.ink }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold">종료 시간</span>
              <input
                type="time"
                value={plan.endTime}
                onChange={(e) => updatePlanField('endTime', e.target.value)}
                className="rounded-xl px-3 py-2 text-xs border"
                style={{ backgroundColor: color.paper, color: color.ink }}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="sm:col-span-2 flex flex-col gap-1">
              <span className="text-xs font-bold">장소 (venue)</span>
              <input
                type="text"
                value={plan.venue}
                onChange={(e) => updatePlanField('venue', e.target.value)}
                className="rounded-xl px-3 py-2 text-xs border"
                style={{ backgroundColor: color.paper, color: color.ink }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold">정원 (capacity)</span>
              <input
                type="number"
                value={plan.capacity ?? 200}
                onChange={(e) =>
                  updatePlanField(
                    'capacity',
                    Number(e.target.value) > 0
                      ? Number(e.target.value)
                      : undefined
                  )
                }
                className="rounded-xl px-3 py-2 text-xs border"
                style={{ backgroundColor: color.paper, color: color.ink }}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold">
              프로그램 요약 (programSummary)
            </span>
            <input
              type="text"
              value={plan.programSummary}
              onChange={(e) =>
                updatePlanField('programSummary', e.target.value)
              }
              className="rounded-xl px-3 py-2 text-xs border"
              style={{ backgroundColor: color.paper, color: color.ink }}
            />
          </label>

          {/* Speakers & Perks Summary Readout */}
          <div
            className="rounded-xl p-3.5 border flex flex-col gap-2"
            style={{ backgroundColor: color.paper }}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span>연사 라인업 ({plan.speakers.length}명 바인딩됨)</span>
              <span style={{ color: color.blue }}>EventPlan 원본 보장</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {plan.speakers.map((sp, idx) => {
                const pillBrand = brandCycle[idx % brandCycle.length];
                return (
                  <span
                    key={sp.name}
                    className="px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: color[pillBrand],
                      color: pillBrand === 'yellow' ? color.ink : color.white,
                    }}
                  >
                    {sp.name} · {sp.kind === 'HANDS_ON' ? 'Hands-on' : 'Session'}
                  </span>
                );
              })}
            </div>
            <div className="text-xs opacity-75 pt-1 border-t">
              참가자 혜택: {plan.perks.join(' · ')}
            </div>
          </div>
        </section>

        {/* Right Column (lg:col-span-7): BrandKit & Argon 60fps Reels Studio */}
        <section
          className="lg:col-span-7 rounded-2xl p-6 shadow-xs border flex flex-col gap-4"
          style={{ backgroundColor: color.white }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div>
              <h2 className="text-base font-bold">
                브랜드 킷 프리뷰 · Argon 60fps Reels Studio
              </h2>
              <p className="text-xs opacity-60 mt-0.5">
                Veo 3.1(카메라맨 배경 모션) + Remotion 60fps(코드 타이포·사실
                합성) + Argon 멀티모달 비평 루프
              </p>
            </div>
            <span
              className="px-3 py-1 rounded-full text-xs font-bold border"
              style={{
                backgroundColor: color.paper,
                color: color.ink,
              }}
            >
              BK-06 · 1080×1920 · 60fps
            </span>
          </div>

          <ArgonReelsStudio plan={plan} initialReel={INITIAL_REEL} />
        </section>
      </main>
    </div>
  );
}

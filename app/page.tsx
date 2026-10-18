'use client';

import React, { useState } from 'react';
import { PlanForm } from '@/components/PlanForm';
import { TerminalChatPlanner } from '@/components/TerminalChatPlanner';
import { BrandKitTabs } from '@/components/studio/BrandKitTabs';
import { type EventPlan, type Generated, type Reel } from '@/lib/schema';
import { color, themes } from '@/lib/tokens';
import {
  emptyPlan,
  loadGeneratedFromStorage,
  loadPlanFromStorage,
  sampleGenerated,
  samplePlan,
  saveGeneratedToStorage,
  savePlanToStorage,
} from '@/lib/storage';

type Phase = 'chat' | 'studio';

function normalizeHost(plan: EventPlan): EventPlan {
  return {
    ...plan,
    hostName:
      plan.hostName === 'GDG Campus Korea' ? 'GDG' : plan.hostName || 'GDG',
  };
}

export default function Home() {
  // 처음 들어오면 터미널 대화만 보여주고, 기획서가 만들어지면 스튜디오로 넘어갑니다.
  const [phase, setPhase] = useState<Phase>('chat');
  const [plan, setPlan] = useState<EventPlan>(() =>
    typeof window !== 'undefined' ? loadPlanFromStorage() : samplePlan,
  );
  const [generated, setGenerated] = useState<Generated>(() =>
    typeof window !== 'undefined' ? loadGeneratedFromStorage() : sampleGenerated,
  );
  const [kitVersion, setKitVersion] = useState(0);
  const [isGeneratingKit, setIsGeneratingKit] = useState(false);
  const [kitNotice, setKitNotice] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const handlePlanChange = (updated: EventPlan) => {
    const normalized = normalizeHost(updated);
    setPlan(normalized);
    savePlanToStorage(normalized);
  };

  const applyGenerated = (next: Generated) => {
    setGenerated(next);
    saveGeneratedToStorage(next);
    setKitVersion((v) => v + 1);
  };

  const handleReelChange = (reel: Reel) => {
    setGenerated((prev) => {
      const next = { ...prev, reel };
      saveGeneratedToStorage(next);
      return next;
    });
  };

  const generateBrandKit = async (targetPlan: EventPlan) => {
    setIsGeneratingKit(true);
    setGenError(null);
    setKitNotice(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json();
      if (!data.success || !data.generated) {
        throw new Error(data.error?.message || '브랜드 킷 생성에 실패했습니다.');
      }
      applyGenerated(data.generated);
      if (data.fallback) {
        setKitNotice(
          'Gemini 응답을 받지 못해 기획서 사실 기반 기본 문구로 채웠습니다. 다시 생성해 볼 수 있습니다.',
        );
      }
    } catch (err) {
      setGenError(
        err instanceof Error ? err.message : '브랜드 킷 생성 중 오류가 발생했습니다.',
      );
    } finally {
      setIsGeneratingKit(false);
    }
  };

  const handleChatPlanComplete = (createdPlan: EventPlan) => {
    handlePlanChange(createdPlan);
    setPhase('studio');
    void generateBrandKit(normalizeHost(createdPlan));
  };

  const currentTheme = themes[plan.theme] || themes.BUILD_WITH_AI;

  return (
    <div
      className="flex flex-1 flex-col min-h-screen"
      style={{ backgroundColor: color.paper, color: color.ink }}
    >
      <header
        className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md"
        style={{ backgroundColor: color.white }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {(['blue', 'red', 'yellow', 'green'] as const).map((c) => (
              <span
                key={c}
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: color[c] }}
              />
            ))}
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

        {phase === 'studio' && (
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold hidden sm:inline"
              style={{ backgroundColor: color.paper, color: color.ink }}
            >
              테마: {currentTheme.label}
            </span>
            <button
              type="button"
              onClick={() => setPhase('chat')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
              style={{ backgroundColor: color.white, color: color.ink }}
            >
              ↺ 대화로 다시 기획
            </button>
          </div>
        )}
      </header>

      {phase === 'chat' ? (
        <main className="flex flex-1 w-full max-w-3xl mx-auto p-6">
          <TerminalChatPlanner onPlanComplete={handleChatPlanComplete} />
        </main>
      ) : (
        <main className="grid flex-1 grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl w-full mx-auto">
          {/* 좌측: Gemini 구조화 출력으로 채워진 기획서 폼 (수정 가능) */}
          <section
            className="lg:col-span-5 rounded-2xl p-6 shadow-xs border border-slate-200 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
            style={{ backgroundColor: color.white }}
          >
            <PlanForm
              plan={plan}
              onChange={handlePlanChange}
              onLoadSample={() => handlePlanChange(samplePlan)}
              onReset={() => handlePlanChange(emptyPlan)}
              onGenerate={() => generateBrandKit(plan)}
              isGenerating={isGeneratingKit}
            />
          </section>

          {/* 우측: 브랜드 킷 (썸네일 · 카드뉴스 · 릴스 · SNS) */}
          <section
            className="lg:col-span-7 rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col gap-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
            style={{ backgroundColor: color.white }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold">브랜드 킷</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  기획서 폼의 사실(일시·장소·연사)은 그대로 쓰고, 문구와 구성만 Gemini 4가 만듭니다.
                </p>
              </div>
              <button
                type="button"
                disabled={isGeneratingKit}
                onClick={() => generateBrandKit(plan)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: color.green }}
              >
                {isGeneratingKit ? '⏳ 생성 중...' : '✨ 브랜드 킷 다시 생성'}
              </button>
            </div>

            {genError && (
              <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700 font-medium">
                ⚠️ {genError}
              </div>
            )}
            {kitNotice && (
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-800 font-medium">
                {kitNotice}
              </div>
            )}

            {isGeneratingKit ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 py-24 text-sm text-slate-500">
                <span className="animate-pulse text-2xl">✨</span>
                Gemini 4가 썸네일 · 카드뉴스 · 릴스 · SNS 문구를 만드는 중입니다...
              </div>
            ) : (
              <BrandKitTabs
                plan={plan}
                generated={generated}
                kitVersion={kitVersion}
                onReelChange={handleReelChange}
              />
            )}
          </section>
        </main>
      )}
    </div>
  );
}

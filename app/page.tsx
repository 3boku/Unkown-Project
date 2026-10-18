"use client";

import React, { useState } from "react";
import SnsStudioTab, {
  type FlexibleEventPlan,
  type FlexibleSns,
} from "@/components/sns/SnsStudioTab";
import sampleGeneratedJson from "@/fixtures/sample-generated.json";
import samplePlanJson from "@/fixtures/sample-plan.json";
import type { Theme } from "@/lib/schema";
import { brandCycle, color } from "@/lib/tokens";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "BUILD_WITH_AI", label: "Build with AI" },
  { value: "IO_EXTENDED", label: "Google I/O Extended" },
  { value: "DEVFEST", label: "DevFest" },
];

function createInitialPlan(): FlexibleEventPlan {
  const base = samplePlanJson as FlexibleEventPlan;
  return {
    ...base,
    perks: [...(base.perks ?? [])],
    registration: {
      platform: base.registration?.platform ?? "EVENTUS",
      url: base.registration?.url ?? "",
      deadline: base.registration?.deadline,
    },
    registrationUrl: base.registration?.url ?? "",
  };
}

export default function Home() {
  const [plan, setPlan] = useState<FlexibleEventPlan>(() =>
    createInitialPlan()
  );
  const [newPerk, setNewPerk] = useState("");
  const initialSns = sampleGeneratedJson.sns as FlexibleSns;

  const registrationUrl =
    plan.registrationUrl ?? plan.registration?.url ?? "";

  const handleRegistrationUrlChange = (nextUrl: string) => {
    setPlan((prev) => ({
      ...prev,
      registrationUrl: nextUrl,
      registration: {
        platform: prev.registration?.platform ?? "EVENTUS",
        url: nextUrl,
        deadline: prev.registration?.deadline,
      },
    }));
  };

  const handleAddPerk = () => {
    const trimmed = newPerk.trim();
    if (!trimmed) return;
    setPlan((prev) => ({
      ...prev,
      perks: [...(prev.perks ?? []), trimmed],
    }));
    setNewPerk("");
  };

  const handleRemovePerk = (idxToRemove: number) => {
    setPlan((prev) => ({
      ...prev,
      perks: (prev.perks ?? []).filter((_, idx) => idx !== idxToRemove),
    }));
  };

  const handleResetSamplePlan = () => {
    setPlan(createInitialPlan());
  };

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
        <section
          className="lg:col-span-5 rounded-2xl p-6 shadow-xs border flex flex-col gap-4 self-start"
          style={{ backgroundColor: color.white }}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold">행사 기획서 입력</h2>
              <p className="text-xs opacity-60 mt-0.5">
                일시·장소·등록 링크 수정 시 우측 SNS 문구 스튜디오와 즉시 연동됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetSamplePlan}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-opacity hover:opacity-80 cursor-pointer shrink-0"
              style={{
                backgroundColor: color.paper,
                borderColor: color.blue,
                color: color.blue,
              }}
            >
              샘플 복원
            </button>
          </div>

          <div className="flex flex-col gap-3.5 text-xs">
            {/* 테마 선택 */}
            <div>
              <label
                htmlFor="plan-theme"
                className="block font-semibold mb-1 opacity-75"
              >
                행사 테마 (Theme)
              </label>
              <select
                id="plan-theme"
                value={plan.theme}
                onChange={(e) =>
                  setPlan((prev) => ({
                    ...prev,
                    theme: e.target.value as Theme,
                  }))
                }
                className="w-full rounded-xl px-3 py-2 border font-medium focus:outline-none"
                style={{
                  backgroundColor: color.paper,
                  color: color.ink,
                }}
              >
                {THEME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.value})
                  </option>
                ))}
              </select>
            </div>

            {/* 행사명 */}
            <div>
              <label
                htmlFor="plan-title"
                className="block font-semibold mb-1 opacity-75"
              >
                행사명 (Title)
              </label>
              <input
                id="plan-title"
                type="text"
                value={plan.title}
                onChange={(e) =>
                  setPlan((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full rounded-xl px-3 py-2 border font-medium focus:outline-none"
                style={{
                  backgroundColor: color.paper,
                  color: color.ink,
                }}
              />
            </div>

            {/* 한 줄 훅 */}
            <div>
              <label
                htmlFor="plan-hook"
                className="block font-semibold mb-1 opacity-75"
              >
                핵심 한 줄 훅 (Hook)
              </label>
              <input
                id="plan-hook"
                type="text"
                value={plan.hook}
                onChange={(e) =>
                  setPlan((prev) => ({ ...prev, hook: e.target.value }))
                }
                className="w-full rounded-xl px-3 py-2 border font-medium focus:outline-none"
                style={{
                  backgroundColor: color.paper,
                  color: color.ink,
                }}
              />
            </div>

            {/* 일시 */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label
                  htmlFor="plan-date"
                  className="block font-semibold mb-1 opacity-75"
                >
                  날짜 (Date)
                </label>
                <input
                  id="plan-date"
                  type="text"
                  value={plan.date}
                  onChange={(e) =>
                    setPlan((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="w-full rounded-xl px-2.5 py-2 border font-medium focus:outline-none"
                  style={{
                    backgroundColor: color.paper,
                    color: color.ink,
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="plan-start-time"
                  className="block font-semibold mb-1 opacity-75"
                >
                  시작 시간
                </label>
                <input
                  id="plan-start-time"
                  type="text"
                  value={plan.startTime}
                  onChange={(e) =>
                    setPlan((prev) => ({ ...prev, startTime: e.target.value }))
                  }
                  className="w-full rounded-xl px-2.5 py-2 border font-medium focus:outline-none"
                  style={{
                    backgroundColor: color.paper,
                    color: color.ink,
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="plan-end-time"
                  className="block font-semibold mb-1 opacity-75"
                >
                  종료 시간
                </label>
                <input
                  id="plan-end-time"
                  type="text"
                  value={plan.endTime}
                  onChange={(e) =>
                    setPlan((prev) => ({ ...prev, endTime: e.target.value }))
                  }
                  className="w-full rounded-xl px-2.5 py-2 border font-medium focus:outline-none"
                  style={{
                    backgroundColor: color.paper,
                    color: color.ink,
                  }}
                />
              </div>
            </div>

            {/* 장소 */}
            <div>
              <label
                htmlFor="plan-venue"
                className="block font-semibold mb-1 opacity-75"
              >
                장소 (Venue)
              </label>
              <input
                id="plan-venue"
                type="text"
                value={plan.venue}
                onChange={(e) =>
                  setPlan((prev) => ({ ...prev, venue: e.target.value }))
                }
                className="w-full rounded-xl px-3 py-2 border font-medium focus:outline-none"
                style={{
                  backgroundColor: color.paper,
                  color: color.ink,
                }}
              />
            </div>

            {/* 등록 링크 (registrationUrl / registration.url) */}
            <div>
              <label
                htmlFor="plan-registration-url"
                className="block font-semibold mb-1 opacity-75"
              >
                참가 신청 링크 (Registration URL · 쓰레드 첫 댓글 자동 연동)
              </label>
              <input
                id="plan-registration-url"
                type="url"
                value={registrationUrl}
                onChange={(e) => handleRegistrationUrlChange(e.target.value)}
                placeholder="https://event-us.kr/..."
                className="w-full rounded-xl px-3 py-2 border font-medium focus:outline-none"
                style={{
                  backgroundColor: color.paper,
                  color: color.ink,
                  borderColor: color.green,
                }}
              />
            </div>

            {/* 제공 혜택 (Perks) */}
            <div className="flex flex-col gap-2">
              <span className="font-semibold opacity-75">
                참가자 혜택 (Perks · {plan.perks.length}개)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {plan.perks.map((perk, idx) => {
                  const accent = brandCycle[idx % brandCycle.length];
                  return (
                    <span
                      key={`${perk}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-medium"
                      style={{
                        backgroundColor: color.paper,
                        borderColor: accent,
                        color: color.ink,
                      }}
                    >
                      <span>{perk}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePerk(idx)}
                        aria-label={`${perk} 삭제`}
                        className="opacity-60 hover:opacity-100 font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newPerk}
                  onChange={(e) => setNewPerk(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddPerk();
                    }
                  }}
                  placeholder="혜택 추가 (예: Google Cloud 크레딧 제공)"
                  className="flex-1 rounded-xl px-3 py-1.5 border focus:outline-none"
                  style={{
                    backgroundColor: color.paper,
                    color: color.ink,
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddPerk}
                  className="px-3 py-1.5 rounded-xl font-semibold cursor-pointer"
                  style={{
                    backgroundColor: color.blue,
                    color: color.white,
                  }}
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        </section>

        <section
          className="lg:col-span-7 rounded-2xl p-6 shadow-xs border flex flex-col gap-5"
          style={{ backgroundColor: color.white }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b">
            <div>
              <h2 className="text-base font-bold">브랜드 킷 프리뷰 · SNS 문구 스튜디오</h2>
              <p className="text-xs opacity-60 mt-0.5">
                인스타그램 캡션 · 쓰레드 본문(500자) · 쓰레드 첫 댓글(신청 링크 분리) 원클릭 복사 및 부분 다듬기
              </p>
            </div>
            <span
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{
                backgroundColor: color.blue,
                color: color.white,
              }}
            >
              SNS 문구 탭 (BK-08)
            </span>
          </div>

          <SnsStudioTab plan={plan} initialSns={initialSns} />
        </section>
      </main>
    </div>
  );
}

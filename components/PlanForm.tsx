'use client';

import React, { useRef } from 'react';
import {
  type EventPlan,
  type ScheduleItem,
  type Speaker,
  type SpecialEvent,
  type Theme,
} from '../lib/schema';
import { color, themes } from '../lib/tokens';
import { getMissingRequiredFields, isPlanValidForGeneration } from '../lib/storage';

interface PlanFormProps {
  plan: EventPlan;
  onChange: (updated: EventPlan) => void;
  onLoadSample: () => void;
  onReset: () => void;
  onGenerate?: () => void;
  isGenerating?: boolean;
}

export function PlanForm({
  plan,
  onChange,
  onLoadSample,
  onReset,
  onGenerate,
  isGenerating = false,
}: PlanFormProps) {
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const kvInputRef = useRef<HTMLInputElement | null>(null);
  const sponsorLogoInputRef = useRef<HTMLInputElement | null>(null);

  const [sponsorNameInput, setSponsorNameInput] = React.useState('');
  const [sponsorLogoUrlInput, setSponsorLogoUrlInput] = React.useState('');

  const updateDesignAsset = (
    field: 'logoUrl' | 'keyVisualUrl',
    value: string,
  ) => {
    onChange({
      ...plan,
      designAssets: {
        ...(plan.designAssets ?? { sponsorLogos: [], extraAssets: [] }),
        [field]: value,
      },
    });
  };

  const handleDesignAssetUpload = (
    field: 'logoUrl' | 'keyVisualUrl',
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateDesignAsset(field, reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSponsorLogoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSponsorLogoUrlInput(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddSponsorLogo = () => {
    if (!sponsorNameInput.trim() || !sponsorLogoUrlInput.trim()) return;
    const currentList = plan.designAssets?.sponsorLogos ?? [];
    onChange({
      ...plan,
      designAssets: {
        ...(plan.designAssets ?? { extraAssets: [] }),
        sponsorLogos: [
          ...currentList,
          {
            name: sponsorNameInput.trim(),
            logoUrl: sponsorLogoUrlInput.trim(),
          },
        ],
      },
    });
    setSponsorNameInput('');
    setSponsorLogoUrlInput('');
  };

  const handleRemoveSponsorLogo = (index: number) => {
    const currentList = plan.designAssets?.sponsorLogos ?? [];
    onChange({
      ...plan,
      designAssets: {
        ...(plan.designAssets ?? { extraAssets: [] }),
        sponsorLogos: currentList.filter((_, i) => i !== index),
      },
    });
  };

  const updateField = <K extends keyof EventPlan>(
    key: K,
    value: EventPlan[K],
  ) => {
    onChange({
      ...plan,
      [key]: value,
    });
  };

  const updateRegistration = (
    key: 'platform' | 'url' | 'deadline',
    value: string,
  ) => {
    onChange({
      ...plan,
      registration: {
        ...plan.registration,
        [key]: value,
      },
    });
  };

  // Schedule management
  const addScheduleItem = () => {
    const newItem: ScheduleItem = {
      start: '13:00',
      end: '14:00',
      title: '',
      note: '',
      highlight: false,
    };
    onChange({
      ...plan,
      schedule: [...plan.schedule, newItem],
    });
  };

  const updateScheduleItem = (
    index: number,
    field: keyof ScheduleItem,
    value: unknown,
  ) => {
    const next = [...plan.schedule];
    next[index] = {
      ...next[index],
      [field]: value,
    };
    onChange({
      ...plan,
      schedule: next,
    });
  };

  const removeScheduleItem = (index: number) => {
    onChange({
      ...plan,
      schedule: plan.schedule.filter((_, i) => i !== index),
    });
  };

  // Speaker management
  const addSpeaker = () => {
    const newSpeaker: Speaker = {
      name: '',
      affiliation: '',
      sessionTitle: '',
      summary: '',
      kind: 'SESSION',
      photoUrl: '',
    };
    onChange({
      ...plan,
      speakers: [...plan.speakers, newSpeaker],
    });
  };

  const updateSpeaker = (
    index: number,
    field: keyof Speaker,
    value: unknown,
  ) => {
    const next = [...plan.speakers];
    next[index] = {
      ...next[index],
      [field]: value,
    };
    onChange({
      ...plan,
      speakers: next,
    });
  };

  const removeSpeaker = (index: number) => {
    onChange({
      ...plan,
      speakers: plan.speakers.filter((_, i) => i !== index),
    });
  };

  const handleSpeakerPhotoUpload = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateSpeaker(index, 'photoUrl', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Special Events management
  const addSpecialEvent = () => {
    const newEvent: SpecialEvent = {
      title: '',
      desc: '',
    };
    onChange({
      ...plan,
      specialEvents: [...plan.specialEvents, newEvent],
    });
  };

  const updateSpecialEvent = (
    index: number,
    field: keyof SpecialEvent,
    value: string,
  ) => {
    const next = [...plan.specialEvents];
    next[index] = {
      ...next[index],
      [field]: value,
    };
    onChange({
      ...plan,
      specialEvents: next,
    });
  };

  const removeSpecialEvent = (index: number) => {
    onChange({
      ...plan,
      specialEvents: plan.specialEvents.filter((_, i) => i !== index),
    });
  };

  // Perks tag management
  const [newPerkInput, setNewPerkInput] = React.useState('');
  const handleAddPerk = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newPerkInput.trim();
    if (!trimmed) return;
    if (!plan.perks.includes(trimmed)) {
      onChange({
        ...plan,
        perks: [...plan.perks, trimmed],
      });
    }
    setNewPerkInput('');
  };

  const handleRemovePerk = (index: number) => {
    onChange({
      ...plan,
      perks: plan.perks.filter((_, i) => i !== index),
    });
  };

  // Sponsor tag management
  const [newSponsorInput, setNewSponsorInput] = React.useState('');
  const handleAddSponsor = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newSponsorInput.trim();
    if (!trimmed) return;
    if (!plan.sponsors.includes(trimmed)) {
      onChange({
        ...plan,
        sponsors: [...plan.sponsors, trimmed],
      });
    }
    setNewSponsorInput('');
  };

  const handleRemoveSponsor = (index: number) => {
    onChange({
      ...plan,
      sponsors: plan.sponsors.filter((_, i) => i !== index),
    });
  };

  const isValid = isPlanValidForGeneration(plan);
  const missingFields = getMissingRequiredFields(plan);

  return (
    <div className="flex flex-col gap-6 text-sm">
      {/* Top action toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color.green }}
          />
          <span className="text-xs text-slate-500 font-medium">
            입력 즉시 자동 저장됨 (localStorage)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLoadSample}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
            style={{ color: color.ink }}
          >
            📋 샘플 불러오기
          </button>
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 1. 기본 정보 (Basic Info) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3
            className="text-base font-bold flex items-center gap-2"
            style={{ color: color.ink }}
          >
            <span
              className="inline-block w-2 h-4 rounded-full"
              style={{ backgroundColor: color.blue }}
            />
            기본 행사 정보
          </h3>
          <span className="text-xs text-slate-400">* 표시는 필수 항목</span>
        </div>

        {/* Theme & Year */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              테마 프리셋 *
            </label>
            <select
              value={plan.theme}
              onChange={(e) => updateField('theme', e.target.value as Theme)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {Object.entries(themes).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              연도 (Year) *
            </label>
            <input
              type="text"
              value={plan.year}
              onChange={(e) => updateField('year', e.target.value)}
              placeholder="2026"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              주최 단체 (Host)
            </label>
            <input
              type="text"
              value={plan.hostName}
              onChange={(e) => updateField('hostName', e.target.value)}
              placeholder="GDG"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            행사 공식 명칭 (Title) *
          </label>
          <input
            type="text"
            value={plan.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="예: Build with AI Hands-on Campus"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Hook */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            후킹 문구 (Hook)
          </label>
          <input
            type="text"
            value={plan.hook}
            onChange={(e) => updateField('hook', e.target.value)}
            placeholder="예: AI로 어디까지 만들 수 있을까?"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            행사 상세 소개 (Description)
          </label>
          <textarea
            rows={3}
            value={plan.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="행사의 목적, 내용, 분위기를 간략히 적어주세요."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              행사 일자 (Date) *
            </label>
            <input
              type="date"
              value={plan.date}
              onChange={(e) => updateField('date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              시작 시간 (Start Time) *
            </label>
            <input
              type="time"
              value={plan.startTime}
              onChange={(e) => updateField('startTime', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              종료 시간 (End Time)
            </label>
            <input
              type="time"
              value={plan.endTime}
              onChange={(e) => updateField('endTime', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Venue & Capacity */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              장소 (Venue) *
            </label>
            <input
              type="text"
              value={plan.venue}
              onChange={(e) => updateField('venue', e.target.value)}
              placeholder="예: 서강대학교 정하상관"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              모집 정원 (명)
            </label>
            <input
              type="number"
              min={1}
              value={plan.capacity ?? ''}
              onChange={(e) =>
                updateField(
                  'capacity',
                  e.target.value ? parseInt(e.target.value, 10) : undefined,
                )
              }
              placeholder="예: 200"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Program Summary & Target Audience */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              프로그램 요약
            </label>
            <input
              type="text"
              value={plan.programSummary}
              onChange={(e) => updateField('programSummary', e.target.value)}
              placeholder="예: 총 9개의 Hands-on과 3개의 Session"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              대상 청중
            </label>
            <input
              type="text"
              value={plan.targetAudience}
              onChange={(e) => updateField('targetAudience', e.target.value)}
              placeholder="예: 대학생, 취업 준비생, 주니어 개발자"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Perks */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            참가 혜택 (Perks)
          </label>
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {plan.perks.map((perk, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
              >
                {perk}
                <button
                  type="button"
                  onClick={() => handleRemovePerk(idx)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer ml-0.5"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPerkInput}
              onChange={(e) => setNewPerkInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddPerk();
                }
              }}
              placeholder="혜택 입력 후 추가 (예: 리미티드 굿즈)"
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => handleAddPerk()}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              추가
            </button>
          </div>
        </div>
      </section>

      {/* 2. 행사 자료 및 로고 에셋 */}
      <section className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h3
            className="text-base font-bold flex items-center gap-2"
            style={{ color: color.ink }}
          >
            <span
              className="inline-block w-2 h-4 rounded-full"
              style={{ backgroundColor: color.yellow }}
            />
            행사 자료 및 브랜드 에셋 (Event Files &amp; Logos)
          </h3>
          <span className="text-xs text-slate-400">선택 사항</span>
        </div>

        {/* Notice explaining studio generates key visual and posters */}
        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-950 flex items-start gap-2.5">
          <span className="text-sm">🎨</span>
          <div className="leading-relaxed">
            <strong>키비주얼·포스터·카드뉴스는 스튜디오가 직접 만들어 드립니다.</strong>
            <p className="text-blue-800/80 mt-0.5">
              행사에서 사용되는 파일(행사 전용 로고, 후원사 로고 등)만 넣어주시면, 기획서 내용과 브랜드 가이드에 맞춰 모든 디자인 에셋이 자동 생성됩니다.
            </p>
          </div>
        </div>

        {/* 1. 행사 커스텀 로고 */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              행사/챕터 로고 (Custom Logo / Lockup)
            </label>
            <span className="text-[11px] text-slate-400">
              미입력 시 기본 GDG 락업 로고 적용
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {plan.designAssets?.logoUrl ? (
              <div className="relative w-16 h-12 bg-white rounded-lg border border-slate-300 p-1 flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={plan.designAssets.logoUrl}
                  alt="Custom Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : null}

            <div className="flex-1 flex gap-2 w-full">
              <input
                type="text"
                value={plan.designAssets?.logoUrl ?? ''}
                onChange={(e) => updateDesignAsset('logoUrl', e.target.value)}
                placeholder="로고 이미지 URL (https://... 또는 파일 선택)"
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="file"
                accept="image/*"
                ref={logoInputRef}
                onChange={(e) => handleDesignAssetUpload('logoUrl', e)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer shrink-0"
              >
                📁 파일 선택
              </button>
              {plan.designAssets?.logoUrl && (
                <button
                  type="button"
                  onClick={() => updateDesignAsset('logoUrl', '')}
                  className="px-2 py-1.5 text-xs text-slate-400 hover:text-red-500 cursor-pointer"
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. 키비주얼 / 배경 그래픽 (선택 오버라이드) */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              커스텀 키비주얼 직접 지정 (선택 오버라이드)
            </label>
            <span className="text-[11px] text-slate-400">
              미입력 시 테마 키비주얼 그래픽을 스튜디오가 자동 생성합니다.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {plan.designAssets?.keyVisualUrl ? (
              <div className="relative w-20 h-12 bg-white rounded-lg border border-slate-300 overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={plan.designAssets.keyVisualUrl}
                  alt="Key Visual"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}

            <div className="flex-1 flex gap-2 w-full">
              <input
                type="text"
                value={plan.designAssets?.keyVisualUrl ?? ''}
                onChange={(e) =>
                  updateDesignAsset('keyVisualUrl', e.target.value)
                }
                placeholder="키비주얼 이미지 URL (https://... 또는 파일 선택)"
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="file"
                accept="image/*"
                ref={kvInputRef}
                onChange={(e) => handleDesignAssetUpload('keyVisualUrl', e)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => kvInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer shrink-0"
              >
                📁 파일 선택
              </button>
              {plan.designAssets?.keyVisualUrl && (
                <button
                  type="button"
                  onClick={() => updateDesignAsset('keyVisualUrl', '')}
                  className="px-2 py-1.5 text-xs text-slate-400 hover:text-red-500 cursor-pointer"
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. 후원사 로고 이미지들 */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            후원사 로고 이미지 (Sponsor Logos)
          </label>

          {plan.designAssets?.sponsorLogos &&
            plan.designAssets.sponsorLogos.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {plan.designAssets.sponsorLogos.map((sp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sp.logoUrl}
                      alt={sp.name}
                      className="w-5 h-5 object-contain"
                    />
                    <span className="font-medium text-slate-700">{sp.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSponsorLogo(idx)}
                      className="text-slate-400 hover:text-red-500 cursor-pointer ml-1"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              type="text"
              value={sponsorNameInput}
              onChange={(e) => setSponsorNameInput(e.target.value)}
              placeholder="후원사 이름 (예: Google Cloud)"
              className="sm:col-span-4 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="sm:col-span-8 flex gap-2">
              <input
                type="text"
                value={sponsorLogoUrlInput}
                onChange={(e) => setSponsorLogoUrlInput(e.target.value)}
                placeholder="로고 URL 또는 파일 선택"
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="file"
                accept="image/*"
                ref={sponsorLogoInputRef}
                onChange={handleSponsorLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => sponsorLogoInputRef.current?.click()}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer shrink-0"
              >
                📁 파일
              </button>
              <button
                type="button"
                onClick={handleAddSponsorLogo}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer shrink-0"
              >
                로고 추가
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 신청 정보 (Registration) */}
      <section className="space-y-4 pt-4 border-t border-slate-200">
        <h3
          className="text-base font-bold flex items-center gap-2"
          style={{ color: color.ink }}
        >
          <span
            className="inline-block w-2 h-4 rounded-full"
            style={{ backgroundColor: color.red }}
          />
          신청 및 티켓 정보
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              신청 플랫폼
            </label>
            <select
              value={plan.registration.platform}
              onChange={(e) => updateRegistration('platform', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EVENTUS">이벤터스 (Eventus)</option>
              <option value="TICKETTACO">티켓타코 (TicketTaco)</option>
              <option value="OTHER">기타 (Other)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              신청 페이지 URL
            </label>
            <input
              type="url"
              value={plan.registration.url}
              onChange={(e) => updateRegistration('url', e.target.value)}
              placeholder="https://event-us.kr/..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            신청 마감일
          </label>
          <input
            type="date"
            value={plan.registration.deadline ?? ''}
            onChange={(e) => updateRegistration('deadline', e.target.value)}
            className="w-full sm:w-1/2 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </section>

      {/* 3. 타임테이블 (Schedule) */}
      <section className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h3
            className="text-base font-bold flex items-center gap-2"
            style={{ color: color.ink }}
          >
            <span
              className="inline-block w-2 h-4 rounded-full"
              style={{ backgroundColor: color.yellow }}
            />
            타임테이블 ({plan.schedule.length}개 세션)
          </h3>
          <button
            type="button"
            onClick={addScheduleItem}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            + 일정 추가
          </button>
        </div>

        {plan.schedule.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
            등록된 일정이 없습니다. &apos;+ 일정 추가&apos; 버튼을 눌러 추가하세요.
          </div>
        ) : (
          <div className="space-y-2">
            {plan.schedule.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs">
                    <input
                      type="text"
                      value={item.start}
                      onChange={(e) =>
                        updateScheduleItem(idx, 'start', e.target.value)
                      }
                      placeholder="13:00"
                      className="w-16 px-2 py-1 border border-slate-300 rounded bg-white font-mono text-center text-xs"
                    />
                    <span className="text-slate-400">~</span>
                    <input
                      type="text"
                      value={item.end}
                      onChange={(e) =>
                        updateScheduleItem(idx, 'end', e.target.value)
                      }
                      placeholder="14:00"
                      className="w-16 px-2 py-1 border border-slate-300 rounded bg-white font-mono text-center text-xs"
                    />
                  </div>

                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) =>
                      updateScheduleItem(idx, 'title', e.target.value)
                    }
                    placeholder="세션 / 프로그램 제목"
                    className="flex-1 px-2.5 py-1 border border-slate-300 rounded bg-white text-xs font-medium"
                  />

                  <button
                    type="button"
                    onClick={() => removeScheduleItem(idx)}
                    className="text-slate-400 hover:text-red-500 p-1 text-base leading-none cursor-pointer"
                    title="삭제"
                  >
                    &times;
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs pl-1">
                  <input
                    type="text"
                    value={item.note ?? ''}
                    onChange={(e) =>
                      updateScheduleItem(idx, 'note', e.target.value)
                    }
                    placeholder="비고 / 장소 안내 (선택)"
                    className="flex-1 px-2 py-1 border border-slate-200 rounded bg-white text-slate-600 text-xs"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={item.highlight}
                      onChange={(e) =>
                        updateScheduleItem(idx, 'highlight', e.target.checked)
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    강조 표시
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. 연사 목록 (Speakers) */}
      <section className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h3
            className="text-base font-bold flex items-center gap-2"
            style={{ color: color.ink }}
          >
            <span
              className="inline-block w-2 h-4 rounded-full"
              style={{ backgroundColor: color.green }}
            />
            연사자 목록 ({plan.speakers.length}명)
          </h3>
          <button
            type="button"
            onClick={addSpeaker}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            + 연사 추가
          </button>
        </div>

        {plan.speakers.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
            등록된 연사가 없습니다. &apos;+ 연사 추가&apos; 버튼을 눌러 추가하세요.
          </div>
        ) : (
          <div className="space-y-3">
            {plan.speakers.map((speaker, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Speaker photo preview or initial */}
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center text-slate-600 font-bold border border-slate-300 shrink-0">
                      {speaker.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={speaker.photoUrl}
                          alt={speaker.name || 'Speaker'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{speaker.name ? speaker.name.slice(0, 2) : '연사'}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {speaker.name || `연사 #${idx + 1}`}
                        </span>
                        <select
                          value={speaker.kind}
                          onChange={(e) =>
                            updateSpeaker(
                              idx,
                              'kind',
                              e.target.value as 'HANDS_ON' | 'SESSION',
                            )
                          }
                          className="px-2 py-0.5 border border-slate-300 rounded text-xs bg-white font-medium"
                        >
                          <option value="HANDS_ON">핸즈온 (Hands-on)</option>
                          <option value="SESSION">세션 (Session)</option>
                        </select>
                      </div>
                      <p className="text-xs text-slate-500">
                        {speaker.affiliation || '소속 미입력'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSpeaker(idx)}
                    className="text-slate-400 hover:text-red-500 p-1 text-base leading-none cursor-pointer"
                    title="연사 삭제"
                  >
                    &times;
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      이름
                    </label>
                    <input
                      type="text"
                      value={speaker.name}
                      onChange={(e) =>
                        updateSpeaker(idx, 'name', e.target.value)
                      }
                      placeholder="홍길동"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      소속 및 직책
                    </label>
                    <input
                      type="text"
                      value={speaker.affiliation}
                      onChange={(e) =>
                        updateSpeaker(idx, 'affiliation', e.target.value)
                      }
                      placeholder="Google Developer Expert"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    발표 세션 제목
                  </label>
                  <input
                    type="text"
                    value={speaker.sessionTitle}
                    onChange={(e) =>
                      updateSpeaker(idx, 'sessionTitle', e.target.value)
                    }
                    placeholder="세션 제목을 입력하세요"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    세션 요약 소개
                  </label>
                  <textarea
                    rows={2}
                    value={speaker.summary}
                    onChange={(e) =>
                      updateSpeaker(idx, 'summary', e.target.value)
                    }
                    placeholder="세션에서 다루는 내용 요약"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs resize-y"
                  />
                </div>

                {/* Photo URL or File Upload */}
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    사진 등록 (URL 또는 파일 선택)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={speaker.photoUrl ?? ''}
                      onChange={(e) =>
                        updateSpeaker(idx, 'photoUrl', e.target.value)
                      }
                      placeholder="https://... 또는 파일 선택"
                      className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                    />
                    <div className="flex items-center gap-1.5">
                      <input
                        type="file"
                        accept="image/*"
                        ref={(el) => {
                          fileInputRefs.current[idx] = el;
                        }}
                        onChange={(e) => handleSpeakerPhotoUpload(idx, e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[idx]?.click()}
                        className="px-2.5 py-1.5 text-xs font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer"
                      >
                        📁 파일 선택
                      </button>
                      {speaker.photoUrl && (
                        <button
                          type="button"
                          onClick={() => updateSpeaker(idx, 'photoUrl', '')}
                          className="px-2 py-1.5 text-xs text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. 특별 이벤트 및 후원사 */}
      <section className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h3
            className="text-base font-bold flex items-center gap-2"
            style={{ color: color.ink }}
          >
            <span
              className="inline-block w-2 h-4 rounded-full"
              style={{ backgroundColor: color.blue }}
            />
            특별 이벤트 및 후원사
          </h3>
          <button
            type="button"
            onClick={addSpecialEvent}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            + 이벤트 추가
          </button>
        </div>

        {/* Special Events list */}
        {plan.specialEvents.length > 0 && (
          <div className="space-y-2">
            {plan.specialEvents.map((evt, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={evt.title}
                    onChange={(e) =>
                      updateSpecialEvent(idx, 'title', e.target.value)
                    }
                    placeholder="이벤트 제목 (예: 럭키드로우)"
                    className="flex-1 px-2.5 py-1 border border-slate-300 rounded bg-white text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpecialEvent(idx)}
                    className="text-slate-400 hover:text-red-500 p-1 text-base leading-none cursor-pointer"
                    title="삭제"
                  >
                    &times;
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={evt.desc}
                  onChange={(e) =>
                    updateSpecialEvent(idx, 'desc', e.target.value)
                  }
                  placeholder="이벤트 설명"
                  className="w-full px-2.5 py-1 border border-slate-300 rounded bg-white text-xs resize-y"
                />
              </div>
            ))}
          </div>
        )}

        {/* Sponsors */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            후원사 (Sponsors)
          </label>
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {plan.sponsors.map((sponsor, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
              >
                {sponsor}
                <button
                  type="button"
                  onClick={() => handleRemoveSponsor(idx)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer ml-0.5"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSponsorInput}
              onChange={(e) => setNewSponsorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSponsor();
                }
              }}
              placeholder="후원사 입력 후 추가 (예: Google Developers)"
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => handleAddSponsor()}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              추가
            </button>
          </div>
        </div>
      </section>

      {/* 6. 생성 액션 버튼 및 유효성 피드백 */}
      <section className="pt-4 border-t border-slate-200 space-y-3 sticky bottom-0 bg-white/95 backdrop-blur-xs py-3 -mx-2 px-2 shadow-xs">
        {!isValid && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <span className="font-semibold">⚠️ 필수 항목을 입력해주세요:</span>{' '}
            {missingFields.join(', ')}
          </div>
        )}

        <button
          type="button"
          onClick={onGenerate}
          disabled={!isValid || isGenerating}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
            isValid && !isGenerating
              ? 'hover:opacity-90 active:scale-[0.99]'
              : 'opacity-40 cursor-not-allowed'
          }`}
          style={{ backgroundColor: color.blue }}
        >
          {isGenerating ? (
            <>
              <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              생성 중...
            </>
          ) : (
            <>✨ 브랜드 킷 생성</>
          )}
        </button>
      </section>
    </div>
  );
}

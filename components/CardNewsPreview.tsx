'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CardSlide, EventPlan } from '../lib/schema.ts';
import { normalizeCardSlidesForPlan } from '../lib/speaker-photo.ts';
import { brandCycle, color } from '../lib/tokens.ts';

export interface CardNewsPreviewProps {
  plan: EventPlan;
  cards: CardSlide[];
}

export function buildCardSlideFilename(idx: number, slide: CardSlide): string {
  const num = String(idx + 1).padStart(2, '0');
  const typeSlug = slide.type.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `gdg-card-${num}-${typeSlug}.png`;
}

export function buildAllCardSlideFilenames(slides: CardSlide[]): string[] {
  return slides.map((slide, idx) => buildCardSlideFilename(idx, slide));
}

function arrayBufferToDataUrl(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

export function CardNewsPreview({ plan, cards }: CardNewsPreviewProps) {
  const normalizedCards = useMemo(
    () => normalizeCardSlidesForPlan(plan, cards),
    [plan, cards]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<number, string>>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const downloadFormRef = useRef<HTMLFormElement | null>(null);
  const downloadInputRef = useRef<HTMLInputElement | null>(null);

  const total = normalizedCards.length;
  const currentIndex = total > 0 ? Math.min(activeIndex, total - 1) : 0;
  const currentSlide = normalizedCards[currentIndex];

  const renderSlideAtIndex = useCallback(
    async (idx: number, slide: CardSlide) => {
      setLoadingMap((prev) => ({ ...prev, [idx]: true }));
      setErrorMap((prev) => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });

      try {
        const res = await fetch('/api/render/card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan,
            slide,
            slideIndex: idx,
            totalSlides: normalizedCards.length,
          }),
        });

        if (!res.ok) {
          throw new Error(`카드 렌더링 실패 (HTTP ${res.status})`);
        }

        const buffer = await res.arrayBuffer();
        const dataUrl = arrayBufferToDataUrl(buffer);

        setImageUrls((prev) => ({ ...prev, [idx]: dataUrl }));
      } catch (err) {
        setErrorMap((prev) => ({
          ...prev,
          [idx]:
            err instanceof Error
              ? err.message
              : '카드뉴스 이미지를 생성하지 못했습니다.',
        }));
      } finally {
        setLoadingMap((prev) => ({ ...prev, [idx]: false }));
      }
    },
    [plan, normalizedCards.length]
  );

  useEffect(() => {
    normalizedCards.forEach((slide, idx) => {
      void renderSlideAtIndex(idx, slide);
    });
  }, [normalizedCards, renderSlideAtIndex]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
  };

  const triggerSlideDownload = useCallback(
    (idx: number, slide: CardSlide) => {
      const filename = buildCardSlideFilename(idx, slide);

      // 1. 서버 Content-Disposition: attachment 폼 제출
      // 연속 다운로드 시 이전 요청이 취소되지 않도록 슬라이드별 숨김 iframe을 타겟으로 지정
      if (
        typeof document !== 'undefined' &&
        downloadFormRef.current &&
        downloadInputRef.current
      ) {
        const frameName = `gdg-card-dl-frame-${idx}-${Date.now()}`;
        const iframe = document.createElement('iframe');
        iframe.name = frameName;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        downloadFormRef.current.target = frameName;
        downloadInputRef.current.value = JSON.stringify({
          plan,
          slide,
          slideIndex: idx,
          totalSlides: total,
          filename,
        });
        downloadFormRef.current.submit();

        window.setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 15000);
        return;
      }

      // 2. Fallback: data URL 직접 다운로드
      const dataUrl = imageUrls[idx];
      if (dataUrl) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    },
    [imageUrls, plan, total]
  );

  const handleDownloadCurrent = () => {
    if (!currentSlide || isDownloading || batchProgress !== null) return;
    setIsDownloading(true);
    try {
      triggerSlideDownload(currentIndex, currentSlide);
    } finally {
      setTimeout(() => setIsDownloading(false), 600);
    }
  };

  const handleDownloadAll = async () => {
    if (total === 0 || isDownloading || batchProgress !== null) return;
    setBatchProgress({ current: 0, total });
    try {
      for (let idx = 0; idx < normalizedCards.length; idx++) {
        setBatchProgress({ current: idx + 1, total });
        triggerSlideDownload(idx, normalizedCards[idx]);
        if (idx < normalizedCards.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 450));
        }
      }
    } finally {
      setTimeout(() => setBatchProgress(null), 600);
    }
  };

  if (total === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 rounded-xl border"
        style={{ backgroundColor: color.paper, color: color.ink }}
      >
        <p className="text-sm font-medium opacity-60">
          생성된 카드뉴스 슬라이드가 없습니다.
        </p>
      </div>
    );
  }

  const isBusyDownloading = isDownloading || batchProgress !== null;

  return (
    <div className="flex flex-col gap-4">
      {/* 브라우저/웹뷰 네이티브 다운로드 트리거용 form (Content-Disposition: attachment 응답이므로 현재 페이지 유지) */}
      <form
        ref={downloadFormRef}
        method="POST"
        action="/api/render/card?download=1"
        className="hidden"
      >
        <input ref={downloadInputRef} type="hidden" name="payload" defaultValue="" />
      </form>

      {/* 상단 컨트롤 바 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold border"
            style={{
              backgroundColor: color.yellow,
              color: color.ink,
              borderColor: color.ink,
            }}
          >
            {currentIndex + 1} / {total}
          </span>
          <span className="text-sm font-bold">
            {currentSlide?.type} 슬라이드
          </span>
          <span className="text-xs opacity-60">(1080 × 1350 px · 4:5)</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer"
            style={{
              backgroundColor: color.white,
              color: color.ink,
              borderColor: color.ink,
            }}
            aria-label="이전 슬라이드"
          >
            ← 이전
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer"
            style={{
              backgroundColor: color.white,
              color: color.ink,
              borderColor: color.ink,
            }}
            aria-label="다음 슬라이드"
          >
            다음 →
          </button>
          <button
            type="button"
            onClick={handleDownloadCurrent}
            disabled={!currentSlide || isBusyDownloading}
            className="px-4 py-1.5 rounded-lg text-xs font-bold border transition disabled:opacity-40 cursor-pointer"
            style={{
              backgroundColor: color.blue,
              color: color.white,
              borderColor: color.ink,
            }}
          >
            {isDownloading ? '다운로드 준비 중...' : 'PNG 다운로드'}
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadAll()}
            disabled={total === 0 || isBusyDownloading}
            className="px-4 py-1.5 rounded-lg text-xs font-bold border transition disabled:opacity-40 cursor-pointer"
            style={{
              backgroundColor: color.ink,
              color: color.white,
              borderColor: color.ink,
            }}
          >
            {batchProgress
              ? `전체 다운로드 중 (${batchProgress.current}/${batchProgress.total})...`
              : `전체 다운로드 (${total}장)`}
          </button>
        </div>
      </div>

      {/* 메인 4:5 카드 프리뷰 뷰포트 */}
      <div
        className="relative flex items-center justify-center rounded-2xl border overflow-hidden mx-auto w-full max-w-md aspect-4/5"
        style={{
          backgroundColor: color.paper,
          borderColor: color.ink,
        }}
      >
        {loadingMap[currentIndex] && !imageUrls[currentIndex] ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <span className="text-sm font-bold">
              카드뉴스 PNG 렌더링 중... ({currentIndex + 1}/{total})
            </span>
            <span className="text-xs opacity-60">
              Satori + Pretendard OTF (1080×1350)
            </span>
          </div>
        ) : errorMap[currentIndex] ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <span className="text-sm font-bold" style={{ color: color.red }}>
              {errorMap[currentIndex]}
            </span>
            <button
              type="button"
              onClick={() =>
                currentSlide && void renderSlideAtIndex(currentIndex, currentSlide)
              }
              className="px-3 py-1.5 rounded-lg text-xs font-bold border"
              style={{
                backgroundColor: color.white,
                color: color.ink,
                borderColor: color.ink,
              }}
            >
              다시 시도
            </button>
          </div>
        ) : imageUrls[currentIndex] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrls[currentIndex]}
            alt={`카드뉴스 슬라이드 ${currentIndex + 1} (${currentSlide?.type})`}
            className="w-full h-full object-contain"
          />
        ) : null}
      </div>

      {/* 하단 슬라이드 썸네일/페이지네이션 도트 바 */}
      <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
        {normalizedCards.map((slide, idx) => {
          const isCurrent = idx === currentIndex;
          const accentKey = brandCycle[idx % brandCycle.length];
          return (
            <button
              key={`${slide.type}-${idx}`}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer"
              style={{
                backgroundColor: isCurrent ? color[accentKey] : color.paper,
                color:
                  isCurrent && accentKey !== 'yellow' ? color.white : color.ink,
                borderColor: color.ink,
              }}
            >
              {idx + 1}. {slide.type}
            </button>
          );
        })}
      </div>
    </div>
  );
}

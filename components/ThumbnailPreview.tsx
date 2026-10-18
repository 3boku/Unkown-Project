'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { EventPlan, Thumbnail } from '../lib/schema.ts';
import { color } from '../lib/tokens.ts';

export type ThumbnailPlatform = 'EVENTUS' | 'TICKETTACO';

interface PlatformMeta {
  platform: ThumbnailPlatform;
  title: string;
  subtitle: string;
  width: number;
  height: number;
  aspectClass: string;
  badgeColor: string;
  badgeTextColor: string;
}

const PLATFORMS: PlatformMeta[] = [
  {
    platform: 'EVENTUS',
    title: '이벤터스 (Event-us) 썸네일',
    subtitle: '1280 × 720 px · 16:9 와이드',
    width: 1280,
    height: 720,
    aspectClass: 'aspect-16/9',
    badgeColor: color.blue,
    badgeTextColor: color.white,
  },
  {
    platform: 'TICKETTACO',
    title: '티켓타코 (TicketTaco) / OG 썸네일',
    subtitle: '1200 × 630 px · 1.91:1 표준',
    width: 1200,
    height: 630,
    aspectClass: 'aspect-[1200/630]',
    badgeColor: color.green,
    badgeTextColor: color.white,
  },
];

export interface ThumbnailPreviewProps {
  plan: EventPlan;
  thumbnail: Thumbnail;
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

export function ThumbnailPreview({ plan, thumbnail }: ThumbnailPreviewProps) {
  const [imageUrls, setImageUrls] = useState<
    Partial<Record<ThumbnailPlatform, string>>
  >({});
  const [loadingMap, setLoadingMap] = useState<
    Partial<Record<ThumbnailPlatform, boolean>>
  >({});
  const [errorMap, setErrorMap] = useState<
    Partial<Record<ThumbnailPlatform, string>>
  >({});
  const [downloadingMap, setDownloadingMap] = useState<
    Partial<Record<ThumbnailPlatform, boolean>>
  >({});

  const downloadFormRef = useRef<HTMLFormElement | null>(null);
  const downloadInputRef = useRef<HTMLInputElement | null>(null);

  const renderPlatformThumbnail = useCallback(
    async (platform: ThumbnailPlatform) => {
      setLoadingMap((prev) => ({ ...prev, [platform]: true }));
      setErrorMap((prev) => {
        const next = { ...prev };
        delete next[platform];
        return next;
      });

      try {
        const res = await fetch('/api/render/thumbnail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan,
            thumbnail,
            platform,
          }),
        });

        if (!res.ok) {
          throw new Error(`썸네일 렌더링 실패 (HTTP ${res.status})`);
        }

        const buffer = await res.arrayBuffer();
        const dataUrl = arrayBufferToDataUrl(buffer);
        setImageUrls((prev) => ({ ...prev, [platform]: dataUrl }));
      } catch (err) {
        setErrorMap((prev) => ({
          ...prev,
          [platform]:
            err instanceof Error
              ? err.message
              : '썸네일 이미지를 생성하지 못했습니다.',
        }));
      } finally {
        setLoadingMap((prev) => ({ ...prev, [platform]: false }));
      }
    },
    [plan, thumbnail]
  );

  useEffect(() => {
    PLATFORMS.forEach(({ platform }) => {
      void renderPlatformThumbnail(platform);
    });
  }, [renderPlatformThumbnail]);

  const handleDownload = useCallback(
    (meta: PlatformMeta) => {
      const { platform, width, height } = meta;
      if (downloadingMap[platform]) return;

      setDownloadingMap((prev) => ({ ...prev, [platform]: true }));
      const filename = `gdg-thumbnail-${platform.toLowerCase()}-${width}x${height}.png`;

      try {
        if (downloadFormRef.current && downloadInputRef.current) {
          downloadInputRef.current.value = JSON.stringify({
            plan,
            thumbnail,
            platform,
            filename,
          });
          downloadFormRef.current.submit();
          return;
        }

        const dataUrl = imageUrls[platform];
        if (dataUrl) {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } finally {
        setTimeout(() => {
          setDownloadingMap((prev) => ({ ...prev, [platform]: false }));
        }, 600);
      }
    },
    [downloadingMap, imageUrls, plan, thumbnail]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* 서버 Content-Disposition: attachment 다운로드용 hidden form */}
      <form
        ref={downloadFormRef}
        method="POST"
        action="/api/render/thumbnail?download=1"
        className="hidden"
      >
        <input
          ref={downloadInputRef}
          type="hidden"
          name="payload"
          defaultValue=""
        />
      </form>

      {PLATFORMS.map((meta) => {
        const {
          platform,
          title,
          subtitle,
          width,
          height,
          aspectClass,
          badgeColor,
          badgeTextColor,
        } = meta;
        const isLoading = loadingMap[platform];
        const errorMsg = errorMap[platform];
        const imgUrl = imageUrls[platform];
        const isDownloading = downloadingMap[platform];

        return (
          <div
            key={platform}
            className="flex flex-col gap-3 rounded-2xl p-4 border"
            style={{
              backgroundColor: color.paper,
              borderColor: color.ink,
            }}
          >
            {/* 카드 상단: 플랫폼 이름 + 규격 배지 + 개별 다운로드 버튼 */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold border"
                  style={{
                    backgroundColor: badgeColor,
                    color: badgeTextColor,
                    borderColor: color.ink,
                  }}
                >
                  {platform}
                </span>
                <div>
                  <h3 className="text-sm font-bold leading-tight">{title}</h3>
                  <p className="text-xs opacity-60">{subtitle}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDownload(meta)}
                disabled={Boolean(isDownloading)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold border transition disabled:opacity-40 cursor-pointer"
                style={{
                  backgroundColor: color.blue,
                  color: color.white,
                  borderColor: color.ink,
                }}
                aria-label={`${title} PNG 다운로드`}
              >
                {isDownloading
                  ? '다운로드 준비 중...'
                  : `PNG 다운로드 (${width}×${height})`}
              </button>
            </div>

            {/* 썸네일 이미지 프리뷰 영역 */}
            <div
              className={`relative flex items-center justify-center rounded-xl border overflow-hidden w-full ${aspectClass}`}
              style={{
                backgroundColor: color.white,
                borderColor: color.ink,
              }}
            >
              {isLoading && !imgUrl ? (
                <div className="flex flex-col items-center gap-1.5 p-6 text-center">
                  <span className="text-sm font-bold">
                    {title} 렌더링 중...
                  </span>
                  <span className="text-xs opacity-60">
                    Satori + Pretendard OTF ({width}×{height})
                  </span>
                </div>
              ) : errorMsg ? (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <span className="text-sm font-bold" style={{ color: color.red }}>
                    {errorMsg}
                  </span>
                  <button
                    type="button"
                    onClick={() => void renderPlatformThumbnail(platform)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer"
                    style={{
                      backgroundColor: color.white,
                      color: color.ink,
                      borderColor: color.ink,
                    }}
                  >
                    다시 시도
                  </button>
                </div>
              ) : imgUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imgUrl}
                  alt={`${title} (${width}x${height})`}
                  className="w-full h-full object-contain"
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

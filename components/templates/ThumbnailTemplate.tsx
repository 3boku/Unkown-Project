import { ImageResponse } from 'next/og';
import React from 'react';
import { getPretendardFonts } from '../../lib/fonts.ts';
import type { EventPlan, Thumbnail } from '../../lib/schema.ts';
import {
  type BrandColor,
  brandCycle,
  color,
  fitFontSize,
  themes,
} from '../../lib/tokens.ts';
import { GdgLogoLockup } from './CardNewsTemplate.tsx';

export type ThumbnailPlatform = 'EVENTUS' | 'TICKETTACO';

export interface ThumbnailSpec {
  platform: ThumbnailPlatform;
  label: string;
  width: number;
  height: number;
  aspectLabel: string;
}

export const THUMBNAIL_SPECS: Record<ThumbnailPlatform, ThumbnailSpec> = {
  EVENTUS: {
    platform: 'EVENTUS',
    label: '이벤터스 (Event-us)',
    width: 1280,
    height: 720,
    aspectLabel: '1280 × 720 (16:9)',
  },
  TICKETTACO: {
    platform: 'TICKETTACO',
    label: '티켓타코 (TicketTaco)',
    width: 1200,
    height: 630,
    aspectLabel: '1200 × 630 (1.91:1)',
  },
};

export interface ThumbnailTemplateProps {
  plan: EventPlan;
  thumbnail: Thumbnail;
  width: number;
  height: number;
}

function splitTitleIntoTwoLines(rawText: string, maxCharsPerLine = 26): string[] {
  const normalized = rawText.trim();
  if (!normalized) return [''];

  const explicitLines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (explicitLines.length >= 2) {
    const first = explicitLines[0];
    const second = explicitLines.slice(1).join(' ');
    return [
      truncateWithEllipsis(first, maxCharsPerLine),
      truncateWithEllipsis(second, maxCharsPerLine),
    ];
  }

  const single = explicitLines[0];
  if (single.length <= 18) {
    return [single];
  }

  // 공백 기준으로 균형 잡힌 2줄 분리 시도
  const words = single.split(/\s+/);
  if (words.length >= 2) {
    let firstLine = '';
    let splitIdx = 0;
    const targetFirstLine = Math.min(
      maxCharsPerLine,
      Math.max(14, Math.ceil(single.length / 2))
    );

    for (let i = 0; i < words.length; i++) {
      const candidate = firstLine ? `${firstLine} ${words[i]}` : words[i];
      if (candidate.length <= targetFirstLine || i === 0) {
        firstLine = candidate;
        splitIdx = i + 1;
      } else {
        break;
      }
    }

    const secondLine = words.slice(splitIdx).join(' ');
    if (secondLine) {
      return [
        truncateWithEllipsis(firstLine, maxCharsPerLine),
        truncateWithEllipsis(secondLine, maxCharsPerLine),
      ];
    }
  }

  // 공백이 없는 긴 문자열인 경우 글자 수 기준 2줄 분할
  const firstPart = single.slice(0, maxCharsPerLine);
  const secondPart = single.slice(maxCharsPerLine);
  return [firstPart, truncateWithEllipsis(secondPart, maxCharsPerLine)];
}

function truncateWithEllipsis(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, Math.max(1, maxLen - 1)).trimEnd()}…`;
}

/**
 * 우측 테마 키비주얼 그래픽 (SPEC 6.1)
 * 테마(BUILD_WITH_AI / IO_EXTENDED / DEVFEST) 및 accent/emphasis 스타일을 반영합니다.
 */
function ThemeKeyVisual({
  plan,
  thumbnail,
  scale,
}: {
  plan: EventPlan;
  thumbnail: Thumbnail;
  scale: number;
}) {
  const isDark = plan.theme === 'IO_EXTENDED';
  const isDevFest = plan.theme === 'DEVFEST';
  const accent: BrandColor = thumbnail.style.accent;
  const accentColor = color[accent];
  const isBold = thumbnail.style.emphasis === 'bold';

  const cardWidth = Math.round(390 * scale);
  const cardHeight = Math.round(520 * scale);

  const trackCount = plan.schedule.filter((s) => s.highlight).length || 2;
  const speakerCount = plan.speakers.length;
  const badgeItems =
    plan.perks.length > 0
      ? plan.perks.slice(0, 3)
      : ['Hands-on Lab', 'Tech Session', 'Networking'];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: cardWidth,
        height: cardHeight,
      }}
    >
      {/* 배경 장식 도형 (겹치는 기하 요소) */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: Math.round(-18 * scale),
          right: Math.round(-18 * scale),
          width: Math.round(140 * scale),
          height: Math.round(140 * scale),
          borderRadius: isDevFest ? Math.round(28 * scale) : 999,
          backgroundColor: color.yellow,
          borderWidth: 3,
          borderStyle: 'solid',
          borderColor: color.ink,
        }}
      />
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          bottom: Math.round(-16 * scale),
          left: Math.round(-16 * scale),
          width: Math.round(120 * scale),
          height: Math.round(120 * scale),
          borderRadius: Math.round(28 * scale),
          backgroundColor: color.green,
          borderWidth: 3,
          borderStyle: 'solid',
          borderColor: color.ink,
        }}
      />

      {/* 메인 키비주얼 카드 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          backgroundColor: isDark ? color.ink : color.white,
          color: isDark ? color.white : color.ink,
          borderRadius: Math.round(32 * scale),
          borderWidth: 4,
          borderStyle: 'solid',
          borderColor: isDark ? accentColor : color.ink,
          padding: Math.round(28 * scale),
          overflow: 'hidden',
        }}
      >
        {/* 상단: 4색 브랜드 도트 + 테마 라벨 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {brandCycle.map((c, idx) => (
              <div
                key={c}
                style={{
                  display: 'flex',
                  width: Math.round(16 * scale),
                  height: Math.round(16 * scale),
                  borderRadius: 999,
                  backgroundColor: color[c],
                  marginRight: idx < 3 ? Math.round(8 * scale) : 0,
                  borderWidth: 2,
                  borderStyle: 'solid',
                  borderColor: color.ink,
                }}
              />
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              backgroundColor: accentColor,
              color: accent === 'yellow' ? color.ink : color.white,
              borderRadius: 999,
              paddingLeft: Math.round(14 * scale),
              paddingRight: Math.round(14 * scale),
              paddingTop: Math.round(4 * scale),
              paddingBottom: Math.round(4 * scale),
              borderWidth: 2,
              borderStyle: 'solid',
              borderColor: color.ink,
            }}
          >
            <span
              style={{
                fontSize: Math.round(13 * scale),
                fontWeight: 700,
                letterSpacing: -0.2,
              }}
            >
              {plan.theme.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* 중앙: GDG 브래킷 그래픽 & 핵심 테마 타이포 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? color.blue : color.paper,
            color: isDark ? color.white : color.ink,
            borderRadius: Math.round(24 * scale),
            borderWidth: 3,
            borderStyle: 'solid',
            borderColor: color.ink,
            paddingTop: Math.round(24 * scale),
            paddingBottom: Math.round(24 * scale),
            paddingLeft: Math.round(20 * scale),
            paddingRight: Math.round(20 * scale),
            marginTop: Math.round(12 * scale),
            marginBottom: Math.round(12 * scale),
          }}
        >
          <svg
            viewBox="0 0 112 72"
            width={Math.round(96 * scale)}
            height={Math.round(62 * scale)}
            fill="none"
          >
            <path
              d="M42 8L12 30C7 33.6 7 40.4 12 44L42 66"
              stroke={isDark ? color.white : color.blue}
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M42 8L12 30"
              stroke={color.red}
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M70 8L100 30C105 33.6 105 40.4 100 44L70 66"
              stroke={color.green}
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M70 8L100 30"
              stroke={color.yellow}
              strokeWidth="12"
              strokeLinecap="round"
            />
          </svg>

          <span
            style={{
              fontSize: Math.round((isBold ? 30 : 26) * scale),
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: 1.15,
              letterSpacing: -0.8,
              marginTop: Math.round(12 * scale),
            }}
          >
            {plan.theme === 'IO_EXTENDED'
              ? 'I/O EXTENDED'
              : plan.theme === 'DEVFEST'
                ? 'DEVFEST CAMPUS'
                : 'BUILD WITH AI'}
          </span>

          <span
            style={{
              fontSize: Math.round(15 * scale),
              fontWeight: 700,
              color: isDark ? color.yellow : color.blue,
              marginTop: Math.round(6 * scale),
              textAlign: 'center',
            }}
          >
            {truncateWithEllipsis(
              plan.programSummary ||
                `주요 트랙 ${trackCount}개 · 연사 ${speakerCount}명`,
              34
            )}
          </span>
        </div>

        {/* 하단: 키워드/혜택 배지 스트립 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {badgeItems.map((item, idx) => {
              const pillKey = brandCycle[idx % brandCycle.length];
              const isYellow = pillKey === 'yellow';
              return (
                <div
                  key={`${item}-${idx}`}
                  style={{
                    display: 'flex',
                    backgroundColor: color[pillKey],
                    color: isYellow ? color.ink : color.white,
                    borderRadius: 999,
                    paddingLeft: Math.round(14 * scale),
                    paddingRight: Math.round(14 * scale),
                    paddingTop: Math.round(6 * scale),
                    paddingBottom: Math.round(6 * scale),
                    marginRight: Math.round(6 * scale),
                    marginBottom: Math.round(6 * scale),
                    borderWidth: 2,
                    borderStyle: 'solid',
                    borderColor: color.ink,
                  }}
                >
                  <span
                    style={{
                      fontSize: Math.round(13 * scale),
                      fontWeight: 700,
                    }}
                  >
                    {truncateWithEllipsis(item, 18)}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: color.yellow,
              color: color.ink,
              borderRadius: Math.round(14 * scale),
              paddingLeft: Math.round(16 * scale),
              paddingRight: Math.round(16 * scale),
              paddingTop: Math.round(10 * scale),
              paddingBottom: Math.round(10 * scale),
              marginTop: Math.round(6 * scale),
              borderWidth: 2,
              borderStyle: 'solid',
              borderColor: color.ink,
            }}
          >
            <span style={{ fontSize: Math.round(14 * scale), fontWeight: 700 }}>
              {plan.registration.platform} TICKET
            </span>
            <span style={{ fontSize: Math.round(14 * scale), fontWeight: 700 }}>
              {plan.capacity ? `선착순 ${plan.capacity}명` : '참가 신청 오픈'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 티켓팅 썸네일 공용 Satori 템플릿 (SPEC 6.1)
 * - 이벤터스 (1280x720) 및 티켓타코 (1200x630) 공용
 * - 좌측: 연도 + 타이틀(2줄) + hostName, 일시·장소 배지
 * - 우측: 테마 키비주얼
 */
export function ThumbnailTemplate({
  plan,
  thumbnail,
  width,
  height,
}: ThumbnailTemplateProps) {
  const theme = themes[plan.theme] ?? themes.BUILD_WITH_AI;
  const isDark = plan.theme === 'IO_EXTENDED';
  const isLayoutB = thumbnail.style.layout === 'B';
  const accentColor = color[thumbnail.style.accent];

  // 기준 해상도 1280x720 대비 스케일 팩터 (1200x630에서도 비율과 여백이 깨지지 않도록 조정)
  const scale = Math.min(width / 1280, height / 720);

  // 타이틀 원문: thumbnail.headline(줄바꿈 포함 가능) 또는 plan.title 활용
  const displayTitle =
    plan.title.trim().length > thumbnail.headline.replace(/\n/g, ' ').trim().length
      ? plan.title.trim()
      : thumbnail.headline.trim() || plan.title.trim();
  const maxLineChars = displayTitle.length >= 30 ? 26 : 22;
  const titleLines = splitTitleIntoTwoLines(displayTitle, maxLineChars);
  const longestLineLength = Math.max(
    displayTitle.length,
    ...titleLines.map((l) => l.length * 1.4)
  );

  // 30자 이상 긴 제목도 영역 밖으로 넘치지 않도록 단계별 폰트 크기 계산 (SPEC 11절 fitFontSize 활용)
  const rawTitleSize = fitFontSize(
    'x'.repeat(Math.round(longestLineLength)),
    16,
    {
      base: 56,
      medium: 44,
      small: 34,
    }
  );
  const titleFontSize = Math.round(rawTitleSize * scale);

  const sublineText = truncateWithEllipsis(
    thumbnail.subline || plan.hook || plan.description || '',
    48
  );
  const timeRangeText = plan.endTime
    ? `${plan.startTime} ~ ${plan.endTime}`
    : plan.startTime;
  const venueText = truncateWithEllipsis(plan.venue, 28);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        width,
        height,
        backgroundColor: theme.coverBg,
        color: theme.coverText,
        fontFamily: 'Pretendard',
        paddingLeft: Math.round(64 * scale),
        paddingRight: Math.round(64 * scale),
        paddingTop: Math.round(48 * scale),
        paddingBottom: Math.round(48 * scale),
        overflow: 'hidden',
      }}
    >
      {/* 배경 4색 코너 블롭 */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: Math.round(-110 * scale),
          left: Math.round(-90 * scale),
          width: Math.round(300 * scale),
          height: Math.round(300 * scale),
          borderRadius: 999,
          backgroundColor: color.blue,
          opacity: isDark ? 0.35 : 0.85,
        }}
      />
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          bottom: Math.round(-120 * scale),
          right: Math.round(-80 * scale),
          width: Math.round(320 * scale),
          height: Math.round(320 * scale),
          borderRadius: 999,
          backgroundColor: color.red,
          opacity: isDark ? 0.35 : 0.85,
        }}
      />

      {/* IO_EXTENDED 좌측 세로 4색 바 */}
      {isDark ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            left: 0,
            top: 0,
            width: Math.round(18 * scale),
            height,
          }}
        >
          <div style={{ display: 'flex', flex: 1, backgroundColor: color.blue }} />
          <div style={{ display: 'flex', flex: 1, backgroundColor: color.red }} />
          <div style={{ display: 'flex', flex: 1, backgroundColor: color.yellow }} />
          <div style={{ display: 'flex', flex: 1, backgroundColor: color.green }} />
        </div>
      ) : null}

      {/* 좌측 영역: 로고 락업 + 연도 + 타이틀(2줄) + hostName + 일시·장소 배지 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: Math.round(700 * scale),
          height: Math.round(580 * scale),
          backgroundColor: isDark ? color.ink : color.white,
          color: isDark ? color.white : color.ink,
          borderRadius: Math.round(32 * scale),
          borderWidth: 4,
          borderStyle: 'solid',
          borderColor: isDark ? accentColor : color.ink,
          paddingLeft: Math.round(44 * scale),
          paddingRight: Math.round(44 * scale),
          paddingTop: Math.round(36 * scale),
          paddingBottom: Math.round(36 * scale),
          marginRight: Math.round(32 * scale),
          overflow: 'hidden',
        }}
      >
        {/* 상단: GDG 로고 락업 + 연도 배지 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <GdgLogoLockup
            textColor={isDark ? color.white : color.ink}
            scale={0.95 * scale}
          />

          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: color.yellow,
              color: color.ink,
              borderRadius: 999,
              paddingLeft: Math.round(22 * scale),
              paddingRight: Math.round(22 * scale),
              paddingTop: Math.round(6 * scale),
              paddingBottom: Math.round(6 * scale),
              borderWidth: 3,
              borderStyle: 'solid',
              borderColor: color.ink,
            }}
          >
            <span
              style={{
                fontSize: Math.round(22 * scale),
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              {plan.year}
            </span>
          </div>
        </div>

        {/* 중단: 연도 + 타이틀(최대 2줄) + hostName + 훅/서브라인 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            width: '100%',
            marginTop: Math.round(8 * scale),
            marginBottom: Math.round(8 * scale),
          }}
        >
          {/* 강조 컬러 바 + hostName */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: Math.round(12 * scale),
            }}
          >
            <div
              style={{
                display: 'flex',
                width: Math.round(12 * scale),
                height: Math.round(24 * scale),
                borderRadius: 999,
                backgroundColor: accentColor,
                marginRight: Math.round(10 * scale),
              }}
            />
            <span
              style={{
                fontSize: Math.round(22 * scale),
                fontWeight: 700,
                color: isDark ? color.yellow : color.blue,
                letterSpacing: -0.3,
              }}
            >
              {plan.year} · {plan.hostName}
            </span>
          </div>

          {/* 타이틀 (2줄 지원, 30자 이상 자동 축소 및 말줄임 보장) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
            }}
          >
            {titleLines.map((line, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: titleFontSize,
                  fontWeight: 700,
                  color:
                    idx === 1 && isLayoutB
                      ? accentColor
                      : isDark
                        ? color.white
                        : color.ink,
                  lineHeight: 1.18,
                  letterSpacing: -1.2,
                  wordBreak: 'keep-all',
                }}
              >
                {line}
              </span>
            ))}
          </div>

          {/* 서브라인 / Hook 문구 */}
          {sublineText ? (
            <div
              style={{
                display: 'flex',
                backgroundColor: isDark ? color.ink : color.paper,
                borderRadius: Math.round(14 * scale),
                paddingLeft: Math.round(18 * scale),
                paddingRight: Math.round(18 * scale),
                paddingTop: Math.round(10 * scale),
                paddingBottom: Math.round(10 * scale),
                marginTop: Math.round(16 * scale),
                borderWidth: 2,
                borderStyle: 'solid',
                borderColor: isDark ? accentColor : color.ink,
                maxWidth: '100%',
              }}
            >
              <span
                style={{
                  fontSize: Math.round(20 * scale),
                  fontWeight: 700,
                  color: isDark ? color.white : color.ink,
                  lineHeight: 1.3,
                }}
              >
                {sublineText}
              </span>
            </div>
          ) : null}
        </div>

        {/* 하단: 일시·장소 배지 (EventPlan 사실 데이터 직접 참조) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            width: '100%',
            paddingTop: Math.round(16 * scale),
            borderTopWidth: 2,
            borderTopStyle: 'solid',
            borderTopColor: isDark ? accentColor : color.ink,
          }}
        >
          {/* 일시 배지 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: color.blue,
              color: color.white,
              borderRadius: 999,
              paddingLeft: Math.round(20 * scale),
              paddingRight: Math.round(20 * scale),
              paddingTop: Math.round(9 * scale),
              paddingBottom: Math.round(9 * scale),
              marginRight: Math.round(12 * scale),
              borderWidth: 2,
              borderStyle: 'solid',
              borderColor: color.ink,
            }}
          >
            <span
              style={{
                fontSize: Math.round(18 * scale),
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              일시 · {plan.date} ({timeRangeText})
            </span>
          </div>

          {/* 장소 배지 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: color.white,
              color: color.ink,
              borderRadius: 999,
              paddingLeft: Math.round(20 * scale),
              paddingRight: Math.round(20 * scale),
              paddingTop: Math.round(9 * scale),
              paddingBottom: Math.round(9 * scale),
              borderWidth: 2,
              borderStyle: 'solid',
              borderColor: color.ink,
            }}
          >
            <span
              style={{
                fontSize: Math.round(18 * scale),
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              장소 · {venueText}
            </span>
          </div>
        </div>
      </div>

      {/* 우측 영역: 테마 키비주얼 */}
      <ThemeKeyVisual plan={plan} thumbnail={thumbnail} scale={scale} />
    </div>
  );
}

/**
 * EventPlan과 Thumbnail 데이터를 받아 지정된 플랫폼 규격(EVENTUS 1280x720 / TICKETTACO 1200x630)의
 * ImageResponse(PNG)를 생성합니다.
 */
export async function renderThumbnailPng(
  plan: EventPlan,
  thumbnail: Thumbnail,
  options?: {
    platform?: ThumbnailPlatform;
    width?: number;
    height?: number;
  }
): Promise<ImageResponse> {
  const fonts = await getPretendardFonts();
  const platform = options?.platform ?? 'EVENTUS';
  const spec = THUMBNAIL_SPECS[platform] ?? THUMBNAIL_SPECS.EVENTUS;
  const width = options?.width ?? spec.width;
  const height = options?.height ?? spec.height;

  return new ImageResponse(
    (
      <ThumbnailTemplate
        plan={plan}
        thumbnail={thumbnail}
        width={width}
        height={height}
      />
    ),
    {
      width,
      height,
      fonts,
    }
  );
}

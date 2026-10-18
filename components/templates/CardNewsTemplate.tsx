import { ImageResponse } from 'next/og';
import React from 'react';
import { getPretendardFonts } from '../../lib/fonts.ts';
import type {
  CardSlide,
  CoverCardSlideSchema,
  CtaCardSlideSchema,
  DDayCardSlideSchema,
  EventPlan,
  IntroCardSlideSchema,
  SpeakersCardSlideSchema,
  SpecialEventCardSlideSchema,
  TimetableCardSlideSchema,
} from '../../lib/schema.ts';
import { resolvePlanSpeakerPhotos } from '../../lib/speaker-photo.ts';
import {
  type BrandColor,
  brandCycle,
  color,
  fitFontSize,
  themes,
} from '../../lib/tokens.ts';
import type { z } from 'zod';

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

export interface CardSlideTemplateProps {
  plan: EventPlan;
  slide: CardSlide;
  slideIndex?: number;
  totalSlides?: number;
}

/**
 * GDG 락업 컴포넌트 (Satori 호환: 브래킷은 SVG path, 텍스트는 Flex div로 렌더링)
 */
export function GdgLogoLockup({
  textColor = color.ink,
  scale = 1,
}: {
  textColor?: string;
  scale?: number;
}) {
  const markWidth = Math.round(56 * scale);
  const markHeight = Math.round(40 * scale);
  const titleSize = Math.round(18 * scale);
  const subSize = Math.round(14 * scale);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <svg
        viewBox="0 0 56 40"
        width={markWidth}
        height={markHeight}
        fill="none"
        style={{ marginRight: Math.round(12 * scale) }}
      >
        <path
          d="M22 4L6 16C3.5 17.8 3.5 21.5 6 23.3L22 35"
          stroke={color.blue}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M22 4L6 16"
          stroke={color.red}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M34 4L50 16C52.5 17.8 52.5 21.5 50 23.3L34 35"
          stroke={color.green}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M34 4L50 16"
          stroke={color.yellow}
          strokeWidth="7"
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: textColor,
            fontSize: titleSize,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: -0.3,
          }}
        >
          Google Developer Groups
        </span>
        <span
          style={{
            color: textColor,
            opacity: 0.6,
            fontSize: subSize,
            fontWeight: 400,
            lineHeight: 1.2,
            marginTop: 2,
          }}
        >
          Campus Korea
        </span>
      </div>
    </div>
  );
}

/**
 * 섹션 제목 강조 ①: 노란 알약 라벨 (yellow 배경, ink 글자)
 */
export function YellowPillLabel({
  text,
  size = 'md',
}: {
  text: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const fontSize = size === 'lg' ? 28 : size === 'md' ? 24 : 20;
  const padX = size === 'lg' ? 32 : size === 'md' ? 26 : 20;
  const padY = size === 'lg' ? 12 : size === 'md' ? 10 : 8;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: color.yellow,
        color: color.ink,
        borderRadius: 999,
        paddingLeft: padX,
        paddingRight: padX,
        paddingTop: padY,
        paddingBottom: padY,
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: color.ink,
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: -0.4,
        }}
      >
        {text}
      </span>
    </div>
  );
}

/**
 * 섹션 제목 강조 ②: 단어 하이라이트 (제목 첫 단어 밑에 accent 색 형광펜 띠)
 */
export function WordHighlightHeading({
  title,
  accent,
  textColor = color.ink,
}: {
  title: string;
  accent: BrandColor;
  textColor?: string;
}) {
  const trimmed = title.trim();
  const spaceIdx = trimmed.indexOf(' ');
  const firstWord = spaceIdx > 0 ? trimmed.slice(0, spaceIdx) : trimmed;
  const restWords = spaceIdx > 0 ? trimmed.slice(spaceIdx + 1) : '';
  const accentColor = color[accent];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginRight: restWords ? 14 : 0,
        }}
      >
        <span
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: textColor,
            lineHeight: 1.1,
            letterSpacing: -0.8,
          }}
        >
          {firstWord}
        </span>
        <div
          style={{
            display: 'flex',
            height: 12,
            backgroundColor: accentColor,
            borderRadius: 6,
            marginTop: -6,
            width: '100%',
          }}
        />
      </div>
      {restWords ? (
        <span
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: textColor,
            lineHeight: 1.1,
            letterSpacing: -0.8,
            paddingBottom: 6,
          }}
        >
          {restWords}
        </span>
      ) : null}
    </div>
  );
}

/**
 * 네 가장자리 4색 블롭 장식 (SPEC 6.2 공통 프레임)
 */
function CornerBlobs({ opacity = 0.9 }: { opacity?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        top: 0,
        left: 0,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        overflow: 'hidden',
      }}
    >
      {/* 좌상단 Blue 블롭 */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: -90,
          left: -80,
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: color.blue,
          opacity,
        }}
      />
      {/* 우상단 Red 블롭 */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: -70,
          right: -90,
          width: 260,
          height: 260,
          borderRadius: 64,
          backgroundColor: color.red,
          opacity,
        }}
      />
      {/* 좌하단 Yellow 블롭 */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          bottom: -80,
          left: -70,
          width: 260,
          height: 260,
          borderRadius: 56,
          backgroundColor: color.yellow,
          opacity,
        }}
      />
      {/* 우하단 Green 블롭 */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          bottom: -95,
          right: -75,
          width: 290,
          height: 290,
          borderRadius: 145,
          backgroundColor: color.green,
          opacity,
        }}
      />
    </div>
  );
}

/**
 * 공통 프레임 (COVER, D_DAY 제외 모든 내부 슬라이드) — SPEC 6.2
 */
export function CardFrame({
  plan,
  slideIndex,
  totalSlides,
  children,
}: {
  plan: EventPlan;
  slideIndex?: number;
  totalSlides?: number;
  children: React.ReactNode;
}) {
  const theme = themes[plan.theme] ?? themes.BUILD_WITH_AI;
  const isDarkTheme = plan.theme === 'IO_EXTENDED';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: theme.slideBg,
        fontFamily: 'Pretendard',
        padding: 44,
        overflow: 'hidden',
      }}
    >
      <CornerBlobs opacity={isDarkTheme ? 0.75 : 0.92} />

      {isDarkTheme ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            left: 0,
            top: 220,
            width: 14,
            height: 910,
          }}
        >
          <div style={{ display: 'flex', flex: 1, backgroundColor: color.blue }} />
          <div style={{ display: 'flex', flex: 1, backgroundColor: color.red }} />
          <div style={{ display: 'flex', flex: 1, backgroundColor: color.yellow }} />
          <div style={{ display: 'flex', flex: 1, backgroundColor: color.green }} />
        </div>
      ) : null}

      {/* 가운데 큰 흰색(또는 테마 패널색) 라운드 패널 (radius 32px) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          width: '100%',
          backgroundColor: theme.panelBg,
          color: theme.panelText,
          borderRadius: 32,
          borderWidth: 3,
          borderStyle: 'solid',
          borderColor: isDarkTheme ? color.blue : color.ink,
          paddingLeft: 52,
          paddingRight: 52,
          paddingTop: 42,
          paddingBottom: 42,
          justifyContent: 'space-between',
        }}
      >
        {/* 패널 상단 헤더: 좌상단 로고 락업 + 중앙 작은 타이틀 블록 3줄 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            width: '100%',
            paddingBottom: 24,
            borderBottomWidth: 2,
            borderBottomStyle: 'solid',
            borderBottomColor: isDarkTheme ? color.blue : color.ink,
          }}
        >
          <div style={{ display: 'flex', width: 290 }}>
            <GdgLogoLockup textColor={theme.panelText} scale={0.9} />
          </div>

          {/* 상단 가운데: 작은 타이틀 블록 3줄 (year / title / hostName) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              paddingLeft: 12,
              paddingRight: 12,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: color.blue,
                lineHeight: 1.2,
              }}
            >
              {plan.year}
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: theme.panelText,
                lineHeight: 1.25,
                textAlign: 'center',
                marginTop: 2,
              }}
            >
              {plan.title}
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: theme.panelText,
                opacity: 0.6,
                lineHeight: 1.2,
                marginTop: 2,
              }}
            >
              {plan.hostName}
            </span>
          </div>

          {/* 우상단 슬라이드 번호 배지 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
              width: 290,
            }}
          >
            {typeof slideIndex === 'number' && typeof totalSlides === 'number' ? (
              <div
                style={{
                  display: 'flex',
                  backgroundColor: isDarkTheme ? color.blue : color.paper,
                  color: isDarkTheme ? color.white : color.ink,
                  borderRadius: 999,
                  paddingLeft: 18,
                  paddingRight: 18,
                  paddingTop: 6,
                  paddingBottom: 6,
                  borderWidth: 2,
                  borderStyle: 'solid',
                  borderColor: color.ink,
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 700 }}>
                  {slideIndex + 1} / {totalSlides}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* 슬라이드 본문 영역 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            width: '100%',
            paddingTop: 28,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * 1. COVER 슬라이드 (SPEC 6.2)
 * 전면 키비주얼. 상단 가운데 year / title(굵게 2줄) / hostName. 테마별 큰 타이포 그래픽
 */
export function CardCover({
  plan,
  slide,
  dDayBadge,
}: {
  plan: EventPlan;
  slide: z.infer<typeof CoverCardSlideSchema>;
  dDayBadge?: string;
}) {
  const theme = themes[plan.theme] ?? themes.BUILD_WITH_AI;
  const isDark = plan.theme === 'IO_EXTENDED';
  const isDevFest = plan.theme === 'DEVFEST';
  const accentColor = color[slide.style.accent];
  const titleFontSize = fitFontSize(plan.title, 18, {
    base: 68,
    medium: 54,
    small: 42,
  });
  const headlineLines = (slide.headline || plan.title).split('\n');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: theme.coverBg,
        color: theme.coverText,
        fontFamily: 'Pretendard',
        padding: 64,
        overflow: 'hidden',
      }}
    >
      <CornerBlobs opacity={isDark ? 0.85 : 0.95} />

      {/* IO_EXTENDED 좌측 세로 4색 컬러 바 */}
      {isDark ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            left: 0,
            top: 0,
            width: 24,
            height: CARD_HEIGHT,
          }}
        >
          <div style={{ display: 'flex', flex: 1, backgroundColor: color.blue }} />
          <div style={{ display: 'flex', flex: 1, backgroundColor: color.red }} />
          <div style={{ display: 'flex', flex: 1, backgroundColor: color.yellow }} />
          <div style={{ display: 'flex', flex: 1, backgroundColor: color.green }} />
        </div>
      ) : null}

      {/* 상단 가운데: year / title (굵게 2줄) / hostName */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          marginTop: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            backgroundColor: color.yellow,
            color: color.ink,
            borderRadius: 999,
            paddingLeft: 28,
            paddingRight: 28,
            paddingTop: 8,
            paddingBottom: 8,
            borderWidth: 3,
            borderStyle: 'solid',
            borderColor: color.ink,
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 28, fontWeight: 700 }}>{plan.year}</span>
        </div>

        <span
          style={{
            fontSize: titleFontSize,
            fontWeight: 700,
            color: theme.coverText,
            textAlign: 'center',
            lineHeight: 1.15,
            letterSpacing: -1.5,
            maxWidth: 900,
          }}
        >
          {plan.title}
        </span>

        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: isDark ? color.yellow : color.blue,
            marginTop: 16,
            letterSpacing: -0.4,
          }}
        >
          {plan.hostName}
        </span>
      </div>

      {/* 중앙 테마별 큰 타이포 그래픽 또는 D-DAY 배지 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          marginTop: 16,
          marginBottom: 16,
        }}
      >
        {dDayBadge ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: color.white,
              borderRadius: 48,
              borderWidth: 5,
              borderStyle: 'solid',
              borderColor: color.ink,
              paddingLeft: 88,
              paddingRight: 88,
              paddingTop: 52,
              paddingBottom: 52,
            }}
          >
            <span
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: color.blue,
                marginBottom: 8,
              }}
            >
              COMING SOON
            </span>
            <span
              style={{
                fontSize: 168,
                fontWeight: 700,
                color: color.ink,
                lineHeight: 1.0,
                letterSpacing: -4,
              }}
            >
              {dDayBadge}
            </span>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDark ? color.ink : color.white,
              borderRadius: 40,
              borderWidth: 4,
              borderStyle: 'solid',
              borderColor: isDark ? accentColor : color.ink,
              paddingLeft: 56,
              paddingRight: 56,
              paddingTop: 48,
              paddingBottom: 48,
              width: '100%',
            }}
          >
            {/* 4색 도형 스트립 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 28,
              }}
            >
              {brandCycle.map((c, idx) => (
                <div
                  key={c}
                  style={{
                    display: 'flex',
                    width: isDevFest ? 56 : 36,
                    height: 18,
                    borderRadius: 999,
                    backgroundColor: color[c],
                    marginRight: idx < 3 ? 12 : 0,
                    borderWidth: 2,
                    borderStyle: 'solid',
                    borderColor: color.ink,
                  }}
                />
              ))}
            </div>

            {headlineLines.map((line, i) => (
              <span
                key={i}
                style={{
                  fontSize: fitFontSize(line, 16, {
                    base: 64,
                    medium: 50,
                    small: 38,
                  }),
                  fontWeight: 700,
                  color:
                    i === 0
                      ? isDark
                        ? color.white
                        : color.ink
                      : accentColor,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  letterSpacing: -1.2,
                }}
              >
                {line}
              </span>
            ))}

            {plan.hook ? (
              <div
                style={{
                  display: 'flex',
                  backgroundColor: color.yellow,
                  color: color.ink,
                  borderRadius: 16,
                  paddingLeft: 28,
                  paddingRight: 28,
                  paddingTop: 12,
                  paddingBottom: 12,
                  marginTop: 28,
                  borderWidth: 2,
                  borderStyle: 'solid',
                  borderColor: color.ink,
                }}
              >
                <span style={{ fontSize: 26, fontWeight: 700 }}>
                  {plan.hook}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 하단: 일시·장소 배지 + GDG 로고 락업 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? color.blue : color.white,
            color: isDark ? color.white : color.ink,
            borderRadius: 999,
            borderWidth: 3,
            borderStyle: 'solid',
            borderColor: color.ink,
            paddingLeft: 36,
            paddingRight: 36,
            paddingTop: 16,
            paddingBottom: 16,
            marginBottom: 28,
          }}
        >
          <span style={{ fontSize: 26, fontWeight: 700, marginRight: 20 }}>
            {plan.date} {plan.startTime}
            {plan.endTime ? ` ~ ${plan.endTime}` : ''}
          </span>
          <span
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: isDark ? color.yellow : color.blue,
            }}
          >
            | {plan.venue}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            backgroundColor: isDark ? color.ink : color.white,
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 12,
            paddingBottom: 12,
            borderRadius: 999,
          }}
        >
          <GdgLogoLockup textColor={theme.coverText} scale={1.0} />
        </div>
      </div>
    </div>
  );
}

/**
 * 2. INTRO 슬라이드 (SPEC 6.2)
 * 상단 훅 박스(테두리 라운드 박스: 굵은 hookTitle + 2줄 hookBody) → 노란 알약 라벨 섹션 3개
 */
export function CardIntro({
  plan,
  slide,
  slideIndex,
  totalSlides,
}: {
  plan: EventPlan;
  slide: z.infer<typeof IntroCardSlideSchema>;
  slideIndex?: number;
  totalSlides?: number;
}) {
  const theme = themes[plan.theme] ?? themes.BUILD_WITH_AI;
  const isDark = plan.theme === 'IO_EXTENDED';
  const accentColor = color[slide.style.accent];
  const sections =
    slide.sections.length > 0
      ? slide.sections.slice(0, 3)
      : [
          {
            label: '행사 구성',
            body: plan.programSummary || plan.description,
          },
          {
            label: '이런 사람들에게 추천해요',
            body: plan.targetAudience || 'AI와 개발에 관심 있는 누구나',
          },
          {
            label: '진행 장소 및 시간',
            body: `${plan.date} (${plan.startTime}${plan.endTime ? ` ~ ${plan.endTime}` : ''}) · ${plan.venue}`,
          },
        ];

  return (
    <CardFrame plan={plan} slideIndex={slideIndex} totalSlides={totalSlides}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
          width: '100%',
        }}
      >
        {/* 상단 훅 박스 (테두리 라운드 박스: 굵은 hookTitle + 2줄 hookBody) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            backgroundColor: isDark ? color.ink : color.paper,
            borderRadius: 24,
            borderWidth: 3,
            borderStyle: 'solid',
            borderColor: accentColor,
            paddingLeft: 36,
            paddingRight: 36,
            paddingTop: 32,
            paddingBottom: 32,
          }}
        >
          <span
            style={{
              fontSize: fitFontSize(slide.hookTitle || plan.hook, 20, {
                base: 40,
                medium: 34,
                small: 28,
              }),
              fontWeight: 700,
              color: isDark ? color.yellow : accentColor,
              lineHeight: 1.25,
              marginBottom: 14,
            }}
          >
            {slide.hookTitle || plan.hook}
          </span>
          <span
            style={{
              fontSize: 25,
              fontWeight: 400,
              color: theme.panelText,
              lineHeight: 1.45,
            }}
          >
            {slide.hookBody || plan.description}
          </span>
        </div>

        {/* 노란 알약 라벨 섹션 3개 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            flex: 1,
            width: '100%',
            marginTop: 28,
          }}
        >
          {sections.map((sec, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                backgroundColor: isDark ? color.ink : color.white,
                borderRadius: 20,
                borderWidth: 2,
                borderStyle: 'solid',
                borderColor: color.ink,
                paddingLeft: 28,
                paddingRight: 28,
                paddingTop: 22,
                paddingBottom: 22,
              }}
            >
              <YellowPillLabel text={sec.label} size="sm" />
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: theme.panelText,
                  lineHeight: 1.4,
                  marginTop: 14,
                }}
              >
                {sec.body}
              </span>
            </div>
          ))}
        </div>
      </div>
    </CardFrame>
  );
}

/**
 * 3. TIMETABLE 슬라이드 (SPEC 6.2)
 * 노란 알약 "Time Table" → 테두리 라운드 표. 행 = 시간(2줄) │ 제목 │ 비고.
 * highlight 행은 시간·제목이 blue, 구분선도 blue. 최대 10행까지 겹침 없이 들어감.
 */
export function CardTimetable({
  plan,
  slide,
  slideIndex,
  totalSlides,
}: {
  plan: EventPlan;
  slide: z.infer<typeof TimetableCardSlideSchema>;
  slideIndex?: number;
  totalSlides?: number;
}) {
  const theme = themes[plan.theme] ?? themes.BUILD_WITH_AI;
  const isDark = plan.theme === 'IO_EXTENDED';
  const rows = plan.schedule.slice(0, 10);
  const count = rows.length;

  // 행 개수에 따라 패딩·글자 크기를 조절하여 10행까지 겹침 없이 배치 (BK-05 AC2)
  const isCompact = count >= 8;
  const isMedium = count >= 6 && count < 8;
  const rowPadY = isCompact ? 11 : isMedium ? 16 : 22;
  const timeFontSize = isCompact ? 18 : isMedium ? 20 : 22;
  const titleFontSize = isCompact ? 21 : isMedium ? 24 : 26;
  const noteFontSize = isCompact ? 16 : isMedium ? 18 : 20;

  return (
    <CardFrame plan={plan} slideIndex={slideIndex} totalSlides={totalSlides}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <YellowPillLabel text={slide.title || 'Time Table'} size="lg" />
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: theme.panelText,
              opacity: 0.6,
            }}
          >
            {plan.date} · {plan.venue}
          </span>
        </div>

        {/* 테두리 라운드 표 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            width: '100%',
            borderRadius: 24,
            borderWidth: 3,
            borderStyle: 'solid',
            borderColor: isDark ? color.blue : color.ink,
            overflow: 'hidden',
            backgroundColor: isDark ? color.ink : color.white,
          }}
        >
          {rows.map((item, idx) => {
            const isHighlighted = item.highlight;
            const rowTextColor = isHighlighted ? color.blue : theme.panelText;
            const dividerColor = isHighlighted
              ? color.blue
              : isDark
                ? color.white
                : color.ink;

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  width: '100%',
                  paddingTop: rowPadY,
                  paddingBottom: rowPadY,
                  paddingLeft: 28,
                  paddingRight: 28,
                  backgroundColor: isHighlighted
                    ? isDark
                      ? color.ink
                      : color.paper
                    : isDark
                      ? color.ink
                      : color.white,
                  borderBottomWidth: idx < count - 1 ? 2 : 0,
                  borderBottomStyle: 'solid',
                  borderBottomColor: dividerColor,
                }}
              >
                {/* 시간 (2줄) */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: 130,
                    paddingRight: 16,
                  }}
                >
                  <span
                    style={{
                      fontSize: timeFontSize,
                      fontWeight: 700,
                      color: rowTextColor,
                      lineHeight: 1.15,
                    }}
                  >
                    {item.start}
                  </span>
                  <span
                    style={{
                      fontSize: timeFontSize - 2,
                      fontWeight: isHighlighted ? 700 : 400,
                      color: rowTextColor,
                      opacity: isHighlighted ? 0.9 : 0.6,
                      lineHeight: 1.15,
                      marginTop: 2,
                    }}
                  >
                    ~ {item.end}
                  </span>
                </div>

                {/* 세로 구분선 */}
                <div
                  style={{
                    display: 'flex',
                    width: 3,
                    height: isCompact ? 38 : 48,
                    backgroundColor: dividerColor,
                    opacity: isHighlighted ? 1 : 0.25,
                    marginRight: 22,
                    borderRadius: 2,
                  }}
                />

                {/* 제목 */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    paddingRight: 16,
                  }}
                >
                  <span
                    style={{
                      fontSize: titleFontSize,
                      fontWeight: 700,
                      color: rowTextColor,
                      lineHeight: 1.2,
                    }}
                  >
                    {item.title}
                  </span>
                </div>

                {/* 비고 (note) */}
                {item.note ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
                      maxWidth: 260,
                    }}
                  >
                    <span
                      style={{
                        fontSize: noteFontSize,
                        fontWeight: isHighlighted ? 700 : 400,
                        color: isHighlighted ? color.blue : theme.panelText,
                        opacity: isHighlighted ? 0.95 : 0.6,
                        textAlign: 'right',
                        lineHeight: 1.2,
                      }}
                    >
                      {item.note}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </CardFrame>
  );
}

/**
 * 4. SPEAKERS 슬라이드 (SPEC 6.2)
 * 단어 하이라이트 제목 → 연사 최대 3명 세로 배치.
 * 원형 사진(좌, 없거나 실패 시 이니셜 원형) + 이름(굵게) + 소속(작게, 60% 투명도) + 구분선 + 세션 제목(굵게) + 요약 2~3줄
 */
export function CardSpeakers({
  plan,
  slide,
  slideIndex,
  totalSlides,
}: {
  plan: EventPlan;
  slide: z.infer<typeof SpeakersCardSlideSchema>;
  slideIndex?: number;
  totalSlides?: number;
}) {
  const theme = themes[plan.theme] ?? themes.BUILD_WITH_AI;
  const isDark = plan.theme === 'IO_EXTENDED';
  const accentColor = color[slide.style.accent];

  // EventPlan.speakers에서 인덱스 참조 (최대 3명 보장)
  const indexedSpeakers = slide.speakerIndexes
    .map((idx) => plan.speakers[idx])
    .filter((sp): sp is NonNullable<typeof sp> => Boolean(sp));

  const speakersToRender = (
    indexedSpeakers.length > 0
      ? indexedSpeakers
      : plan.speakers.filter((sp) => sp.kind === slide.kind)
  ).slice(0, 3);

  return (
    <CardFrame plan={plan} slideIndex={slideIndex} totalSlides={totalSlides}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          width: '100%',
        }}
      >
        {/* 상단 단어 하이라이트 제목 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <WordHighlightHeading
            title={
              slide.title ||
              (slide.kind === 'HANDS_ON'
                ? 'Hands-on Speakers'
                : 'Session Speakers')
            }
            accent={slide.style.accent}
            textColor={theme.panelText}
          />
          <YellowPillLabel
            text={slide.kind === 'HANDS_ON' ? 'HANDS-ON' : 'SESSION'}
            size="sm"
          />
        </div>

        {/* 연사 최대 3명 세로 배치 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            flex: 1,
            width: '100%',
          }}
        >
          {speakersToRender.map((speaker, idx) => {
            const avatarColor = color[brandCycle[idx % brandCycle.length]];
            const initial = speaker.name.trim().charAt(0).toUpperCase() || 'G';

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  width: '100%',
                  backgroundColor: isDark ? color.ink : color.paper,
                  borderRadius: 24,
                  borderWidth: 2,
                  borderStyle: 'solid',
                  borderColor: isDark ? accentColor : color.ink,
                  paddingLeft: 28,
                  paddingRight: 28,
                  paddingTop: 24,
                  paddingBottom: 24,
                  marginBottom: idx < speakersToRender.length - 1 ? 20 : 0,
                }}
              >
                {/* 좌측 원형 사진 또는 이니셜 원형 아바타 */}
                {speaker.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={speaker.photoUrl}
                    alt={speaker.name}
                    width={116}
                    height={116}
                    style={{
                      width: 116,
                      height: 116,
                      borderRadius: 58,
                      objectFit: 'cover',
                      marginRight: 28,
                      borderWidth: 3,
                      borderStyle: 'solid',
                      borderColor: avatarColor,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 116,
                      height: 116,
                      borderRadius: 58,
                      backgroundColor: avatarColor,
                      color: color.white,
                      marginRight: 28,
                      borderWidth: 3,
                      borderStyle: 'solid',
                      borderColor: color.ink,
                    }}
                  >
                    <span style={{ fontSize: 48, fontWeight: 700 }}>
                      {initial}
                    </span>
                  </div>
                )}

                {/* 우측 정보 영역: 이름(굵게) + 소속(작게, 60% 투명도) + 구분선 + 세션 제목(굵게) + 요약 2~3줄 */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'baseline',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: theme.panelText,
                        marginRight: 12,
                      }}
                    >
                      {speaker.name}
                    </span>
                    <span
                      style={{
                        fontSize: 19,
                        fontWeight: 400,
                        color: theme.panelText,
                        opacity: 0.6,
                      }}
                    >
                      {speaker.affiliation}
                    </span>
                  </div>

                  {/* 구분선 */}
                  <div
                    style={{
                      display: 'flex',
                      width: '100%',
                      height: 2,
                      backgroundColor: theme.panelText,
                      opacity: 0.2,
                      marginTop: 10,
                      marginBottom: 10,
                    }}
                  />

                  {/* 세션 제목 (굵게) */}
                  <span
                    style={{
                      fontSize: 23,
                      fontWeight: 700,
                      color: isDark ? color.yellow : accentColor,
                      lineHeight: 1.3,
                      marginBottom: 6,
                    }}
                  >
                    {speaker.sessionTitle}
                  </span>

                  {/* 요약 2~3줄 */}
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 400,
                      color: theme.panelText,
                      opacity: 0.85,
                      lineHeight: 1.4,
                    }}
                  >
                    {speaker.summary}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </CardFrame>
  );
}

/**
 * 5. SPECIAL_EVENT 슬라이드 (SPEC 6.2)
 * 노란 알약 라벨 → 이벤트 카드 목록
 */
export function CardSpecialEvent({
  plan,
  slide,
  slideIndex,
  totalSlides,
}: {
  plan: EventPlan;
  slide: z.infer<typeof SpecialEventCardSlideSchema>;
  slideIndex?: number;
  totalSlides?: number;
}) {
  const theme = themes[plan.theme] ?? themes.BUILD_WITH_AI;
  const isDark = plan.theme === 'IO_EXTENDED';

  return (
    <CardFrame plan={plan} slideIndex={slideIndex} totalSlides={totalSlides}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', marginBottom: 28 }}>
          <YellowPillLabel text={slide.title || 'Special Events'} size="lg" />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            flex: 1,
            width: '100%',
          }}
        >
          {plan.specialEvents.map((ev, idx) => {
            const badgeColor = color[brandCycle[idx % brandCycle.length]];
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  width: '100%',
                  backgroundColor: isDark ? color.ink : color.paper,
                  borderRadius: 24,
                  borderWidth: 3,
                  borderStyle: 'solid',
                  borderColor: color.ink,
                  padding: 32,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: badgeColor,
                    color: color.white,
                    marginRight: 24,
                    borderWidth: 2,
                    borderStyle: 'solid',
                    borderColor: color.ink,
                  }}
                >
                  <span style={{ fontSize: 28, fontWeight: 700 }}>
                    0{idx + 1}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      fontSize: 30,
                      fontWeight: 700,
                      color: theme.panelText,
                      marginBottom: 10,
                    }}
                  >
                    {ev.title}
                  </span>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 400,
                      color: theme.panelText,
                      opacity: 0.85,
                      lineHeight: 1.45,
                    }}
                  >
                    {ev.desc}
                  </span>
                </div>
              </div>
            );
          })}

          {plan.perks.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                backgroundColor: color.yellow,
                color: color.ink,
                borderRadius: 24,
                borderWidth: 3,
                borderStyle: 'solid',
                borderColor: color.ink,
                padding: 28,
                marginTop: 'auto',
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                참가자 전원 혜택 (Perks)
              </span>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                }}
              >
                {plan.perks.map((perk, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      backgroundColor: color.white,
                      color: color.ink,
                      borderRadius: 999,
                      paddingLeft: 20,
                      paddingRight: 20,
                      paddingTop: 8,
                      paddingBottom: 8,
                      marginRight: 12,
                      marginBottom: 8,
                      borderWidth: 2,
                      borderStyle: 'solid',
                      borderColor: color.ink,
                    }}
                  >
                    <span style={{ fontSize: 20, fontWeight: 700 }}>
                      {perk}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </CardFrame>
  );
}

/**
 * 6. CTA 슬라이드 (SPEC 6.2)
 * 신청 방법, 마감일, "프로필 링크에서 신청" 안내
 */
export function CardCta({
  plan,
  slide,
  slideIndex,
  totalSlides,
}: {
  plan: EventPlan;
  slide: z.infer<typeof CtaCardSlideSchema>;
  slideIndex?: number;
  totalSlides?: number;
}) {
  const theme = themes[plan.theme] ?? themes.BUILD_WITH_AI;
  const isDark = plan.theme === 'IO_EXTENDED';
  const accentColor = color[slide.style.accent];

  return (
    <CardFrame plan={plan} slideIndex={slideIndex} totalSlides={totalSlides}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          flex: 1,
          width: '100%',
          paddingTop: 20,
          paddingBottom: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <YellowPillLabel text=" 참가 신청 안내 " size="lg" />

          <span
            style={{
              fontSize: fitFontSize(slide.headline, 18, {
                base: 52,
                medium: 44,
                small: 36,
              }),
              fontWeight: 700,
              color: theme.panelText,
              textAlign: 'center',
              lineHeight: 1.25,
              marginTop: 28,
              marginBottom: 16,
            }}
          >
            {slide.headline}
          </span>

          <span
            style={{
              fontSize: 26,
              fontWeight: 400,
              color: theme.panelText,
              opacity: 0.85,
              textAlign: 'center',
              lineHeight: 1.45,
              maxWidth: 780,
            }}
          >
            {slide.body}
          </span>
        </div>

        {/* 행사 핵심 요약 카드 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            backgroundColor: isDark ? color.ink : color.paper,
            borderRadius: 28,
            borderWidth: 3,
            borderStyle: 'solid',
            borderColor: color.ink,
            padding: 36,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: theme.panelText,
                opacity: 0.6,
              }}
            >
              일시
            </span>
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: theme.panelText,
              }}
            >
              {plan.date} ({plan.startTime}
              {plan.endTime ? ` ~ ${plan.endTime}` : ''})
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: theme.panelText,
                opacity: 0.6,
              }}
            >
              장소
            </span>
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: theme.panelText,
              }}
            >
              {plan.venue}
            </span>
          </div>

          {plan.registration.deadline ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: theme.panelText,
                  opacity: 0.6,
                }}
              >
                신청 마감
              </span>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: color.red,
                }}
              >
                {plan.registration.deadline} 까지
              </span>
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: theme.panelText,
                opacity: 0.6,
              }}
            >
              신청 플랫폼
            </span>
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: color.blue,
              }}
            >
              {plan.registration.platform}
              {plan.capacity ? ` (정원 ${plan.capacity}명)` : ''}
            </span>
          </div>
        </div>

        {/* 하단 "프로필 링크에서 신청" 대형 CTA 버튼 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            backgroundColor: accentColor,
            color: slide.style.accent === 'yellow' ? color.ink : color.white,
            borderRadius: 999,
            borderWidth: 4,
            borderStyle: 'solid',
            borderColor: color.ink,
            paddingTop: 28,
            paddingBottom: 28,
          }}
        >
          <span
            style={{
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: -0.6,
            }}
          >
            프로필 링크에서 신청하기 →
          </span>
        </div>
      </div>
    </CardFrame>
  );
}

/**
 * 7. D_DAY 슬라이드 (SPEC 6.2)
 * 표지 테마 그대로 + 화면 중앙 초대형 "D-5"
 */
export function CardDDay({
  plan,
  slide,
}: {
  plan: EventPlan;
  slide: z.infer<typeof DDayCardSlideSchema>;
}) {
  const badgeText =
    slide.daysLeft <= 0 ? 'D-DAY' : `D-${Math.abs(slide.daysLeft)}`;
  return (
    <CardCover
      plan={plan}
      slide={{
        type: 'COVER',
        headline: plan.title,
        style: slide.style,
      }}
      dDayBadge={badgeText}
    />
  );
}

/**
 * 슬라이드 타입별 디스패처 컴포넌트
 */
export function CardSlideTemplate({
  plan,
  slide,
  slideIndex,
  totalSlides,
}: CardSlideTemplateProps) {
  switch (slide.type) {
    case 'COVER':
      return <CardCover plan={plan} slide={slide} />;
    case 'INTRO':
      return (
        <CardIntro
          plan={plan}
          slide={slide}
          slideIndex={slideIndex}
          totalSlides={totalSlides}
        />
      );
    case 'TIMETABLE':
      return (
        <CardTimetable
          plan={plan}
          slide={slide}
          slideIndex={slideIndex}
          totalSlides={totalSlides}
        />
      );
    case 'SPEAKERS':
      return (
        <CardSpeakers
          plan={plan}
          slide={slide}
          slideIndex={slideIndex}
          totalSlides={totalSlides}
        />
      );
    case 'SPECIAL_EVENT':
      return (
        <CardSpecialEvent
          plan={plan}
          slide={slide}
          slideIndex={slideIndex}
          totalSlides={totalSlides}
        />
      );
    case 'CTA':
      return (
        <CardCta
          plan={plan}
          slide={slide}
          slideIndex={slideIndex}
          totalSlides={totalSlides}
        />
      );
    case 'D_DAY':
      return <CardDDay plan={plan} slide={slide} />;
  }
}

/**
 * 카드뉴스 단일 슬라이드를 1080x1350 PNG ImageResponse로 렌더링합니다. (SPEC 6.2, BK-05)
 */
export async function renderCardSlidePng(
  plan: EventPlan,
  slide: CardSlide,
  options?: { slideIndex?: number; totalSlides?: number }
): Promise<ImageResponse> {
  const [fonts, safePlan] = await Promise.all([
    getPretendardFonts(),
    slide.type === 'SPEAKERS'
      ? resolvePlanSpeakerPhotos(plan)
      : Promise.resolve(plan),
  ]);

  const normalizedSlide: CardSlide =
    slide.type === 'SPEAKERS'
      ? {
          ...slide,
          speakerIndexes: slide.speakerIndexes.slice(0, 3),
        }
      : slide;

  return new ImageResponse(
    (
      <CardSlideTemplate
        plan={safePlan}
        slide={normalizedSlide}
        slideIndex={options?.slideIndex}
        totalSlides={options?.totalSlides}
      />
    ),
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      fonts,
    }
  );
}


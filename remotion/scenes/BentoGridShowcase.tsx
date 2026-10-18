import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { EventPlan } from '@/lib/schema';
import { type BrandColor, brandCycle, color } from '@/lib/tokens';
import type { SecondBeatItem } from './KineticStompText';
import {
  VeoCameraCanvas,
  type VeoPromptSpec,
  resolveVeoPrompt,
} from './VeoCameraCanvas';

export interface BentoGridShowcaseProps {
  overlayText: string;
  highlightWords: string[];
  plan: EventPlan;
  accent?: BrandColor;
  safeZone?: 'CENTER_SAFE' | 'TOP_THIRD_SAFE' | 'SPLIT_BENTO_SAFE';
  backgroundVideoUrl?: string;
  veoPrompt?: VeoPromptSpec;
  secondBeats?: SecondBeatItem[];
  sceneIndex?: number;
}

export const BentoGridShowcase: React.FC<BentoGridShowcaseProps> = ({
  overlayText,
  highlightWords,
  plan,
  accent,
  backgroundVideoUrl,
  veoPrompt,
  sceneIndex = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const isDarkTheme = plan.theme === 'IO_EXTENDED';
  const cardBg = isDarkTheme ? color.ink : color.white;
  const textColor = isDarkTheme ? color.white : color.ink;
  const activeAccent: BrandColor =
    accent ?? brandCycle[sceneIndex % brandCycle.length];
  const resolvedVeo = resolveVeoPrompt(veoPrompt, sceneIndex);

  // Assemble cards first, then subtle zoom-out showcase (SPEC 6.3)
  const zoomOutProgress = spring({
    frame: Math.max(0, frame - Math.round(durationInFrames * 0.45)),
    fps,
    config: { damping: 16, stiffness: 120 },
  });
  const gridScale = interpolate(zoomOutProgress, [0, 1], [1.04, 0.96]);

  const speakerNames =
    plan.speakers.length > 0
      ? plan.speakers
          .slice(0, 3)
          .map((s) => `${s.name} (${s.kind === 'HANDS_ON' ? 'Hands-on' : 'Session'})`)
          .join(' · ')
      : '현업 AI 엔지니어 & GDE 연사 라인업';

  const perksSummary =
    plan.perks.length > 0
      ? plan.perks.slice(0, 3).join(' · ')
      : '리미티드 굿즈 · 네트워킹 · 클라우드 크레딧';

  const scheduleHighlight =
    plan.schedule.find((item) => item.highlight)?.title ??
    plan.programSummary ??
    '실전 핸즈온 코드랩 & 기술 세션';

  const bentoItems: Array<{
    badge: string;
    title: string;
    detail: string;
    subDetail: string;
    brand: BrandColor;
  }> = [
    {
      badge: '01 · DATE & TIME',
      title: `${plan.date}`,
      detail: `${plan.startTime}${plan.endTime ? ` ~ ${plan.endTime}` : ''}`,
      subDetail: `${plan.year} ${plan.hostName}`,
      brand: 'blue',
    },
    {
      badge: '02 · VENUE',
      title: plan.venue,
      detail: plan.capacity ? `정원 ${plan.capacity}명 오프라인 캠퍼스` : '오프라인 현장 핸즈온',
      subDetail: plan.registration?.platform
        ? `${plan.registration.platform} 사전 신청`
        : '사전 등록 필수',
      brand: 'red',
    },
    {
      badge: '03 · PROGRAM & SPEAKERS',
      title: plan.programSummary || 'Hands-on & Tech Sessions',
      detail: speakerNames,
      subDetail: `하이라이트: ${scheduleHighlight}`,
      brand: 'yellow',
    },
    {
      badge: '04 · PERKS & BENEFIT',
      title: perksSummary,
      detail:
        plan.targetAudience || '대학생 · 취준생 · 주니어 개발자 누구나',
      subDetail:
        highlightWords.length > 0
          ? `핵심 키워드: ${highlightWords.join(' · ')}`
          : overlayText,
      brand: 'green',
    },
  ];

  const headerSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 180 },
  });

  return (
    <AbsoluteFill>
      <VeoCameraCanvas
        theme={plan.theme}
        accent={activeAccent}
        backgroundVideoUrl={backgroundVideoUrl}
        veoPrompt={resolvedVeo}
        sceneIndex={sceneIndex}
      />

      {/* Safe Zone Container (Top: 220px, Bottom: 420px) */}
      <div
        style={{
          position: 'absolute',
          top: 220,
          bottom: 420,
          left: 60,
          right: 60,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 24,
          transform: `scale(${gridScale.toFixed(3)})`,
        }}
      >
        {/* Top Overlay Title Banner */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: '26px 32px',
            borderRadius: 32,
            backgroundColor: cardBg,
            border: `4px solid ${textColor}`,
            transform: `translateY(${interpolate(
              headerSpring,
              [0, 1],
              [-30, 0]
            ).toFixed(1)}px)`,
            opacity: headerSpring,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                padding: '6px 18px',
                borderRadius: 9999,
                backgroundColor: color.yellow,
                color: color.ink,
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              EVENT FACT BENTO · 원본 데이터 직결
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: color[activeAccent],
              }}
            >
              {plan.title}
            </span>
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: textColor,
              lineHeight: 1.25,
              letterSpacing: -0.8,
            }}
          >
            {overlayText}
          </div>
        </div>

        {/* 2x2 Bento Grid (4 Cards with Staggered 60fps Spring Assembly) */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 22,
            flex: 1,
          }}
        >
          {bentoItems.map((item, idx) => {
            const cardSpring = spring({
              frame: Math.max(0, frame - (idx * 7 + 6)),
              fps,
              config: {
                damping: 12,
                stiffness: 190,
                mass: 0.85,
              },
            });

            const offsetX = idx % 2 === 0 ? -44 : 44;
            const offsetY = idx < 2 ? -32 : 32;
            const tx = interpolate(cardSpring, [0, 1], [offsetX, 0]);
            const ty = interpolate(cardSpring, [0, 1], [offsetY, 0]);
            const cardScale = interpolate(cardSpring, [0, 1], [0.84, 1]);
            const badgeTextColor =
              item.brand === 'yellow' ? color.ink : color.white;

            return (
              <div
                key={item.badge}
                style={{
                  width: 'calc(50% - 11px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '28px 28px',
                  borderRadius: 32,
                  backgroundColor: cardBg,
                  border: `4px solid ${color[item.brand]}`,
                  transform: `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(
                    1
                  )}px, 0) scale(${cardScale.toFixed(3)})`,
                  opacity: cardSpring,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      padding: '6px 16px',
                      borderRadius: 9999,
                      backgroundColor: color[item.brand],
                      color: badgeTextColor,
                      fontSize: 18,
                      fontWeight: 900,
                      letterSpacing: 0.4,
                    }}
                  >
                    {item.badge}
                  </span>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 9999,
                      backgroundColor: color[item.brand],
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 14,
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 900,
                      color: textColor,
                      lineHeight: 1.2,
                      letterSpacing: -0.8,
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: textColor,
                      opacity: 0.82,
                      lineHeight: 1.35,
                    }}
                  >
                    {item.detail}
                  </div>
                </div>

                <div
                  style={{
                    paddingTop: 12,
                    borderTop: `2px solid ${textColor}`,
                    fontSize: 18,
                    fontWeight: 700,
                    color: textColor,
                    opacity: 0.65,
                  }}
                >
                  {item.subDetail}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

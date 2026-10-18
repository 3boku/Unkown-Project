import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { EventPlan } from '@/lib/schema';
import {
  type BrandColor,
  brandCycle,
  color,
  fitFontSize,
} from '@/lib/tokens';
import {
  VeoCameraCanvas,
  type VeoPromptSpec,
  resolveVeoPrompt,
} from './VeoCameraCanvas';

export interface SecondBeatItem {
  secondOffset: number;
  visualAction: string;
  highlightWord: string;
  accent: BrandColor;
  sfxCue: string;
}

export interface KineticStompTextProps {
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

function normalizeToken(word: string): string {
  return word.replace(/[.,!?·"'()[\]{}]/g, '').trim().toLowerCase();
}

export const KineticStompText: React.FC<KineticStompTextProps> = ({
  overlayText,
  highlightWords,
  plan,
  accent,
  safeZone = 'CENTER_SAFE',
  backgroundVideoUrl,
  veoPrompt,
  secondBeats,
  sceneIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isDarkTheme = plan.theme === 'IO_EXTENDED';
  const cardBg = isDarkTheme ? color.ink : color.white;
  const textColor = isDarkTheme ? color.white : color.ink;
  const activeAccent: BrandColor =
    accent ?? brandCycle[sceneIndex % brandCycle.length];
  const resolvedVeo = resolveVeoPrompt(veoPrompt, sceneIndex);

  const words = overlayText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const normalizedHighlights = highlightWords.map(normalizeToken);

  // Determine current second beat (if provided) for 1-second precision sync
  const currentSec = Math.floor(frame / fps);
  const activeBeat =
    secondBeats?.find((b) => Math.floor(b.secondOffset) === currentSec) ??
    secondBeats?.[0];

  const baseFontSize = fitFontSize(overlayText, 24, {
    base: 76,
    medium: 64,
    small: 54,
  });

  // Safe zone alignment: Top 220px, Bottom 420px strictly respected
  const justifyContent =
    safeZone === 'TOP_THIRD_SAFE' ? 'flex-start' : 'center';

  const headerSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 190 },
  });

  const footerSpring = spring({
    frame: Math.max(0, frame - 12),
    fps,
    config: { damping: 15, stiffness: 170 },
  });

  let highlightCounter = 0;

  return (
    <AbsoluteFill>
      <VeoCameraCanvas
        theme={plan.theme}
        accent={activeAccent}
        backgroundVideoUrl={backgroundVideoUrl}
        veoPrompt={resolvedVeo}
        sceneIndex={sceneIndex}
      />

      {/* Instagram Reels Safe Zone Container (Top: 220px, Bottom: 420px) */}
      <div
        style={{
          position: 'absolute',
          top: 220,
          bottom: 420,
          left: 64,
          right: 64,
          display: 'flex',
          flexDirection: 'column',
          justifyContent,
          gap: 32,
        }}
      >
        {/* Event Fact Header Pill (Directly from EventPlan) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 28px',
            borderRadius: 9999,
            backgroundColor: cardBg,
            border: `3px solid ${color[activeAccent]}`,
            transform: `translateY(${interpolate(
              headerSpring,
              [0, 1],
              [-28, 0]
            ).toFixed(1)}px) scale(${interpolate(
              headerSpring,
              [0, 1],
              [0.92, 1]
            ).toFixed(3)})`,
            opacity: headerSpring,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {brandCycle.map((c) => (
                <span
                  key={c}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 9999,
                    backgroundColor: color[c],
                    display: 'inline-block',
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: textColor,
              }}
            >
              {plan.hostName} · {plan.year}
            </span>
          </div>

          <span
            style={{
              padding: '6px 18px',
              borderRadius: 9999,
              backgroundColor: color[activeAccent],
              color: activeAccent === 'yellow' ? color.ink : color.white,
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            {plan.date} · {plan.startTime}
          </span>
        </div>

        {/* Main Stomp Word Stage Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
            padding: '48px 44px',
            borderRadius: 40,
            backgroundColor: cardBg,
            border: `4px solid ${textColor}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '18px 16px',
            }}
          >
            {words.map((word, idx) => {
              const delayFrames = idx * 4;
              const wordSpring = spring({
                frame: Math.max(0, frame - delayFrames),
                fps,
                config: {
                  damping: 11,
                  stiffness: 220,
                  mass: 0.75,
                },
              });

              const normalized = normalizeToken(word);
              const isHighlighted =
                normalizedHighlights.some(
                  (hw) =>
                    hw.length > 0 &&
                    (normalized === hw || normalized.includes(hw))
                ) ||
                (activeBeat?.highlightWord
                  ? normalized.includes(
                      normalizeToken(activeBeat.highlightWord)
                    )
                  : false);

              const pillBrand: BrandColor = isHighlighted
                ? brandCycle[highlightCounter++ % brandCycle.length]
                : activeAccent;

              const scaleVal = interpolate(wordSpring, [0, 1], [1.75, 1]);
              const translateYVal = interpolate(wordSpring, [0, 1], [42, 0]);
              const opacityVal = interpolate(wordSpring, [0, 0.35, 1], [0, 1, 1]);

              const pillTextColor =
                pillBrand === 'yellow' ? color.ink : color.white;

              return (
                <span
                  key={`${word}-${idx}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: isHighlighted ? '10px 26px' : '4px 6px',
                    borderRadius: isHighlighted ? 9999 : 12,
                    backgroundColor: isHighlighted
                      ? color[pillBrand]
                      : 'transparent',
                    color: isHighlighted ? pillTextColor : textColor,
                    border: isHighlighted
                      ? `3px solid ${textColor}`
                      : 'none',
                    fontSize: baseFontSize,
                    fontWeight: 900,
                    lineHeight: 1.18,
                    letterSpacing: -1.5,
                    transform: `translateY(${translateYVal.toFixed(
                      1
                    )}px) scale(${scaleVal.toFixed(3)})`,
                    opacity: opacityVal,
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>

          {/* 1-Second Beat & SFX Sync Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 20,
              borderTop: `2px solid ${textColor}`,
              opacity: 0.85,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  padding: '6px 14px',
                  borderRadius: 9999,
                  backgroundColor: color.yellow,
                  color: color.ink,
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                {currentSec}.0s BEAT
              </span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: textColor,
                }}
              >
                {activeBeat?.visualAction ??
                  `${resolvedVeo.cameraAngle} · ${resolvedVeo.lighting}`}
              </span>
            </div>

            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: color[activeAccent],
              }}
            >
              SFX: {activeBeat?.sfxCue ?? resolvedVeo.sfxCue}
            </span>
          </div>
        </div>

        {/* Immutable EventPlan Fact Footer (Venue + Capacity/Perks) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 30px',
            borderRadius: 28,
            backgroundColor: cardBg,
            border: `3px solid ${textColor}`,
            transform: `translateY(${interpolate(
              footerSpring,
              [0, 1],
              [28, 0]
            ).toFixed(1)}px)`,
            opacity: footerSpring,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: textColor,
                opacity: 0.6,
              }}
            >
              행사 장소 (EventPlan 원본 바인딩)
            </span>
            <span
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: textColor,
              }}
            >
              {plan.venue}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 22px',
              borderRadius: 9999,
              backgroundColor: color.green,
              color: color.white,
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            {plan.capacity ? `선착순 ${plan.capacity}명` : plan.title}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

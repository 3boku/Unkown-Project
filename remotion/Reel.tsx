import React from 'react';
import {
  AbsoluteFill,
  Series,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {
  EventPlan,
  Reel as BaseReel,
  ReelScene as BaseReelScene,
} from '@/lib/schema';
import { type BrandColor, brandCycle, color } from '@/lib/tokens';
import { BentoGridShowcase } from './scenes/BentoGridShowcase';
import {
  KineticStompText,
  type SecondBeatItem,
} from './scenes/KineticStompText';
import type { VeoPromptSpec } from './scenes/VeoCameraCanvas';

export type ArgonReelScene = BaseReelScene & {
  accent?: BrandColor;
  safeZone?: 'CENTER_SAFE' | 'TOP_THIRD_SAFE' | 'SPLIT_BENTO_SAFE';
  backgroundVideoUrl?: string;
  veoPrompt?: VeoPromptSpec;
  secondBeats?: SecondBeatItem[];
};

export interface RubricCheckItem {
  score: number;
  passed: boolean;
  note: string;
}

export interface VerificationIteration {
  iteration: number;
  overallScore: number;
  passed: boolean;
  rubric: {
    hookImpact1_5s: RubricCheckItem;
    safeZoneLegibility: RubricCheckItem;
    physicsIntegrity: RubricCheckItem;
    cutRhythmSync: RubricCheckItem;
  };
  issues: string[];
  appliedFix?: string;
}

export interface ViralDnaMetadata {
  analyzedReelCount: number;
  firstFrameShockMs: number;
  avgCutDurationSec: number;
  targetBpm: number;
  hookFormula: string;
  retentionTriggers: string[];
}

export type ArgonReel = Omit<BaseReel, 'scenes'> & {
  scenes: ArgonReelScene[];
  directorRationale?: string;
  viralDna?: ViralDnaMetadata;
  verificationLoop?: VerificationIteration[];
};

export interface ReelCompositionProps {
  reel: ArgonReel;
  plan: EventPlan;
  showSafeZoneGuide?: boolean;
}

export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1920;
export const REEL_FPS = 60;

export function getSceneFrames(durationSec: number, fps = REEL_FPS): number {
  return Math.max(30, Math.round(durationSec * fps));
}

export function getReelTotalFrames(reel: ArgonReel, fps = REEL_FPS): number {
  if (!reel.scenes || reel.scenes.length === 0) {
    return 15 * fps;
  }
  const sum = reel.scenes.reduce(
    (acc, scene) => acc + getSceneFrames(scene.durationSec, fps),
    0
  );
  return Math.max(60, sum);
}

export const ReelComposition: React.FC<ReelCompositionProps> = ({
  reel,
  plan,
  showSafeZoneGuide = false,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const isDarkTheme = plan.theme === 'IO_EXTENDED';
  const hudBg = isDarkTheme ? color.ink : color.white;
  const hudText = isDarkTheme ? color.white : color.ink;

  const progressRatio = interpolate(
    frame,
    [0, Math.max(1, durationInFrames - 1)],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const currentSec = (frame / fps).toFixed(1);
  const totalSec = (durationInFrames / fps).toFixed(1);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: isDarkTheme ? color.ink : color.paper,
        fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Scene Series (SPEC 6.3: unknown component falls back to KineticStompText) */}
      <Series>
        {reel.scenes.map((scene, idx) => {
          const durationInFramesForScene = getSceneFrames(
            scene.durationSec,
            fps
          );
          const isBento = scene.component === 'BentoGridShowcase';

          return (
            <Series.Sequence
              key={`${scene.component}-${idx}`}
              durationInFrames={durationInFramesForScene}
            >
              {isBento ? (
                <BentoGridShowcase
                  overlayText={scene.overlayText}
                  highlightWords={scene.highlightWords}
                  plan={plan}
                  accent={scene.accent}
                  safeZone={scene.safeZone}
                  backgroundVideoUrl={scene.backgroundVideoUrl}
                  veoPrompt={scene.veoPrompt}
                  secondBeats={scene.secondBeats}
                  sceneIndex={idx}
                />
              ) : (
                <KineticStompText
                  overlayText={scene.overlayText}
                  highlightWords={scene.highlightWords}
                  plan={plan}
                  accent={scene.accent}
                  safeZone={scene.safeZone}
                  backgroundVideoUrl={scene.backgroundVideoUrl}
                  veoPrompt={scene.veoPrompt}
                  secondBeats={scene.secondBeats}
                  sceneIndex={idx}
                />
              )}
            </Series.Sequence>
          );
        })}
      </Series>

      {/* Top GDG 4-Dot Brand Bar */}
      <div
        style={{
          position: 'absolute',
          top: 44,
          left: 56,
          right: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          borderRadius: 9999,
          backgroundColor: hudBg,
          border: `3px solid ${hudText}`,
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {brandCycle.map((brand) => (
              <span
                key={brand}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 9999,
                  backgroundColor: color[brand],
                  display: 'inline-block',
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: hudText,
              letterSpacing: -0.4,
            }}
          >
            {plan.hostName}
          </span>
        </div>

        <span
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: hudText,
            opacity: 0.75,
          }}
        >
          60FPS · ARGON DIRECTOR
        </span>
      </div>

      {/* Bottom Scene & Beat Progress Indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 340,
          left: 56,
          right: 56,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '18px 26px',
          borderRadius: 24,
          backgroundColor: hudBg,
          border: `3px solid ${hudText}`,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 20,
            fontWeight: 800,
            color: hudText,
          }}
        >
          <span>
            {plan.title} · {plan.date}
          </span>
          <span>
            {currentSec}s / {totalSec}s
          </span>
        </div>

        <div
          style={{
            width: '100%',
            height: 14,
            borderRadius: 9999,
            backgroundColor: color.paper,
            border: `2px solid ${hudText}`,
            overflow: 'hidden',
            display: 'flex',
          }}
        >
          <div
            style={{
              width: `${(progressRatio * 100).toFixed(1)}%`,
              height: '100%',
              backgroundColor: color.blue,
            }}
          />
        </div>
      </div>

      {/* Optional Instagram Reels UI Safe-Zone Overlay Guide */}
      {showSafeZoneGuide && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          {/* Top Restricted Zone (220px) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 220,
              backgroundColor: color.red,
              opacity: 0.18,
              borderBottom: `4px dashed ${color.red}`,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: 14,
            }}
          >
            <span
              style={{
                padding: '6px 16px',
                borderRadius: 9999,
                backgroundColor: color.red,
                color: color.white,
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              IG REELS TOP UI RESTRICTED ZONE (220PX)
            </span>
          </div>

          {/* Safe Active Frame */}
          <div
            style={{
              position: 'absolute',
              top: 220,
              bottom: 420,
              left: 48,
              right: 48,
              border: `4px dashed ${color.green}`,
              borderRadius: 28,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
              padding: 16,
            }}
          >
            <span
              style={{
                padding: '6px 16px',
                borderRadius: 9999,
                backgroundColor: color.green,
                color: color.white,
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              ARGON VERIFIED SAFE ZONE (100% LEGIBLE)
            </span>
          </div>

          {/* Bottom Restricted Zone (420px: IG Caption, Audio Marquee, Like/Share Rail) */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 420,
              backgroundColor: color.red,
              opacity: 0.18,
              borderTop: `4px dashed ${color.red}`,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: 18,
            }}
          >
            <span
              style={{
                padding: '6px 16px',
                borderRadius: 9999,
                backgroundColor: color.red,
                color: color.white,
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              IG REELS CAPTION &amp; AUDIO RESTRICTED ZONE (420PX)
            </span>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export default ReelComposition;

import React from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  type BrandColor,
  type ThemeId,
  brandCycle,
  color,
  themes,
} from '@/lib/tokens';

export interface VeoPromptSpec {
  cameraAngle: string;
  cameraMove: string;
  lensMm: number;
  lighting: string;
  sfxCue: string;
  compiledPrompt: string;
  seed: number;
}

export interface VeoCameraCanvasProps {
  theme: ThemeId;
  accent?: BrandColor;
  backgroundVideoUrl?: string;
  veoPrompt?: VeoPromptSpec;
  sceneIndex?: number;
}

const DEFAULT_VEO_PROMPTS: VeoPromptSpec[] = [
  {
    cameraAngle: 'LOW_ANGLE_HERO',
    cameraMove: 'DOLLY_ZOOM_1_5X',
    lensMm: 24,
    lighting: 'HIGH_CONTRAST_STUDIO',
    sfxCue: 'SUB_BASS_IMPACT_120BPM',
    compiledPrompt:
      'Low-angle hero shot, 24mm wide lens, 1.5x rapid dolly-in towards glowing geometric studio stage, crisp architectural lighting, zero text, 60fps cinematic motion plate.',
    seed: 428501,
  },
  {
    cameraAngle: 'DUTCH_TILT_12DEG',
    cameraMove: 'ORBIT_360',
    lensMm: 35,
    lighting: 'VOLUMETRIC_CAMPUS_GLOW',
    sfxCue: 'RISER_SWOOSH_SYNC',
    compiledPrompt:
      'Dynamic 12-degree Dutch tilt, smooth orbital camera tracking around modular glass atrium, volumetric key light, clean depth of field, zero text.',
    seed: 340853,
  },
  {
    cameraAngle: 'EYE_LEVEL_MACRO',
    cameraMove: 'WHIP_PAN',
    lensMm: 50,
    lighting: 'NEON_RIM_ACCENT',
    sfxCue: 'STOMP_CLICK_FINALE',
    compiledPrompt:
      'Fast whip-pan settling into eye-level macro focal plane, crisp rim lighting on developer stage backdrop, kinetic bokeh particles, zero text.',
    seed: 202605,
  },
];

export function resolveVeoPrompt(
  veoPrompt?: VeoPromptSpec,
  sceneIndex = 0
): VeoPromptSpec {
  if (veoPrompt) return veoPrompt;
  return DEFAULT_VEO_PROMPTS[sceneIndex % DEFAULT_VEO_PROMPTS.length];
}

export const VeoCameraCanvas: React.FC<VeoCameraCanvasProps> = ({
  theme,
  accent,
  backgroundVideoUrl,
  veoPrompt,
  sceneIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const preset = themes[theme] ?? themes.BUILD_WITH_AI;
  const activeAccent: BrandColor =
    accent ?? brandCycle[sceneIndex % brandCycle.length];
  const accentHex = color[activeAccent];
  const secondaryBrand: BrandColor =
    brandCycle[(sceneIndex + 1) % brandCycle.length];
  const tertiaryBrand: BrandColor =
    brandCycle[(sceneIndex + 2) % brandCycle.length];

  const resolvedVeo = resolveVeoPrompt(veoPrompt, sceneIndex);
  const isDarkTheme = theme === 'IO_EXTENDED';
  const baseBg = isDarkTheme ? color.ink : color.paper;
  const fgColor = isDarkTheme ? color.white : color.ink;

  // Deterministic camera motion progress
  const entranceSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 140, mass: 0.9 },
  });

  const normalizedProgress = interpolate(
    frame,
    [0, Math.max(1, durationInFrames - 1)],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Interpret cameraMove into 60fps camera transforms
  const moveUpper = resolvedVeo.cameraMove.toUpperCase();
  const angleUpper = resolvedVeo.cameraAngle.toUpperCase();

  const scale = moveUpper.includes('DOLLY')
    ? interpolate(normalizedProgress, [0, 1], [1.0, 1.38])
    : moveUpper.includes('WHIP')
      ? interpolate(entranceSpring, [0, 1], [1.22, 1.04])
      : interpolate(normalizedProgress, [0, 1], [1.02, 1.16]);

  const translateX = moveUpper.includes('WHIP')
    ? interpolate(entranceSpring, [0, 1], [-140, 0])
    : moveUpper.includes('ORBIT')
      ? interpolate(normalizedProgress, [0, 0.5, 1], [-36, 28, -12])
      : interpolate(normalizedProgress, [0, 1], [0, 18]);

  const translateY = angleUpper.includes('LOW_ANGLE')
    ? interpolate(normalizedProgress, [0, 1], [34, -22])
    : interpolate(normalizedProgress, [0, 1], [-16, 16]);

  const rotateZ = angleUpper.includes('DUTCH')
    ? interpolate(normalizedProgress, [0, 1], [-6.5, -2.5])
    : moveUpper.includes('ORBIT')
      ? interpolate(normalizedProgress, [0, 1], [-2, 3.5])
      : 0;

  // First 1.5s (90 frames at 60fps) shock pulse for Argon Hook Rubric
  const shockPulse = interpolate(frame, [0, 18, 90], [1, 1.14, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const gridLines = [0, 1, 2, 3, 4, 5, 6, 7];
  const floatingNodes = [0, 1, 2, 3, 4, 5];

  return (
    <AbsoluteFill style={{ backgroundColor: baseBg, overflow: 'hidden' }}>
      {backgroundVideoUrl ? (
        <AbsoluteFill>
          <OffthreadVideo
            src={backgroundVideoUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${scale.toFixed(3)})`,
            }}
          />
          <AbsoluteFill
            style={{
              backgroundColor: baseBg,
              opacity: isDarkTheme ? 0.52 : 0.35,
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            transform: `translate3d(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px, 0) scale(${(
              scale * shockPulse
            ).toFixed(3)}) rotate(${rotateZ.toFixed(2)}deg)`,
            transformOrigin: 'center center',
          }}
        >
          {/* Ambient Brand Key Lights */}
          <div
            style={{
              position: 'absolute',
              top: -180,
              left: -140,
              width: 780,
              height: 780,
              borderRadius: 9999,
              backgroundColor: accentHex,
              opacity: isDarkTheme ? 0.24 : 0.16,
              transform: `scale(${entranceSpring.toFixed(3)})`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -200,
              right: -140,
              width: 820,
              height: 820,
              borderRadius: 9999,
              backgroundColor: color[secondaryBrand],
              opacity: isDarkTheme ? 0.22 : 0.14,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '38%',
              right: -120,
              width: 460,
              height: 460,
              borderRadius: 9999,
              backgroundColor: color[tertiaryBrand],
              opacity: isDarkTheme ? 0.18 : 0.12,
            }}
          />

          {/* 3D Perspective Camera Grid */}
          <div
            style={{
              position: 'absolute',
              inset: -120,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              opacity: isDarkTheme ? 0.18 : 0.1,
            }}
          >
            {gridLines.map((idx) => {
              const offset = ((frame * 2 + idx * 140) % 1120) - 80;
              return (
                <div
                  key={`h-${idx}`}
                  style={{
                    position: 'absolute',
                    top: `${(idx + 1) * 11.5}%`,
                    left: 0,
                    right: 0,
                    height: 2,
                    backgroundColor: fgColor,
                    transform: `translateY(${(offset * 0.04).toFixed(1)}px)`,
                  }}
                />
              );
            })}
            {gridLines.map((idx) => (
              <div
                key={`v-${idx}`}
                style={{
                  position: 'absolute',
                  left: `${(idx + 1) * 11.5}%`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  backgroundColor: fgColor,
                }}
              />
            ))}
          </div>

          {/* Kinetic Geometric Camera Markers (Deterministic from Seed) */}
          {floatingNodes.map((nodeIdx) => {
            const seedOffset =
              ((resolvedVeo.seed + nodeIdx * 97) % 100) / 100;
            const nodeBrand = brandCycle[(sceneIndex + nodeIdx) % 4];
            const driftY = interpolate(
              normalizedProgress,
              [0, 1],
              [nodeIdx % 2 === 0 ? 48 : -48, nodeIdx % 2 === 0 ? -48 : 48]
            );
            const posX = 12 + ((nodeIdx * 17 + Math.round(seedOffset * 30)) % 76);
            const posY = 16 + ((nodeIdx * 13 + Math.round(seedOffset * 25)) % 68);
            const size = 28 + (nodeIdx % 3) * 18;

            return (
              <div
                key={`node-${nodeIdx}`}
                style={{
                  position: 'absolute',
                  left: `${posX}%`,
                  top: `${posY}%`,
                  width: size,
                  height: size,
                  borderRadius: nodeIdx % 2 === 0 ? 9999 : 10,
                  border: `4px solid ${color[nodeBrand]}`,
                  backgroundColor:
                    nodeIdx % 3 === 0 ? color[nodeBrand] : 'transparent',
                  opacity: isDarkTheme ? 0.35 : 0.22,
                  transform: `translateY(${driftY.toFixed(1)}px) rotate(${(
                    frame * (nodeIdx % 2 === 0 ? 0.8 : -0.8)
                  ).toFixed(1)}deg)`,
                }}
              />
            );
          })}
        </AbsoluteFill>
      )}

      {/* Subtle Viewfinder Frame & Veo Telemetry HUD inside top safe margin */}
      <div
        style={{
          position: 'absolute',
          top: 118,
          left: 56,
          right: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 20px',
            borderRadius: 9999,
            backgroundColor: isDarkTheme ? color.ink : color.white,
            border: `2px solid ${accentHex}`,
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 9999,
              backgroundColor: color.red,
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 0.6,
              color: fgColor,
            }}
          >
            VEO 3.1 · {resolvedVeo.cameraMove} · {resolvedVeo.lensMm}MM
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 18px',
            borderRadius: 9999,
            backgroundColor: isDarkTheme ? color.ink : color.white,
            border: `2px solid ${fgColor}`,
            opacity: 0.82,
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: fgColor,
            }}
          >
            { preset.label.toUpperCase() } · SEED {resolvedVeo.seed}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

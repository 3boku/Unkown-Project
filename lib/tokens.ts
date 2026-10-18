// lib/tokens.ts — 저장소에서 hex 값이 등장하는 유일한 파일
export const color = {
  blue:   '#4285F4',
  red:    '#EA4335',
  yellow: '#FBBC05',
  green:  '#34A853',
  ink:    '#202124', // Dark Grey: 본문·제목
  paper:  '#F8F9FA', // Light Grey: 내부 슬라이드 배경
  white:  '#FFFFFF',
} as const;

export type BrandColor = 'blue' | 'red' | 'yellow' | 'green';
export type TokenColorKey = keyof typeof color;

export const brandCycle: BrandColor[] = ['blue', 'red', 'yellow', 'green'];

export type ThemeId = 'BUILD_WITH_AI' | 'IO_EXTENDED' | 'DEVFEST';

export interface ThemePreset {
  id: ThemeId;
  label: string;
  coverBg: string;
  coverText: string;
  slideBg: string;
  panelBg: string;
  panelText: string;
  primaryAccent: BrandColor;
  gradientColors: [string, string, string];
}

export const themes: Record<ThemeId, ThemePreset> = {
  BUILD_WITH_AI: {
    id: 'BUILD_WITH_AI',
    label: 'Build with AI',
    coverBg: color.paper,
    coverText: color.ink,
    slideBg: color.paper,
    panelBg: color.white,
    panelText: color.ink,
    primaryAccent: 'blue',
    gradientColors: [color.blue, color.yellow, color.green],
  },
  IO_EXTENDED: {
    id: 'IO_EXTENDED',
    label: 'Google I/O Extended',
    coverBg: color.ink,
    coverText: color.white,
    slideBg: color.ink,
    panelBg: color.ink,
    panelText: color.white,
    primaryAccent: 'blue',
    gradientColors: [color.blue, color.red, color.yellow],
  },
  DEVFEST: {
    id: 'DEVFEST',
    label: 'DevFest',
    coverBg: color.paper,
    coverText: color.ink,
    slideBg: color.paper,
    panelBg: color.white,
    panelText: color.ink,
    primaryAccent: 'yellow',
    gradientColors: [color.red, color.yellow, color.blue],
  },
};

/**
 * 제목 길이에 따라 Satori/템플릿에서 사용할 글자 크기(px)를 단계별로 반환합니다. (SPEC 11절)
 */
export function fitFontSize(
  text: string,
  maxChars = 18,
  sizes: { base: number; medium: number; small: number } = {
    base: 64,
    medium: 52,
    small: 40,
  }
): number {
  const length = text.trim().length;
  if (length <= maxChars) return sizes.base;
  if (length <= Math.round(maxChars * 1.5)) return sizes.medium;
  return sizes.small;
}

import {
  type EventPlan,
  EventPlanSchema,
  type Generated,
  GeneratedSchema,
} from './schema.ts';
import samplePlanRaw from '../fixtures/sample-plan.json' with { type: 'json' };
import sampleGeneratedRaw from '../fixtures/sample-generated.json' with { type: 'json' };

export const PLAN_STORAGE_KEY = 'gdg-brandkit:event-plan:v1';
export const GENERATED_STORAGE_KEY = 'gdg-brandkit:generated:v1';

export const samplePlan: EventPlan = EventPlanSchema.parse(samplePlanRaw);
export const sampleGenerated: Generated =
  GeneratedSchema.parse(sampleGeneratedRaw);

export const emptyPlan: EventPlan = {
  theme: 'BUILD_WITH_AI',
  year: '2026',
  title: '',
  hostName: 'GDG Campus Korea',
  hook: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  venue: '',
  capacity: undefined,
  programSummary: '',
  targetAudience: '',
  perks: [],
  registration: {
    platform: 'EVENTUS',
    url: '',
    deadline: '',
  },
  schedule: [],
  speakers: [],
  specialEvents: [],
  sponsors: [],
};

/**
 * 필수 필드(theme, year, title, date, startTime, venue)가 모두 채워졌는지 확인합니다.
 */
export function isPlanValidForGeneration(plan: EventPlan): boolean {
  return Boolean(
    plan.theme &&
      plan.year.trim().length > 0 &&
      plan.title.trim().length > 0 &&
      plan.date.trim().length > 0 &&
      plan.startTime.trim().length > 0 &&
      plan.venue.trim().length > 0,
  );
}

/**
 * 비어 있는 필수 필드 한글 라벨 목록을 반환합니다.
 */
export function getMissingRequiredFields(plan: EventPlan): string[] {
  const missing: string[] = [];
  if (!plan.theme) missing.push('테마');
  if (!plan.year.trim()) missing.push('연도');
  if (!plan.title.trim()) missing.push('제목');
  if (!plan.date.trim()) missing.push('날짜');
  if (!plan.startTime.trim()) missing.push('시작 시간');
  if (!plan.venue.trim()) missing.push('장소');
  return missing;
}

export function loadPlanFromStorage(): EventPlan {
  if (typeof window === 'undefined') {
    return samplePlan;
  }
  try {
    const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return samplePlan;
    const parsed = JSON.parse(raw);
    const result = EventPlanSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    // 필수 필드가 임시로 비어 있는 편집 중 상태도 복원할 수 있도록 병합합니다.
    if (parsed && typeof parsed === 'object') {
      return {
        ...emptyPlan,
        ...parsed,
        registration: {
          ...emptyPlan.registration,
          ...(parsed.registration ?? {}),
        },
        perks: Array.isArray(parsed.perks) ? parsed.perks : [],
        schedule: Array.isArray(parsed.schedule) ? parsed.schedule : [],
        speakers: Array.isArray(parsed.speakers) ? parsed.speakers : [],
        specialEvents: Array.isArray(parsed.specialEvents)
          ? parsed.specialEvents
          : [],
        sponsors: Array.isArray(parsed.sponsors) ? parsed.sponsors : [],
      };
    }
    return samplePlan;
  } catch {
    return samplePlan;
  }
}

export function savePlanToStorage(plan: EventPlan): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // localStorage 용량 초과 등은 무시
  }
}

export function loadGeneratedFromStorage(): Generated {
  if (typeof window === 'undefined') {
    return sampleGenerated;
  }
  try {
    const raw = window.localStorage.getItem(GENERATED_STORAGE_KEY);
    if (!raw) return sampleGenerated;
    const parsed = JSON.parse(raw);
    const result = GeneratedSchema.safeParse(parsed);
    return result.success ? result.data : sampleGenerated;
  } catch {
    return sampleGenerated;
  }
}

export function saveGeneratedToStorage(generated: Generated): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      GENERATED_STORAGE_KEY,
      JSON.stringify(generated),
    );
  } catch {
    // localStorage 용량 초과 등은 무시
  }
}

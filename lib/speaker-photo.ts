import type { CardSlide, EventPlan, Speaker } from './schema.ts';

/**
 * 연사 목록이 3명을 초과할 때 한 장에 최대 3명씩 들어가도록 SPEAKERS 슬라이드를 자동 분할/정규화합니다. (SPEC 6.2, BK-05)
 */
export function chunkSpeakerIndexes(
  indexes: number[],
  maxPerSlide = 3
): number[][] {
  if (indexes.length === 0) return [];
  const chunks: number[][] = [];
  for (let i = 0; i < indexes.length; i += maxPerSlide) {
    chunks.push(indexes.slice(i, i + maxPerSlide));
  }
  return chunks;
}

/**
 * 카드 슬라이드 배열에서 SPEAKERS 슬라이드의 대상 연사가 3명을 넘으면 3명씩 슬라이드를 나눕니다. (BK-05 AC3)
 */
export function normalizeCardSlidesForPlan(
  plan: EventPlan,
  cards: CardSlide[]
): CardSlide[] {
  const result: CardSlide[] = [];

  // 이미 각 kind에 대해 전체 연사를 분할할 수 있도록 kind별 전체 인덱스 조회 헬퍼
  const getKindSpeakerIndexes = (kind: Speaker['kind']): number[] =>
    plan.speakers
      .map((sp, idx) => (sp.kind === kind ? idx : -1))
      .filter((idx) => idx !== -1);

  const seenKindsCount = new Map<Speaker['kind'], number>();
  for (const card of cards) {
    if (card.type === 'SPEAKERS') {
      seenKindsCount.set(card.kind, (seenKindsCount.get(card.kind) ?? 0) + 1);
    }
  }

  for (const card of cards) {
    if (card.type !== 'SPEAKERS') {
      result.push(card);
      continue;
    }

    const validExplicitIndexes = card.speakerIndexes.filter(
      (idx) => idx >= 0 && idx < plan.speakers.length
    );
    const allKindIndexes = getKindSpeakerIndexes(card.kind);

    // 해당 kind의 SPEAKERS 슬라이드가 1장뿐인데 plan에 해당 kind 연사가 3명보다 많다면 전체 연사를 3명씩 분할
    const targetIndexes =
      (seenKindsCount.get(card.kind) ?? 0) === 1 && allKindIndexes.length > 3
        ? allKindIndexes
        : validExplicitIndexes.length > 0
          ? validExplicitIndexes
          : allKindIndexes;

    const chunks = chunkSpeakerIndexes(targetIndexes, 3);
    if (chunks.length <= 1) {
      result.push({
        ...card,
        speakerIndexes: chunks[0] ?? [],
      });
    } else {
      chunks.forEach((chunk, idx) => {
        result.push({
          ...card,
          title:
            chunks.length > 1 ? `${card.title} (${idx + 1}/${chunks.length})` : card.title,
          speakerIndexes: chunk,
        });
      });
    }
  }

  return result;
}


/**
 * 연사 사진 URL이 유효한 data URL인지 확인하거나, 외부 URL인 경우 안전하게 가져와 data URL로 변환합니다.
 * 불러오기에 실패하거나 타임아웃이 발생하면 undefined를 반환하여 템플릿이 이니셜 원형 아바타를 렌더링하도록 합니다. (SPEC 11절, BK-05)
 */
export async function resolveSafePhotoUrl(
  photoUrl?: string,
  timeoutMs = 2500
): Promise<string | undefined> {
  if (!photoUrl || typeof photoUrl !== 'string') {
    return undefined;
  }

  const trimmed = photoUrl.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return undefined;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(trimmed, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return undefined;
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (
      !contentType.startsWith('image/png') &&
      !contentType.startsWith('image/jpeg') &&
      !contentType.startsWith('image/jpg') &&
      !contentType.startsWith('image/gif') &&
      !contentType.startsWith('image/svg+xml')
    ) {
      return undefined;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return undefined;
    }

    const mime = contentType.split(';')[0].trim();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:${mime};base64,${base64}`;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * EventPlan 내의 모든 연사 사진을 사전 검증·변환하여 Satori 렌더링 중 외부 이미지 에러가 발생하지 않도록 보장합니다.
 */
export async function resolvePlanSpeakerPhotos(
  plan: EventPlan
): Promise<EventPlan> {
  if (!plan.speakers || plan.speakers.length === 0) {
    return plan;
  }

  const resolvedSpeakers: Speaker[] = await Promise.all(
    plan.speakers.map(async (speaker) => ({
      ...speaker,
      photoUrl: await resolveSafePhotoUrl(speaker.photoUrl),
    }))
  );

  return {
    ...plan,
    speakers: resolvedSpeakers,
  };
}


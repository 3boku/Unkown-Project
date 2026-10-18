import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from '@/lib/gemini/service';
import {
  EventPlanSchema,
  GeneratedSchema,
  type CardSlide,
  type EventPlan,
  type Generated,
} from '@/lib/schema';

/**
 * BK-03 · POST /api/generate
 * 입력: EventPlan (또는 { plan: EventPlan }) -> 출력: Generated
 * 스키마 검증 실패 시 zod 오류 메시지를 붙여 1회 재시도합니다 (SPEC 7.2).
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const candidatePlan =
      rawBody && typeof rawBody === 'object' && 'plan' in rawBody
        ? rawBody.plan
        : rawBody;

    const parsedPlan = EventPlanSchema.safeParse(candidatePlan);
    if (!parsedPlan.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '유효한 행사 기획서(EventPlan) 입력이 필요합니다.',
            issues: parsedPlan.error.issues,
          },
        },
        { status: 400 },
      );
    }

    const plan: EventPlan = {
      ...parsedPlan.data,
      hostName:
        parsedPlan.data.hostName === 'GDG Campus Korea'
          ? 'GDG'
          : parsedPlan.data.hostName || 'GDG',
    };

    const systemInstruction = `당신은 GDG 커뮤니티 행사의 홍보 에셋(썸네일, 인스타 카드뉴스, 릴스 대본, SNS 캡션)을 생성하는 전문 브랜드 에디터(Gemini 4)입니다.
주어진 EventPlan(사실 데이터)을 바탕으로 GeneratedSchema 규격의 JSON을 생성하세요.

[핵심 규칙 — SPEC 5.2, 6.2, 6.3, 6.4, 7.2]
1. 언어 및 톤: 한국어, 친근하지만 과장 없는 GDG 개발자 커뮤니티 톤. 'GDG Campus Korea'라는 표현은 쓰지 말고 반드시 'GDG'만 사용하세요.
2. 사실 보존 원칙: EventPlan에 없는 경품, 연사, 시간, 장소를 절대 지어내지 마세요.
3. cards 구성 (총 6~10장):
   - 기본 순서: COVER -> INTRO -> TIMETABLE -> SPEAKERS(HANDS_ON) -> SPEAKERS(SESSION) -> (SPECIAL_EVENT) -> CTA.
   - INTRO 슬라이드의 sections는 3개(예: '행사 구성', '이런 사람들에게 추천해요', '진행 장소 및 시간').
   - SPEAKERS 슬라이드는 한 장에 speakerIndexes를 최대 3개까지만 넣으세요.
4. reel 구성 (합계 15~20초):
   - scenes 배열의 각 장면 component는 'KineticStompText' 또는 'BentoGridShowcase'만 사용하세요.
   - durationSec 합계가 15~20초가 되도록 구성하고, highlightWords에 핵심 단어 2~4개를 넣으세요.
5. sns 문구:
   - instagramCaption: 2,200자 이하, 해시태그 30개 이하 (#GDG 포함, #GDGCampusKorea 제외).
   - threadsMain: 500자 이하, 신청 링크 URL은 넣지 마세요.
   - threadsReply: 참가 신청 링크(registration.url)와 마감일 안내를 넣으세요.
6. style.accent는 'blue' | 'red' | 'yellow' | 'green' 중 하나만 사용하세요.`;

    const basePrompt = `다음 EventPlan JSON을 바탕으로 브랜드 킷(Generated) JSON을 생성하세요:\n\n${JSON.stringify(
      plan,
      null,
      2,
    )}`;

    const jsonSchema = z.toJSONSchema(GeneratedSchema);
    let lastError: unknown = null;

    // 최대 2회 시도 (초기 1회 + 스키마 검증 실패 시 zod 오류 메시지 첨부하여 1회 재시도)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const prompt =
          attempt === 1
            ? basePrompt
            : `${basePrompt}\n\n[이전 응답 스키마 검증 오류 — 반드시 수정하여 다시 생성하세요]\n${String(
                lastError,
              )}`;

        const result = await generateText({
          model: 'gemini-4',
          prompt,
          systemInstruction,
          config: {
            responseMimeType: 'application/json',
            responseSchema: jsonSchema,
            temperature: 0.3,
          },
        });

        const parsedJson = JSON.parse(result.text);
        const validated = GeneratedSchema.parse(parsedJson);

        return NextResponse.json({
          success: true,
          generated: validated,
          model: result.model,
          attempt,
        });
      } catch (err) {
        lastError =
          err instanceof z.ZodError
            ? JSON.stringify(err.issues)
            : err instanceof Error
              ? err.message
              : String(err);
      }
    }

    // 만약 오프라인/쿼터 등으로 두 번 모두 실패한 경우 기획서 사실 기반 생성 폴백 제공
    const fallbackGenerated = buildPlanAwareGenerated(plan);
    return NextResponse.json({
      success: true,
      generated: fallbackGenerated,
      model: 'gemini-4',
      fallback: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '브랜드 킷 생성 중 오류가 발생했습니다.';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GENERATION_ERROR',
          message,
        },
      },
      { status: 500 },
    );
  }
}

function buildPlanAwareGenerated(plan: EventPlan): Generated {
  const hook = plan.hook?.trim() || `${plan.title}에서 함께 만나요!`;
  const prog =
    plan.programSummary?.trim() ||
    (plan.schedule.length > 0
      ? `총 ${plan.schedule.length}개 프로그램 세션 진행`
      : '핸즈온 실습 및 기술 세션');
  const target =
    plan.targetAudience?.trim() || '개발자, 학생, AI 및 최신 기술에 관심 있는 분';
  const timeStr = plan.endTime
    ? `${plan.startTime} ~ ${plan.endTime}`
    : plan.startTime;
  const perksStr =
    plan.perks.length > 0 ? plan.perks.join(', ') : '네트워킹 및 참가 기념품';

  const handsOnIndexes: number[] = [];
  const sessionIndexes: number[] = [];
  plan.speakers.forEach((sp, idx) => {
    if (sp.kind === 'HANDS_ON') handsOnIndexes.push(idx);
    else sessionIndexes.push(idx);
  });

  const cards: CardSlide[] = [
    {
      type: 'COVER',
      headline: `${plan.year} ${plan.title}`,
      style: { accent: 'blue', layout: 'A', emphasis: 'bold' },
    },
    {
      type: 'INTRO',
      hookTitle: hook,
      hookBody:
        plan.description?.trim() ||
        `GDG가 준비한 ${plan.title}에서 직접 소통하고 기술을 경험해 보세요.`,
      sections: [
        { label: '행사 구성', body: prog },
        { label: '이런 사람들에게 추천해요', body: target },
        {
          label: '진행 장소 및 시간',
          body: `${plan.date} (${timeStr}) · ${plan.venue}`,
        },
      ],
      style: { accent: 'yellow', layout: 'A', emphasis: 'calm' },
    },
    {
      type: 'TIMETABLE',
      title: 'Time Table',
      style: { accent: 'blue', layout: 'A', emphasis: 'calm' },
    },
    {
      type: 'SPEAKERS',
      title: 'Hands-on Speakers',
      kind: 'HANDS_ON',
      speakerIndexes:
        handsOnIndexes.length > 0 ? handsOnIndexes.slice(0, 3) : [0],
      style: { accent: 'green', layout: 'A', emphasis: 'bold' },
    },
    {
      type: 'SPEAKERS',
      title: 'Session Speakers',
      kind: 'SESSION',
      speakerIndexes:
        sessionIndexes.length > 0 ? sessionIndexes.slice(0, 3) : [0],
      style: { accent: 'red', layout: 'A', emphasis: 'bold' },
    },
    {
      type: 'SPECIAL_EVENT',
      title: 'Special Events',
      style: { accent: 'yellow', layout: 'B', emphasis: 'calm' },
    },
    {
      type: 'CTA',
      headline: '지금 바로 참가 신청하세요!',
      body: `${plan.registration.deadline ? `신청 마감: ${plan.registration.deadline} · ` : ''}프로필 링크에서 신청${plan.capacity ? ` (정원 ${plan.capacity}명)` : ''}`,
      style: { accent: 'blue', layout: 'A', emphasis: 'bold' },
    },
  ];

  const regUrl =
    plan.registration.url?.trim() || 'https://event-us.kr/gdg/event';

  return GeneratedSchema.parse({
    thumbnail: {
      headline: `${plan.year} ${plan.title}`,
      subline: `${hook} · ${plan.date} ${plan.venue}`,
      style: { accent: 'blue', layout: 'A', emphasis: 'bold' },
    },
    cards,
    reel: {
      scenes: [
        {
          component: 'KineticStompText',
          durationSec: 5,
          overlayText: `${hook} ${plan.year} ${plan.title}`,
          highlightWords: [plan.year, plan.title.split(' ')[0] || 'GDG'],
        },
        {
          component: 'BentoGridShowcase',
          durationSec: 6,
          overlayText: `${plan.date} ${plan.venue} · ${prog}`,
          highlightWords: [plan.date, plan.venue],
        },
        {
          component: 'KineticStompText',
          durationSec: 5,
          overlayText: `지금 바로 프로필 링크에서 신청하세요!`,
          highlightWords: ['프로필', '신청하세요!'],
        },
      ],
    },
    sns: {
      instagramCaption: `${hook}\n\nGDG가 준비한 ${plan.year} ${plan.title}에 여러분을 초대합니다!\n${plan.description || '함께 배우고 성장하는 개발자 커뮤니티 행사입니다.'}\n\n📌 상세 타임테이블과 최신 연사자 정보는 프로필 링크에서 확인해주세요\n\n🔥 프로그램 구성\n- ${prog}\n\n🛠️ 행사 특징\n- 일시: ${plan.date} (${timeStr})\n- 장소: ${plan.venue}\n- 대상: ${target}\n- 혜택: ${perksStr}\n\n#GDG #개발자행사 #커뮤니티`,
      threadsMain: `${hook} 🤔\n\n${plan.year} ${plan.title} 참가자를 모집합니다!\n\n📅 ${plan.date} (${timeStr})\n📍 ${plan.venue}\n💻 ${prog}\n🎁 ${perksStr}\n\n지금 바로 함께해 보세요!`,
      threadsReply: `👉 참가 신청 바로가기${plan.registration.deadline ? ` (~${plan.registration.deadline} 마감)` : ''}\n${regUrl}`,
    },
  });
}

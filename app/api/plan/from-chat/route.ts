import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from '@/lib/gemini/service';
import { EventPlanSchema, type EventPlan } from '@/lib/schema';
import { samplePlan } from '@/lib/storage';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const RequestBodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    }),
  ),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parsedBody = RequestBodySchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '대화 메시지(messages) 형식이 올바르지 않습니다.',
          },
        },
        { status: 400 },
      );
    }

    const messages: ChatMessage[] = parsedBody.data.messages;
    const conversationText = messages
      .map((m) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
      .join('\n\n');

    const systemInstruction = `당신은 GDG 캠퍼스 행사를 기획하는 Google AI 어시스턴트(Gemini 4 Argon / 3.8 Flash)입니다.
사용자와 나눈 대화 기록을 꼼꼼하게 분석하여 GDG 브랜드킷 생성을 위한 'EventPlan' JSON 객체를 만드세요.

[필수 요구사항]
1. theme: 'BUILD_WITH_AI' | 'IO_EXTENDED' | 'DEVFEST' 중 대화에 가장 잘 어울리는 것을 선택하세요.
2. year: 행사 연도 문자열 (예: '2026'). 대화에 명시되지 않았다면 '2026' 사용.
3. title: 행사 공식 명칭 (예: 'Build with AI Hands-on Campus').
4. hostName: 주최 단체 (기본값: 'GDG Campus Korea').
5. hook: 호기심을 끄는 한 줄 후킹 문구.
6. description: 행사의 목적과 분위기를 담은 소개글 (2~3줄).
7. date: 행사 일자 (YYYY-MM-DD 형식).
8. startTime / endTime: 시작 및 종료 시간 (HH:mm 형식, 예: '13:00', '18:00').
9. venue: 행사 진행 장소 (예: '서강대학교 정하상관').
10. capacity: 참가자 정원 숫자 (기본값: 150~200).
11. schedule: 시간순 타임테이블 배열 ({ start, end, title, note, highlight }).
12. speakers: 연사 목록 배열 ({ name, affiliation, sessionTitle, summary, kind: 'HANDS_ON' | 'SESSION' }).
13. perks: 참가자 혜택 목록 문자열 배열.
14. registration: { platform: 'EVENTUS' | 'TICKETTACO' | 'OTHER', url: string, deadline?: string }.

반드시 zod EventPlan 스키마 규격에 완벽히 일치하는 순수 JSON으로만 응답하세요.`;

    let generatedPlan: EventPlan | null = null;

    try {
      const result = await generateText({
        prompt: `다음은 사용자와 나눈 행사 기획 대화 기록입니다:\n\n${conversationText}\n\n위 대화의 내용을 바탕으로 완성된 EventPlan JSON을 생성해주세요.`,
        systemInstruction,
        config: {
          responseMimeType: 'application/json',
          responseSchema: z.toJSONSchema(EventPlanSchema),
          temperature: 0.3,
        },
      });

      if (result.text) {
        const parsedJson = JSON.parse(result.text);
        generatedPlan = EventPlanSchema.parse(parsedJson);
      }
    } catch {
      // API 키 미설정 또는 Gemini 호출 실패 시 대화 내용을 바탕으로 안전한 스마트 폴백 생성
      generatedPlan = createFallbackPlan(messages);
    }

    if (!generatedPlan) {
      generatedPlan = samplePlan;
    }

    return NextResponse.json({
      success: true,
      plan: generatedPlan,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '기획서 생성 중 오류가 발생했습니다.';
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

/**
 * Gemini 호출이 실패하거나 오프라인 환경일 때 대화 텍스트에서 주요 키워드를 추출하여
 * 유효한 EventPlan으로 변환하는 스마트 폴백
 */
function createFallbackPlan(messages: ChatMessage[]): EventPlan {
  const allUserText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ');

  let detectedTheme: 'BUILD_WITH_AI' | 'IO_EXTENDED' | 'DEVFEST' = 'BUILD_WITH_AI';
  if (/i\/?o|extended|해커톤/i.test(allUserText)) {
    detectedTheme = 'IO_EXTENDED';
  } else if (/devfest|데브페스트/i.test(allUserText)) {
    detectedTheme = 'DEVFEST';
  }

  const base = structuredClone(samplePlan);
  base.theme = detectedTheme;

  // 제목 감지 시도
  const titleMatch = allUserText.match(/(?:행사명|이름|제목)[은는이가: ]+([^\n,.!?]+)/);
  if (titleMatch?.[1]?.trim()) {
    base.title = titleMatch[1].trim();
  }

  // 장소 감지 시도
  const venueMatch = allUserText.match(/(?:장소|위치)[은는이가: ]+([^\n,.!?]+)/);
  if (venueMatch?.[1]?.trim()) {
    base.venue = venueMatch[1].trim();
  }

  return base;
}

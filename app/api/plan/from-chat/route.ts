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
  attachedAssets: z
    .object({
      logoUrl: z.string().optional(),
      keyVisualUrl: z.string().optional(),
    })
    .optional(),
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

    const systemInstruction = `당신은 GDG 행사를 기획하는 Google AI 어시스턴트(Gemini 4)입니다.
사용자와 나눈 대화 기록을 꼼꼼하게 분석하여 GDG 브랜드킷 생성을 위한 'EventPlan' JSON 객체를 만드세요.

[필수 요구사항]
1. theme: 'BUILD_WITH_AI' | 'IO_EXTENDED' | 'DEVFEST' 중 대화에 가장 잘 어울리는 것을 선택하세요.
2. year: 행사 연도 문자열 (예: '2026'). 대화에 명시되지 않았다면 '2026' 사용.
3. title: 사용자가 언급한 행사 공식 명칭 또는 주제.
4. hostName: 주최 단체 (기본값: 'GDG'). 'GDG Campus Korea'는 쓰지 말고 'GDG'를 사용하세요.
5. hook: 호기심을 끄는 한 줄 후킹 문구.
6. description: 행사의 목적과 분위기를 담은 소개글 (2~3줄).
7. date: 행사 일자 (YYYY-MM-DD 형식).
8. startTime / endTime: 시작 및 종료 시간 (HH:mm 형식, 예: '13:00', '18:00').
9. venue: 사용자가 입력한 행사 진행 장소.
10. capacity: 참가자 정원 숫자 (기본값: 150~200).
11. schedule: 대화에서 언급된 타임테이블 배열 ({ start, end, title, note, highlight }).
12. speakers: 대화에서 언급된 연사 목록 배열 ({ name, affiliation, sessionTitle, summary, kind: 'HANDS_ON' | 'SESSION' }).
13. perks: 참가자 혜택 목록 문자열 배열.
14. registration: { platform: 'EVENTUS' | 'TICKETTACO' | 'OTHER', url: string, deadline?: string }.

반드시 사용자가 대화에서 입력한 사실(행사명, 일시, 장소, 프로그램, 연사, 혜택)을 최우선으로 반영하고, zod EventPlan 스키마 규격에 완벽히 일치하는 순수 JSON으로만 응답하세요.`;

    let generatedPlan: EventPlan | null = null;

    try {
      const result = await generateText({
        model: 'gemini-4',
        prompt: `다음은 사용자와 나눈 행사 기획 대화 기록입니다:\n\n${conversationText}\n\n위 대화에서 사용자가 입력한 모든 내용을 빠짐없이 반영하여 EventPlan JSON을 생성해주세요.`,
        systemInstruction,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: z.toJSONSchema(EventPlanSchema),
          temperature: 0.2,
        },
      });

      if (result.text) {
        const parsedJson = JSON.parse(result.text);
        if (
          typeof parsedJson.hostName === 'string' &&
          parsedJson.hostName.includes('GDG Campus Korea')
        ) {
          parsedJson.hostName = 'GDG';
        }
        generatedPlan = EventPlanSchema.parse(parsedJson);
      }
    } catch {
      generatedPlan = null;
    }

    // 대화 내용을 기반으로 사용자가 직접 입력한 항목들을 추출하여 보강/폴백
    const source: 'gemini' | 'chat-extract' = generatedPlan ? 'gemini' : 'chat-extract';
    const extractedFromChat = extractPlanFromChatMessages(messages);
    if (!generatedPlan) {
      generatedPlan = extractedFromChat;
    } else {
      generatedPlan = mergeUserFactsIntoPlan(generatedPlan, extractedFromChat, messages);
    }

    if (parsedBody.data.attachedAssets) {
      generatedPlan = {
        ...generatedPlan,
        designAssets: {
          ...generatedPlan.designAssets,
          ...(parsedBody.data.attachedAssets.logoUrl
            ? { logoUrl: parsedBody.data.attachedAssets.logoUrl }
            : {}),
          ...(parsedBody.data.attachedAssets.keyVisualUrl
            ? { keyVisualUrl: parsedBody.data.attachedAssets.keyVisualUrl }
            : {}),
        },
      };
    }

    return NextResponse.json({
      success: true,
      plan: generatedPlan,
      source,
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
 * 터미널 대화의 단계별 사용자 응답(테마/제목, 일시/장소, 프로그램/세션, 연사, 혜택 등)을
 * 정확하게 파싱하여 EventPlan으로 변환합니다.
 */
function extractPlanFromChatMessages(messages: ChatMessage[]): EventPlan {
  const userMessages = messages
    .filter((m) => m.role === 'user' && !m.content.startsWith('['))
    .map((m) => m.content.trim());

  const allUserText = userMessages.join(' \n ');
  const base = structuredClone(samplePlan);
  base.hostName = 'GDG';
  base.sponsors = ['Google Developers', 'GDG'];

  // 1. 테마 & 행사명 (첫 번째 사용자 응답 또는 키워드)
  if (/i\/?o|extended|해커톤/i.test(allUserText)) {
    base.theme = 'IO_EXTENDED';
  } else if (/devfest|데브페스트/i.test(allUserText)) {
    base.theme = 'DEVFEST';
  } else {
    base.theme = 'BUILD_WITH_AI';
  }

  if (userMessages[0]) {
    const firstMsg = userMessages[0];
    if (!firstMsg.includes('샘플 데이터')) {
      base.title = firstMsg;
      base.hook = `${firstMsg}에서 함께 성장해요!`;
      base.description = `GDG가 주최하는 ${firstMsg} 행사입니다. 개발자들과 함께 최신 기술을 실습하고 네트워킹을 경험해 보세요.`;
    }
  }

  // 2. 일시 & 장소 (두 번째 사용자 응답 또는 전체 텍스트 정규식)
  const dateIsoMatch = allUserText.match(/(202\d)[년.\-/ ]+(\d{1,2})[월.\-/ ]+(\d{1,2})/);
  if (dateIsoMatch) {
    const y = dateIsoMatch[1];
    const m = dateIsoMatch[2].padStart(2, '0');
    const d = dateIsoMatch[3].padStart(2, '0');
    base.year = y;
    base.date = `${y}-${m}-${d}`;
  } else {
    const mdMatch = allUserText.match(/(\d{1,2})월\s*(\d{1,2})일/);
    if (mdMatch) {
      const m = mdMatch[1].padStart(2, '0');
      const d = mdMatch[2].padStart(2, '0');
      base.date = `${base.year}-${m}-${d}`;
    }
  }

  const timeRangeMatch = allUserText.match(/(\d{1,2}:\d{2})\s*[~-]\s*(\d{1,2}:\d{2})/);
  if (timeRangeMatch) {
    base.startTime = timeRangeMatch[1].padStart(5, '0');
    base.endTime = timeRangeMatch[2].padStart(5, '0');
  } else {
    const singleTimeMatch = allUserText.match(/(\d{1,2}:\d{2})/);
    if (singleTimeMatch) {
      base.startTime = singleTimeMatch[1].padStart(5, '0');
    }
  }

  if (userMessages[1]) {
    const secondMsg = userMessages[1];
    // 쉼표 뒤 장소 추출 또는 날짜/시간 제거 후 장소 추출
    const parts = secondMsg.split(/[,/]/).map((s) => s.trim()).filter(Boolean);
    const cleanedVenue = (parts.length > 1 ? parts[parts.length - 1] : secondMsg)
      .replace(/202\d[년.\-/ ]+\d{1,2}[월.\-/ ]+\d{1,2}일?/g, '')
      .replace(/\d{1,2}월\s*\d{1,2}일/g, '')
      .replace(/\d{1,2}:\d{2}\s*[~-]\s*\d{1,2}:\d{2}/g, '')
      .replace(/\d{1,2}:\d{2}/g, '')
      .replace(/^[,.\s]+|[,.\s]+$/g, '')
      .trim();
    if (cleanedVenue) {
      base.venue = cleanedVenue;
    }
  }

  // 3. 타임테이블 / 프로그램 구성 (세 번째 사용자 응답)
  if (userMessages[2]) {
    const thirdMsg = userMessages[2];
    base.programSummary = thirdMsg;
    const sessionItems = thirdMsg
      .split(/[,/·\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sessionItems.length > 0) {
      const startHour = parseInt(base.startTime.split(':')[0] || '13', 10);
      base.schedule = sessionItems.map((title, idx) => {
        const sH = String(Math.min(22, startHour + idx)).padStart(2, '0');
        const eH = String(Math.min(23, startHour + idx + 1)).padStart(2, '0');
        return {
          start: `${sH}:00`,
          end: `${eH}:00`,
          title,
          note: idx === 0 ? 'Main Hall' : 'GDG Session',
          highlight: idx < 2,
        };
      });
    }
  }

  // 4. 연사 정보 (네 번째 사용자 응답)
  if (userMessages[3]) {
    const fourthMsg = userMessages[3];
    if (!fourthMsg.includes('미정')) {
      const speakerChunks = fourthMsg
        .split(/[,/\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (speakerChunks.length > 0) {
        base.speakers = speakerChunks.map((chunk, idx) => ({
          name: chunk,
          affiliation: 'GDG Speaker',
          sessionTitle: base.schedule[idx]?.title || `${base.title} 주요 세션 ${idx + 1}`,
          summary: `${chunk} 연사가 진행하는 실전 인사이트 세션입니다.`,
          kind: idx % 2 === 0 ? 'HANDS_ON' : 'SESSION',
        }));
      }
    }
  }

  // 5. 참가 혜택 등 (다섯 번째 이후 사용자 응답)
  for (const msg of userMessages.slice(4)) {
    if (msg.includes('혜택') || msg.includes('굿즈') || msg.includes('간식') || msg.includes('크레딧')) {
      const cleaned = msg.replace(/^참가\s*혜택\s*:\s*/i, '');
      const perks = cleaned
        .split(/[,/·]/)
        .map((s) => s.replace(/추가$/, '').trim())
        .filter(Boolean);
      if (perks.length > 0) {
        base.perks = perks;
      }
    }
  }

  return base;
}

function mergeUserFactsIntoPlan(
  geminiPlan: EventPlan,
  extracted: EventPlan,
  messages: ChatMessage[],
): EventPlan {
  const userMessages = messages
    .filter((m) => m.role === 'user' && !m.content.startsWith('['))
    .map((m) => m.content.trim());

  const merged = { ...geminiPlan, hostName: 'GDG' };
  if (userMessages[0] && (!merged.title || merged.title === samplePlan.title)) {
    merged.title = extracted.title;
  }
  if (userMessages[1] && (!merged.venue || merged.venue === samplePlan.venue)) {
    merged.venue = extracted.venue;
  }
  return merged;
}

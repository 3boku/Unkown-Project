import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "@/lib/gemini/service";
import {
  type BrandColorSchema,
  CardSlideSchema,
  EventPlanSchema,
  ReelSchema,
  ThumbnailCopySchema,
} from "@/lib/schema";
import {
  isFactMutationInstruction,
  refineSnsCopy,
} from "@/lib/sns/service";

const RefineRequestSchema = z.object({
  target: z
    .string()
    .regex(/^(thumbnail|cards|reel|sns|cards\.\d+)$/, "지원하지 않는 target입니다."),
  instruction: z.string().min(1, "수정 지시(instruction)를 입력해 주세요."),
  current: z.unknown(),
  plan: EventPlanSchema,
});

function detectAccentColor(
  instruction: string
): z.infer<typeof BrandColorSchema> | undefined {
  if (/(빨강|빨간|레드|red)/i.test(instruction)) return "red";
  if (/(노랑|노란|옐로|yellow)/i.test(instruction)) return "yellow";
  if (/(초록|그린|green)/i.test(instruction)) return "green";
  if (/(파랑|파란|블루|blue)/i.test(instruction)) return "blue";
  return undefined;
}

function detectEmphasis(instruction: string): "calm" | "bold" | undefined {
  if (/(차분|담백|조용|calm)/i.test(instruction)) return "calm";
  if (/(강렬|굵게|강조|임팩트|bold)/i.test(instruction)) return "bold";
  return undefined;
}

function applyDeterministicStyleAndText(
  current: unknown,
  instruction: string
): unknown {
  if (!current || typeof current !== "object") return current;
  const clone = structuredClone(current) as Record<string, unknown>;

  const accent = detectAccentColor(instruction);
  const emphasis = detectEmphasis(instruction);
  if (clone.style && typeof clone.style === "object") {
    const styleObj = { ...(clone.style as Record<string, unknown>) };
    if (accent) styleObj.accent = accent;
    if (emphasis) styleObj.emphasis = emphasis;
    if (/(레이아웃\s*b|layout\s*b)/i.test(instruction)) styleObj.layout = "B";
    if (/(레이아웃\s*a|layout\s*a)/i.test(instruction)) styleObj.layout = "A";
    clone.style = styleObj;
  }

  if (/(짧게|간결|줄여|요약)/i.test(instruction)) {
    for (const key of ["headline", "title", "hookTitle", "subline"]) {
      if (typeof clone[key] === "string") {
        const val = clone[key] as string;
        const firstLine = val.split("\n")[0]?.trim() || val;
        clone[key] =
          firstLine.length > 18 ? firstLine.slice(0, 18).trim() : firstLine;
      }
    }
  }

  return clone;
}

async function refineWithSchema<T>(params: {
  targetLabel: string;
  schema: z.ZodType<T>;
  current: unknown;
  instruction: string;
  plan: z.infer<typeof EventPlanSchema>;
  fallbackFn: () => T;
}): Promise<T> {
  const { targetLabel, schema, current, instruction, plan, fallbackFn } = params;

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return fallbackFn();
  }

  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  const systemInstruction = [
    `당신은 GDG Campus Korea 브랜드킷 스튜디오의 ${targetLabel} 부분 수정 에이전트입니다.`,
    "현재 산출물(current)을 사용자의 수정 지시(instruction)에 맞게 다듬어 JSON으로 반환하세요.",
    "행사 일시·장소·연사·타임테이블 등 사실(EventPlan)은 절대 바꾸지 마세요.",
    "색상(style.accent)은 반드시 blue, red, yellow, green 중 하나만 사용하세요.",
  ].join("\n");

  const basePrompt = JSON.stringify(
    {
      instruction,
      planFacts: {
        title: plan.title,
        year: plan.year,
        date: plan.date,
        startTime: plan.startTime,
        endTime: plan.endTime,
        venue: plan.venue,
        programSummary: plan.programSummary,
      },
      current,
    },
    null,
    2
  );

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const prompt =
        attempt === 0
          ? basePrompt
          : `${basePrompt}\n\n[이전 응답 스키마 검증 실패 — 수정 필요]: ${
              lastError instanceof Error ? lastError.message : String(lastError)
            }`;

      const res = await generateText({
        prompt,
        systemInstruction,
        config: {
          temperature: 0.4,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
        },
      });
      return schema.parse(JSON.parse(res.text));
    } catch (err) {
      lastError = err;
    }
  }

  return fallbackFn();
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const parsedReq = RefineRequestSchema.safeParse(rawBody);

    if (!parsedReq.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "요청 형식이 올바르지 않습니다.",
          details: parsedReq.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { target, instruction, current, plan } = parsedReq.data;

    if (isFactMutationInstruction(instruction)) {
      return NextResponse.json(
        {
          ok: false,
          code: "FACT_CHANGE_FORBIDDEN",
          error:
            "일시·장소·연사 등 행사 사실 정보는 좌측 기획서 폼에서 수정해 주세요.",
          data: current,
        },
        { status: 422 }
      );
    }

    if (target === "sns") {
      const refinedSns = await refineSnsCopy({
        plan,
        current,
        instruction,
      });
      return NextResponse.json({
        ok: true,
        target,
        data: refinedSns,
        sns: refinedSns,
      });
    }

    if (target === "thumbnail") {
      const data = await refineWithSchema({
        targetLabel: "티켓팅 썸네일",
        schema: ThumbnailCopySchema,
        current,
        instruction,
        plan,
        fallbackFn: () =>
          ThumbnailCopySchema.parse(
            applyDeterministicStyleAndText(current, instruction)
          ),
      });
      return NextResponse.json({ ok: true, target, data });
    }

    if (target.startsWith("cards.")) {
      const data = await refineWithSchema({
        targetLabel: `카드뉴스 슬라이드 (${target})`,
        schema: CardSlideSchema,
        current,
        instruction,
        plan,
        fallbackFn: () =>
          CardSlideSchema.parse(
            applyDeterministicStyleAndText(current, instruction)
          ),
      });
      return NextResponse.json({ ok: true, target, data });
    }

    if (target === "cards") {
      const CardsArraySchema = z.array(CardSlideSchema);
      const data = await refineWithSchema({
        targetLabel: "카드뉴스 전체 세트",
        schema: CardsArraySchema,
        current,
        instruction,
        plan,
        fallbackFn: () => {
          const arr = Array.isArray(current) ? current : [];
          return CardsArraySchema.parse(
            arr.map((slide) =>
              applyDeterministicStyleAndText(slide, instruction)
            )
          );
        },
      });
      return NextResponse.json({ ok: true, target, data });
    }

    if (target === "reel") {
      const data = await refineWithSchema({
        targetLabel: "릴스 구성",
        schema: ReelSchema,
        current,
        instruction,
        plan,
        fallbackFn: () => ReelSchema.parse(current),
      });
      return NextResponse.json({ ok: true, target, data });
    }

    return NextResponse.json(
      { ok: false, error: `지원하지 않는 target입니다: ${target}` },
      { status: 400 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "부분 수정 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

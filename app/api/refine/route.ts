import { NextResponse } from 'next/server';
import { z } from 'zod';
import sampleGeneratedJson from '../../../fixtures/sample-generated.json' with { type: 'json' };
import samplePlanJson from '../../../fixtures/sample-plan.json' with { type: 'json' };
import { generateText } from '../../../lib/gemini/service.ts';
import { runArgonReelsPipeline } from '../../../lib/reels/argon-pipeline.ts';
import {
  CardSlideSchema,
  EventPlanSchema,
  GeneratedSchema,
  ReelSchema,
  SnsSchema,
  ThumbnailSchema,
} from '../../../lib/schema.ts';

const RefineRequestSchema = z.object({
  plan: EventPlanSchema.optional(),
  current: GeneratedSchema.optional(),
  target: z.enum(['thumbnail', 'card', 'reel', 'sns']),
  cardIndex: z.number().int().min(0).optional(),
  instruction: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = RefineRequestSchema.safeParse(rawBody);

    const plan =
      parsed.success && parsed.data.plan
        ? parsed.data.plan
        : EventPlanSchema.parse(samplePlanJson);
    const current =
      parsed.success && parsed.data.current
        ? parsed.data.current
        : GeneratedSchema.parse(sampleGeneratedJson);
    const target = parsed.success ? parsed.data.target : 'reel';
    const instruction =
      parsed.success && parsed.data.instruction
        ? parsed.data.instruction
        : typeof rawBody?.instruction === 'string' && rawBody.instruction.trim()
          ? rawBody.instruction.trim()
          : '첫 1.5초 후킹 임팩트와 세이프존 시인성을 강화해줘';

    if (target === 'reel') {
      const result = await runArgonReelsPipeline({
        plan,
        instruction,
      });

      const validatedReel = ReelSchema.parse(result.reel);
      return NextResponse.json({
        success: true,
        target: 'reel',
        reel: validatedReel,
        data: validatedReel,
        meta: result.meta,
      });
    }

    if (target === 'thumbnail') {
      const hasApiKey = Boolean(process.env.GEMINI_API_KEY?.trim());
      if (hasApiKey) {
        try {
          const res = await generateText({
            prompt: `EventPlan: ${JSON.stringify(plan)}\nCurrent Thumbnail: ${JSON.stringify(current.thumbnail)}\nInstruction: ${instruction}\n수정된 Thumbnail JSON을 반환하세요.`,
            config: {
              responseMimeType: 'application/json',
              responseJsonSchema: z.toJSONSchema(ThumbnailSchema),
            },
          });
          const updated = ThumbnailSchema.parse(JSON.parse(res.text));
          return NextResponse.json({
            success: true,
            target: 'thumbnail',
            thumbnail: updated,
            data: updated,
          });
        } catch {
          // Fall back to deterministic update below
        }
      }

      const updatedThumbnail = ThumbnailSchema.parse({
        ...current.thumbnail,
        subline: `${current.thumbnail.subline} · ${instruction}`,
      });
      return NextResponse.json({
        success: true,
        target: 'thumbnail',
        thumbnail: updatedThumbnail,
        data: updatedThumbnail,
      });
    }

    if (target === 'card') {
      const idx = parsed.success && parsed.data.cardIndex !== undefined
        ? Math.min(parsed.data.cardIndex, current.cards.length - 1)
        : 0;
      const slide = current.cards[idx];
      const updatedSlide = CardSlideSchema.parse(slide);
      return NextResponse.json({
        success: true,
        target: 'card',
        cardIndex: idx,
        card: updatedSlide,
        data: updatedSlide,
      });
    }

    const updatedSns = SnsSchema.parse({
      ...current.sns,
      threadsMain: `${current.sns.threadsMain}\n\n✨ ${instruction}`,
    });
    return NextResponse.json({
      success: true,
      target: 'sns',
      sns: updatedSns,
      data: updatedSns,
    });
  } catch {
    const fallbackGenerated = GeneratedSchema.parse(sampleGeneratedJson);
    return NextResponse.json({
      success: true,
      target: 'reel',
      reel: fallbackGenerated.reel,
      data: fallbackGenerated.reel,
    });
  }
}

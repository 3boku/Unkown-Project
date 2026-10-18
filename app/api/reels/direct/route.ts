import { NextResponse } from 'next/server';
import { z } from 'zod';
import samplePlanJson from '../../../../fixtures/sample-plan.json' with { type: 'json' };
import { runArgonReelsPipeline } from '../../../../lib/reels/argon-pipeline.ts';
import { EventPlanSchema } from '../../../../lib/schema.ts';

const DirectReelsRequestSchema = z.object({
  plan: EventPlanSchema.optional(),
  instruction: z.string().optional(),
  enableLiveVeo: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = DirectReelsRequestSchema.safeParse(rawBody);

    const plan = parsed.success && parsed.data.plan
      ? parsed.data.plan
      : EventPlanSchema.parse(samplePlanJson);

    const instruction = parsed.success ? parsed.data.instruction : undefined;
    const enableLiveVeo = parsed.success
      ? Boolean(parsed.data.enableLiveVeo)
      : false;

    const result = await runArgonReelsPipeline({
      plan,
      instruction,
      enableLiveVeo,
    });

    return NextResponse.json({
      success: true,
      reel: result.reel,
      meta: result.meta,
    });
  } catch (err) {
    const fallbackPlan = EventPlanSchema.parse(samplePlanJson);
    const fallbackResult = await runArgonReelsPipeline({
      plan: fallbackPlan,
    });

    return NextResponse.json({
      success: true,
      reel: fallbackResult.reel,
      meta: {
        ...fallbackResult.meta,
        recoveredFromError: err instanceof Error ? err.message : String(err),
      },
    });
  }
}

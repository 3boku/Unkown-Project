import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { renderCardSlidePng } from '../../../../components/templates/CardNewsTemplate.tsx';
import {
  CardSlideSchema,
  EventPlanSchema,
  GeneratedSchema,
} from '../../../../lib/schema.ts';
import { normalizeCardSlidesForPlan } from '../../../../lib/speaker-photo.ts';

const CardRenderRequestSchema = z.union([
  z.object({
    plan: EventPlanSchema,
    slide: CardSlideSchema,
    slideIndex: z.number().int().min(0).optional(),
    totalSlides: z.number().int().min(1).optional(),
  }),
  z.object({
    plan: EventPlanSchema,
    cards: z.array(CardSlideSchema).min(1),
    slideIndex: z.number().int().min(0).default(0),
  }),
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ kind: string }> }
): Promise<Response> {
  const { kind } = await context.params;

  if (kind !== 'card') {
    return NextResponse.json(
      {
        error: `Unsupported render kind '${kind}'. Supported kind: 'card'.`,
      },
      { status: 400 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  const parsed = CardRenderRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed for card render request.',
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if ('slide' in data) {
    return renderCardSlidePng(data.plan, data.slide, {
      slideIndex: data.slideIndex,
      totalSlides: data.totalSlides,
    });
  }

  const normalizedCards = normalizeCardSlidesForPlan(data.plan, data.cards);
  const clampedIndex = Math.min(
    Math.max(0, data.slideIndex),
    normalizedCards.length - 1
  );
  return renderCardSlidePng(data.plan, normalizedCards[clampedIndex], {
    slideIndex: clampedIndex,
    totalSlides: normalizedCards.length,
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ kind: string }> }
): Promise<Response> {
  const { kind } = await context.params;

  if (kind !== 'card') {
    return NextResponse.json(
      {
        error: `Unsupported render kind '${kind}'. Supported kind: 'card'.`,
      },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const indexParam = Number(url.searchParams.get('index') ?? '0');

  const rootDir = process.cwd();
  const [rawPlan, rawGen] = await Promise.all([
    fs.readFile(path.join(rootDir, 'fixtures', 'sample-plan.json'), 'utf-8'),
    fs.readFile(
      path.join(rootDir, 'fixtures', 'sample-generated.json'),
      'utf-8'
    ),
  ]);

  const plan = EventPlanSchema.parse(JSON.parse(rawPlan));
  const generated = GeneratedSchema.parse(JSON.parse(rawGen));
  const normalizedCards = normalizeCardSlidesForPlan(plan, generated.cards);
  const safeIndex =
    Number.isFinite(indexParam) && indexParam >= 0
      ? Math.min(Math.floor(indexParam), normalizedCards.length - 1)
      : 0;

  return renderCardSlidePng(plan, normalizedCards[safeIndex], {
    slideIndex: safeIndex,
    totalSlides: normalizedCards.length,
  });
}

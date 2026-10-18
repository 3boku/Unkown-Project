import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { renderCardSlidePng } from '../../../../components/templates/CardNewsTemplate.tsx';
import {
  type CardSlide,
  CardSlideSchema,
  type EventPlan,
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
    filename: z.string().optional(),
  }),
  z.object({
    plan: EventPlanSchema,
    cards: z.array(CardSlideSchema).min(1),
    slideIndex: z.number().int().min(0).default(0),
    filename: z.string().optional(),
  }),
]);

function buildSafeFilename(
  slide: CardSlide,
  slideIndex?: number,
  customFilename?: string
): string {
  if (customFilename) {
    const cleaned = customFilename.replace(/[^a-zA-Z0-9._-]/g, '-');
    return cleaned.endsWith('.png') ? cleaned : `${cleaned}.png`;
  }
  const num = String((slideIndex ?? 0) + 1).padStart(2, '0');
  const typeSlug = slide.type.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `gdg-card-${num}-${typeSlug}.png`;
}

async function toPngHttpResponse(
  plan: EventPlan,
  slide: CardSlide,
  options: {
    slideIndex?: number;
    totalSlides?: number;
    isDownload?: boolean;
    filename?: string;
  }
): Promise<Response> {
  const imageRes = await renderCardSlidePng(plan, slide, {
    slideIndex: options.slideIndex,
    totalSlides: options.totalSlides,
  });

  const arrayBuffer = await imageRes.arrayBuffer();
  const safeFilename = buildSafeFilename(
    slide,
    options.slideIndex,
    options.filename
  );

  const headers = new Headers({
    'Content-Type': 'image/png',
    'Content-Length': String(arrayBuffer.byteLength),
    'Cache-Control': 'no-store',
  });

  if (options.isDownload) {
    headers.set(
      'Content-Disposition',
      `attachment; filename="${safeFilename}"`
    );
  } else {
    headers.set('Content-Disposition', `inline; filename="${safeFilename}"`);
  }

  return new Response(arrayBuffer, {
    status: 200,
    headers,
  });
}

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

  const url = new URL(request.url);
  const isDownload = url.searchParams.get('download') === '1';
  const contentType = (request.headers.get('content-type') || '').toLowerCase();

  let rawBody: unknown;
  try {
    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await request.formData();
      const payload = formData.get('payload');
      if (typeof payload !== 'string' || !payload.trim()) {
        return NextResponse.json(
          { error: 'Missing form payload field.' },
          { status: 400 }
        );
      }
      rawBody = JSON.parse(payload);
    } else {
      rawBody = await request.json();
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
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
    return toPngHttpResponse(data.plan, data.slide, {
      slideIndex: data.slideIndex,
      totalSlides: data.totalSlides,
      isDownload,
      filename: data.filename,
    });
  }

  const normalizedCards = normalizeCardSlidesForPlan(data.plan, data.cards);
  const clampedIndex = Math.min(
    Math.max(0, data.slideIndex),
    normalizedCards.length - 1
  );
  return toPngHttpResponse(data.plan, normalizedCards[clampedIndex], {
    slideIndex: clampedIndex,
    totalSlides: normalizedCards.length,
    isDownload,
    filename: data.filename,
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
  const isDownload = url.searchParams.get('download') === '1';
  const customFilename = url.searchParams.get('filename') ?? undefined;

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

  return toPngHttpResponse(plan, normalizedCards[safeIndex], {
    slideIndex: safeIndex,
    totalSlides: normalizedCards.length,
    isDownload,
    filename: customFilename,
  });
}

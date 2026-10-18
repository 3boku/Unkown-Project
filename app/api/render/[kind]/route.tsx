import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { renderCardSlidePng } from '../../../../components/templates/CardNewsTemplate.tsx';
import {
  renderThumbnailPng,
  THUMBNAIL_SPECS,
  type ThumbnailPlatform,
} from '../../../../components/templates/ThumbnailTemplate.tsx';
import {
  type CardSlide,
  CardSlideSchema,
  type EventPlan,
  EventPlanSchema,
  GeneratedSchema,
  type Thumbnail,
  ThumbnailSchema,
} from '../../../../lib/schema.ts';
import { normalizeCardSlidesForPlan } from '../../../../lib/speaker-photo.ts';

const ThumbnailPlatformSchema = z.enum(['EVENTUS', 'TICKETTACO']);

const ThumbnailRenderRequestSchema = z.object({
  plan: EventPlanSchema,
  thumbnail: ThumbnailSchema.optional(),
  platform: ThumbnailPlatformSchema.optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  filename: z.string().optional(),
});

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

function sanitizePngFilename(rawName: string): string {
  const cleaned = rawName.replace(/[^a-zA-Z0-9._-]/g, '-');
  return cleaned.endsWith('.png') ? cleaned : `${cleaned}.png`;
}

function buildSafeCardFilename(
  slide: CardSlide,
  slideIndex?: number,
  customFilename?: string
): string {
  if (customFilename) {
    return sanitizePngFilename(customFilename);
  }
  const num = String((slideIndex ?? 0) + 1).padStart(2, '0');
  const typeSlug = slide.type.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `gdg-card-${num}-${typeSlug}.png`;
}

function buildSafeThumbnailFilename(
  platform: ThumbnailPlatform,
  width: number,
  height: number,
  customFilename?: string
): string {
  if (customFilename) {
    return sanitizePngFilename(customFilename);
  }
  return `gdg-thumbnail-${platform.toLowerCase()}-${width}x${height}.png`;
}

function createPngHttpResponse(
  arrayBuffer: ArrayBuffer,
  safeFilename: string,
  isDownload?: boolean
): Response {
  const headers = new Headers({
    'Content-Type': 'image/png',
    'Content-Length': String(arrayBuffer.byteLength),
    'Cache-Control': 'no-store',
  });

  if (isDownload) {
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

async function toCardPngHttpResponse(
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
  const safeFilename = buildSafeCardFilename(
    slide,
    options.slideIndex,
    options.filename
  );

  return createPngHttpResponse(arrayBuffer, safeFilename, options.isDownload);
}

async function toThumbnailPngHttpResponse(
  plan: EventPlan,
  thumbnail: Thumbnail,
  options: {
    platform: ThumbnailPlatform;
    width?: number;
    height?: number;
    isDownload?: boolean;
    filename?: string;
  }
): Promise<Response> {
  const spec = THUMBNAIL_SPECS[options.platform] ?? THUMBNAIL_SPECS.EVENTUS;
  const width = options.width ?? spec.width;
  const height = options.height ?? spec.height;

  const imageRes = await renderThumbnailPng(plan, thumbnail, {
    platform: options.platform,
    width,
    height,
  });

  const arrayBuffer = await imageRes.arrayBuffer();
  const safeFilename = buildSafeThumbnailFilename(
    options.platform,
    width,
    height,
    options.filename
  );

  return createPngHttpResponse(arrayBuffer, safeFilename, options.isDownload);
}

async function parseRequestBody(request: Request): Promise<unknown> {
  const contentType = (request.headers.get('content-type') || '').toLowerCase();
  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await request.formData();
    const payload = formData.get('payload');
    if (typeof payload !== 'string' || !payload.trim()) {
      throw new Error('Missing form payload field.');
    }
    return JSON.parse(payload);
  }
  return request.json();
}

export async function POST(
  request: Request,
  context: { params: Promise<{ kind: string }> }
): Promise<Response> {
  const { kind } = await context.params;

  if (kind !== 'card' && kind !== 'thumbnail') {
    return NextResponse.json(
      {
        error: `Unsupported render kind '${kind}'. Supported kinds: 'thumbnail', 'card'.`,
      },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const isDownload = url.searchParams.get('download') === '1';

  let rawBody: unknown;
  try {
    rawBody = await parseRequestBody(request);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error && err.message === 'Missing form payload field.'
            ? err.message
            : 'Invalid request body.',
      },
      { status: 400 }
    );
  }

  if (kind === 'thumbnail') {
    const parsed = ThumbnailRenderRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed for thumbnail render request.',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { plan, width, height, filename } = parsed.data;
    const queryPlatform = url.searchParams.get('platform')?.toUpperCase();
    const platform: ThumbnailPlatform =
      parsed.data.platform ??
      (queryPlatform === 'TICKETTACO' ? 'TICKETTACO' : 'EVENTUS');

    const thumbnail: Thumbnail = parsed.data.thumbnail ?? {
      headline: plan.title,
      subline: plan.hook || `${plan.date} · ${plan.venue}`,
      style: {
        accent: 'blue',
        layout: 'A',
        emphasis: 'bold',
      },
    };

    return toThumbnailPngHttpResponse(plan, thumbnail, {
      platform,
      width,
      height,
      isDownload,
      filename,
    });
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
    return toCardPngHttpResponse(data.plan, data.slide, {
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
  return toCardPngHttpResponse(data.plan, normalizedCards[clampedIndex], {
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

  if (kind !== 'card' && kind !== 'thumbnail') {
    return NextResponse.json(
      {
        error: `Unsupported render kind '${kind}'. Supported kinds: 'thumbnail', 'card'.`,
      },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
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

  if (kind === 'thumbnail') {
    const queryPlatform = url.searchParams.get('platform')?.toUpperCase();
    const platform: ThumbnailPlatform =
      queryPlatform === 'TICKETTACO' ? 'TICKETTACO' : 'EVENTUS';

    return toThumbnailPngHttpResponse(plan, generated.thumbnail, {
      platform,
      isDownload,
      filename: customFilename,
    });
  }

  const indexParam = Number(url.searchParams.get('index') ?? '0');
  const normalizedCards = normalizeCardSlidesForPlan(plan, generated.cards);
  const safeIndex =
    Number.isFinite(indexParam) && indexParam >= 0
      ? Math.min(Math.floor(indexParam), normalizedCards.length - 1)
      : 0;

  return toCardPngHttpResponse(plan, normalizedCards[safeIndex], {
    slideIndex: safeIndex,
    totalSlides: normalizedCards.length,
    isDownload,
    filename: customFilename,
  });
}

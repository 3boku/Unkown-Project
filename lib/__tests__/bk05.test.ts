import assert from 'node:assert/strict';
import fs from 'node:fs';
import nodeModule from 'node:module';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { EventPlanSchema, GeneratedSchema } from '../schema.ts';
import {
  normalizeCardSlidesForPlan,
  resolvePlanSpeakerPhotos,
} from '../speaker-photo.ts';

type ResolveFn = (
  specifier: string,
  context: Record<string, unknown>
) => { url: string; format?: string; shortCircuit?: boolean };

type LoadFn = (
  url: string,
  context: Record<string, unknown>
) => { format: string; shortCircuit?: boolean; source: string | ArrayBuffer };

const modWithHooks = nodeModule as typeof nodeModule & {
  registerHooks?: (hooks: {
    resolve?: (
      specifier: string,
      context: Record<string, unknown>,
      nextResolve: ResolveFn
    ) => ReturnType<ResolveFn>;
    load?: (
      url: string,
      context: Record<string, unknown>,
      nextLoad: LoadFn
    ) => ReturnType<LoadFn>;
  }) => void;
};

modWithHooks.registerHooks?.({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/og' || specifier === 'next/server') {
      return nextResolve(`${specifier}.js`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.tsx')) {
      const filePath = fileURLToPath(url);
      const source = fs.readFileSync(filePath, 'utf-8');
      const transpiled = ts.transpileModule(source, {
        fileName: filePath,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      });
      return {
        format: 'module',
        shortCircuit: true,
        source: transpiled.outputText,
      };
    }
    return nextLoad(url, context);
  },
});

const { POST } = await import('../../app/api/render/[kind]/route.tsx');
const { renderCardSlidePng } = await import(
  '../../components/templates/CardNewsTemplate.tsx'
);

const ROOT_DIR = process.cwd();

function loadSampleFixtures() {
  const rawPlan = fs.readFileSync(
    path.join(ROOT_DIR, 'fixtures/sample-plan.json'),
    'utf-8'
  );
  const rawGenerated = fs.readFileSync(
    path.join(ROOT_DIR, 'fixtures/sample-generated.json'),
    'utf-8'
  );
  return {
    plan: EventPlanSchema.parse(JSON.parse(rawPlan)),
    generated: GeneratedSchema.parse(JSON.parse(rawGenerated)),
  };
}

/**
 * PNG 바이너리 시그니처와 IHDR 청크에서 width, height 픽셀 크기를 추출합니다.
 */
function parsePngDimensions(buffer: Buffer): { width: number; height: number } {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.deepEqual(
    buffer.subarray(0, 8),
    pngSignature,
    'Output must have valid PNG signature'
  );
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

describe('BK-05 Acceptance Criteria — 인스타 카드뉴스 세트 (1080x1350)', () => {
  it('renders every slide in sample-generated.json as a 1080x1350 PNG via POST /api/render/card', async () => {
    const { plan, generated } = loadSampleFixtures();

    for (let idx = 0; idx < generated.cards.length; idx++) {
      const slide = generated.cards[idx];
      const req = new Request('http://localhost:3000/api/render/card', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          plan,
          slide,
          slideIndex: idx,
          totalSlides: generated.cards.length,
        }),
      });

      const res = await POST(req, { params: Promise.resolve({ kind: 'card' }) });
      assert.equal(res.status, 200, `Slide ${idx} (${slide.type}) must return 200`);
      assert.ok(
        (res.headers.get('content-type') || '').includes('image/png'),
        'Content-Type must be image/png'
      );

      const buf = Buffer.from(await res.arrayBuffer());
      const { width, height } = parsePngDimensions(buf);
      assert.equal(width, 1080, `Slide ${slide.type} width must be 1080`);
      assert.equal(height, 1350, `Slide ${slide.type} height must be 1350`);
    }
  });

  it('renders TIMETABLE with 10 schedule rows including highlight rows without error', async () => {
    const { plan } = loadSampleFixtures();
    const tenRowsPlan = {
      ...plan,
      schedule: Array.from({ length: 10 }, (_, i) => ({
        start: `${String(9 + i).padStart(2, '0')}:00`,
        end: `${String(10 + i).padStart(2, '0')}:00`,
        title: `세션 및 핸즈온 트랙 ${i + 1}`,
        note: `정하상관 J30${(i % 5) + 1}`,
        highlight: i % 2 === 1,
      })),
    };

    const res = await renderCardSlidePng(
      tenRowsPlan,
      {
        type: 'TIMETABLE',
        title: 'Time Table',
        style: { accent: 'blue', layout: 'A', emphasis: 'calm' },
      },
      { slideIndex: 2, totalSlides: 7 }
    );

    const buf = Buffer.from(await res.arrayBuffer());
    const { width, height } = parsePngDimensions(buf);
    assert.equal(width, 1080);
    assert.equal(height, 1350);
  });

  it('splits SPEAKERS slides into at most 3 speakers per slide when speakers exceed 3', () => {
    const { plan } = loadSampleFixtures();
    const fiveHandsOnPlan = {
      ...plan,
      speakers: [
        ...plan.speakers.filter((s) => s.kind === 'HANDS_ON'),
        {
          name: '한지훈',
          affiliation: 'Cloud Engineer',
          sessionTitle: 'Vertex AI 에이전트 빌더 실습',
          summary: '노코드와 프로코드를 결합해 멀티 에이전트를 구축합니다.',
          kind: 'HANDS_ON' as const,
        },
        {
          name: '송지아',
          affiliation: 'ML Engineer',
          sessionTitle: 'Gemma 3 온디바이스 파인튜닝',
          summary: '가벼운 오픈 모델을 커스텀 데이터셋으로 튜닝합니다.',
          kind: 'HANDS_ON' as const,
        },
      ],
    };

    const normalized = normalizeCardSlidesForPlan(fiveHandsOnPlan, [
      {
        type: 'SPEAKERS',
        title: 'Hands-on Speakers',
        kind: 'HANDS_ON',
        speakerIndexes: [0, 1, 2],
        style: { accent: 'green', layout: 'A', emphasis: 'bold' },
      },
    ]);

    assert.equal(
      normalized.length,
      2,
      '5 HANDS_ON speakers must be split into 2 slides'
    );
    assert.equal(
      normalized[0].type === 'SPEAKERS' && normalized[0].speakerIndexes.length,
      3
    );
    assert.equal(
      normalized[1].type === 'SPEAKERS' && normalized[1].speakerIndexes.length,
      2
    );
  });

  it('falls back to speaker initial avatar when photoUrl is missing or broken', async () => {
    const { plan } = loadSampleFixtures();
    const brokenPhotoPlan = {
      ...plan,
      speakers: plan.speakers.map((s, idx) => ({
        ...s,
        photoUrl:
          idx === 0
            ? 'http://127.0.0.1:1/non-existent-speaker-photo.png'
            : undefined,
      })),
    };

    const safePlan = await resolvePlanSpeakerPhotos(brokenPhotoPlan);
    assert.equal(
      safePlan.speakers[0].photoUrl,
      undefined,
      'Unreachable photo URL must resolve to undefined for initial fallback'
    );

    const res = await renderCardSlidePng(safePlan, {
      type: 'SPEAKERS',
      title: 'Hands-on Speakers',
      kind: 'HANDS_ON',
      speakerIndexes: [0, 1, 2],
      style: { accent: 'green', layout: 'A', emphasis: 'bold' },
    });

    const buf = Buffer.from(await res.arrayBuffer());
    const { width, height } = parsePngDimensions(buf);
    assert.equal(width, 1080);
    assert.equal(height, 1350);
  });

  it('renders D_DAY slide and IO_EXTENDED / DEVFEST themes without error', async () => {
    const { plan } = loadSampleFixtures();

    for (const theme of ['BUILD_WITH_AI', 'IO_EXTENDED', 'DEVFEST'] as const) {
      const res = await renderCardSlidePng(
        { ...plan, theme },
        {
          type: 'D_DAY',
          daysLeft: 5,
          style: { accent: 'red', layout: 'A', emphasis: 'bold' },
        }
      );
      const buf = Buffer.from(await res.arrayBuffer());
      const { width, height } = parsePngDimensions(buf);
      assert.equal(width, 1080);
      assert.equal(height, 1350);
    }
  });

  it('contains no hardcoded hex color literals outside lib/tokens.ts', () => {
    const hexRegex = /#[0-9A-Fa-f]{6}\b/g;
    const dirsToScan = ['app', 'components', 'lib'];
    const violations: string[] = [];

    function walk(dirPath: string) {
      if (!fs.existsSync(dirPath)) return;
      for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
          const relPath = path.relative(ROOT_DIR, fullPath);
          if (relPath === 'lib/tokens.ts') continue;
          const content = fs.readFileSync(fullPath, 'utf-8');
          const matches = content.match(hexRegex);
          if (matches) {
            violations.push(`${relPath}: ${matches.join(', ')}`);
          }
        }
      }
    }

    dirsToScan.forEach((d) => walk(path.join(ROOT_DIR, d)));
    assert.deepEqual(
      violations,
      [],
      `Found hex literals outside lib/tokens.ts: ${violations.join('; ')}`
    );
  });

  it('supports form-POST download with Content-Disposition: attachment header', async () => {
    const { plan, generated } = loadSampleFixtures();
    const formBody = new URLSearchParams({
      payload: JSON.stringify({
        plan,
        slide: generated.cards[0],
        slideIndex: 0,
        totalSlides: generated.cards.length,
        filename: 'gdg-card-01-cover.png',
      }),
    });

    const req = new Request('http://localhost:3000/api/render/card?download=1', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    });

    const res = await POST(req, { params: Promise.resolve({ kind: 'card' }) });
    assert.equal(res.status, 200);
    assert.equal(
      res.headers.get('content-disposition'),
      'attachment; filename="gdg-card-01-cover.png"'
    );

    const buf = Buffer.from(await res.arrayBuffer());
    const { width, height } = parsePngDimensions(buf);
    assert.equal(width, 1080);
    assert.equal(height, 1350);
  });
});


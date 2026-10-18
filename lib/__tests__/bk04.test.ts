import assert from 'node:assert/strict';
import fs from 'node:fs';
import nodeModule from 'node:module';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { getPretendardFonts } from '../fonts.ts';
import { EventPlanSchema, GeneratedSchema } from '../schema.ts';
import { fitFontSize } from '../tokens.ts';

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

const { POST, GET } = await import('../../app/api/render/[kind]/route.tsx');
const { renderThumbnailPng, THUMBNAIL_SPECS } = await import(
  '../../components/templates/ThumbnailTemplate.tsx'
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

describe('BK-04 Acceptance Criteria — 티켓팅 썸네일 2종 (1280x720, 1200x630)', () => {

  it('AC1: renders EVENTUS (1280x720) and TICKETTACO (1200x630) PNGs with exact pixel dimensions via POST /api/render/thumbnail', async () => {
    const { plan, generated } = loadSampleFixtures();

    // 1. 이벤터스 (1280x720)
    const eventusReq = new Request(
      'http://localhost:3000/api/render/thumbnail',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          plan,
          thumbnail: generated.thumbnail,
          platform: 'EVENTUS',
        }),
      }
    );
    const eventusRes = await POST(eventusReq, {
      params: Promise.resolve({ kind: 'thumbnail' }),
    });
    assert.equal(eventusRes.status, 200);
    assert.ok(
      (eventusRes.headers.get('content-type') || '').includes('image/png')
    );
    const eventusBuf = Buffer.from(await eventusRes.arrayBuffer());
    const eventusDims = parsePngDimensions(eventusBuf);
    assert.equal(
      eventusDims.width,
      1280,
      'EVENTUS thumbnail width must be exactly 1280px'
    );
    assert.equal(
      eventusDims.height,
      720,
      'EVENTUS thumbnail height must be exactly 720px'
    );

    // 2. 티켓타코 (1200x630)
    const tickettacoReq = new Request(
      'http://localhost:3000/api/render/thumbnail',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          plan,
          thumbnail: generated.thumbnail,
          platform: 'TICKETTACO',
        }),
      }
    );
    const tickettacoRes = await POST(tickettacoReq, {
      params: Promise.resolve({ kind: 'thumbnail' }),
    });
    assert.equal(tickettacoRes.status, 200);
    assert.ok(
      (tickettacoRes.headers.get('content-type') || '').includes('image/png')
    );
    const tickettacoBuf = Buffer.from(await tickettacoRes.arrayBuffer());
    const tickettacoDims = parsePngDimensions(tickettacoBuf);
    assert.equal(
      tickettacoDims.width,
      1200,
      'TICKETTACO thumbnail width must be exactly 1200px'
    );
    assert.equal(
      tickettacoDims.height,
      630,
      'TICKETTACO thumbnail height must be exactly 630px'
    );
  });

  it('AC2: loads Pretendard OTF fonts (Regular 400 & Bold 700) and renders Korean text without tofu', async () => {
    const fonts = await getPretendardFonts();
    assert.equal(fonts.length, 2);
    assert.equal(fonts[0].name, 'Pretendard');
    assert.equal(fonts[0].weight, 400);
    assert.ok(fonts[0].data.byteLength > 100_000);
    assert.equal(fonts[1].name, 'Pretendard');
    assert.equal(fonts[1].weight, 700);
    assert.ok(fonts[1].data.byteLength > 100_000);

    const { plan, generated } = loadSampleFixtures();
    const koreanPlan = {
      ...plan,
      title: '인공지능 에이전트 핸즈온 캠퍼스 서울 2026',
      venue: '서강대학교 정하상관 3층 국제회의실',
    };

    const res = await renderThumbnailPng(koreanPlan, generated.thumbnail, {
      platform: 'EVENTUS',
    });
    const buf = Buffer.from(await res.arrayBuffer());
    assert.ok(
      buf.byteLength > 20_000,
      'Rendered Korean PNG must contain substantial rasterized glyph data'
    );
    const { width, height } = parsePngDimensions(buf);
    assert.equal(width, 1280);
    assert.equal(height, 720);
  });

  it('AC3: scales font size and wraps 30+ character long titles without overflow across both sizes and all themes', async () => {
    const { plan, generated } = loadSampleFixtures();
    const longTitle =
      '2026 GDG Campus Korea 생성형 AI 에이전트 실전 아키텍처 및 클라우드 런 핸즈온 부트캠프';
    assert.ok(
      longTitle.length >= 30,
      `Test title must be >= 30 chars (actual: ${longTitle.length})`
    );

    const shortFontSize = fitFontSize('짧은 제목', 16, {
      base: 56,
      medium: 44,
      small: 34,
    });
    const longFontSize = fitFontSize(longTitle, 16, {
      base: 56,
      medium: 44,
      small: 34,
    });
    assert.ok(
      longFontSize < shortFontSize,
      '30+ char title must select smaller font size tier via fitFontSize'
    );

    for (const theme of ['BUILD_WITH_AI', 'IO_EXTENDED', 'DEVFEST'] as const) {
      for (const platform of ['EVENTUS', 'TICKETTACO'] as const) {
        const res = await renderThumbnailPng(
          {
            ...plan,
            theme,
            title: longTitle,
          },
          {
            ...generated.thumbnail,
            headline: longTitle,
          },
          { platform }
        );
        const buf = Buffer.from(await res.arrayBuffer());
        const dims = parsePngDimensions(buf);
        assert.equal(dims.width, THUMBNAIL_SPECS[platform].width);
        assert.equal(dims.height, THUMBNAIL_SPECS[platform].height);
      }
    }
  });

  it('AC4: supports download buttons per thumbnail image and Content-Disposition: attachment response', async () => {
    const { plan, generated } = loadSampleFixtures();

    for (const platform of ['EVENTUS', 'TICKETTACO'] as const) {
      const spec = THUMBNAIL_SPECS[platform];
      const expectedFilename = `gdg-thumbnail-${platform.toLowerCase()}-${spec.width}x${spec.height}.png`;
      const formBody = new URLSearchParams({
        payload: JSON.stringify({
          plan,
          thumbnail: generated.thumbnail,
          platform,
          filename: expectedFilename,
        }),
      });

      const req = new Request(
        'http://localhost:3000/api/render/thumbnail?download=1',
        {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: formBody.toString(),
        }
      );

      const res = await POST(req, {
        params: Promise.resolve({ kind: 'thumbnail' }),
      });
      assert.equal(res.status, 200);
      assert.equal(
        res.headers.get('content-disposition'),
        `attachment; filename="${expectedFilename}"`
      );
      const buf = Buffer.from(await res.arrayBuffer());
      const dims = parsePngDimensions(buf);
      assert.equal(dims.width, spec.width);
      assert.equal(dims.height, spec.height);
    }

    // Verify GET /api/render/thumbnail also works for both platforms
    const getRes = await GET(
      new Request(
        'http://localhost:3000/api/render/thumbnail?platform=TICKETTACO&download=1'
      ),
      { params: Promise.resolve({ kind: 'thumbnail' }) }
    );
    assert.equal(getRes.status, 200);
    assert.equal(
      getRes.headers.get('content-disposition'),
      'attachment; filename="gdg-thumbnail-tickettaco-1200x630.png"'
    );

    // Verify ThumbnailPreview component renders download buttons for both platforms
    const previewSource = fs.readFileSync(
      path.join(ROOT_DIR, 'components/ThumbnailPreview.tsx'),
      'utf-8'
    );
    assert.ok(
      previewSource.includes('EVENTUS') &&
        previewSource.includes('TICKETTACO') &&
        previewSource.includes('PNG 다운로드'),
      'ThumbnailPreview must provide download buttons for both EVENTUS and TICKETTACO'
    );
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
});

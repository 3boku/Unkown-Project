import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { z } from 'zod';

import sampleGeneratedJson from '../../fixtures/sample-generated.json' with { type: 'json' };
import samplePlanJson from '../../fixtures/sample-plan.json' with { type: 'json' };
import {
  buildBenchmarkViralDna,
  buildDeterministicDirectedReel,
  runArgonReelsPipeline,
} from '../reels/argon-pipeline.ts';
import {
  EventPlanSchema,
  GeneratedSchema,
  ReelSchema,
  ViralDnaProfileSchema,
} from '../schema.ts';

describe('BK-06 Argon Multi-Agent Reels Pipeline & Schema Verification', () => {
  it('validates enriched sample-generated.json reel with Argon 3-stage fields and converts to JSON Schema', () => {
    const parsed = GeneratedSchema.parse(sampleGeneratedJson);
    assert.ok(parsed.reel.viralDna, 'sample-generated.json should include viralDna');
    assert.ok(
      parsed.reel.viralDna.firstFrameShockMs <= 1500,
      'firstFrameShockMs must be within 1.5s (1500ms)'
    );
    assert.ok(
      parsed.reel.verificationLoop && parsed.reel.verificationLoop.length >= 2,
      'verificationLoop should show closed-loop self-refinement history'
    );
    assert.equal(parsed.reel.verificationLoop[0].passed, false);
    assert.equal(
      parsed.reel.verificationLoop[parsed.reel.verificationLoop.length - 1].passed,
      true
    );

    const jsonSchema = z.toJSONSchema(ReelSchema);
    assert.equal(typeof jsonSchema, 'object');
  });

  it('extracts theme-specific ViralDnaProfile and preserves EventPlan immutable facts in directed scenes', () => {
    const plan = EventPlanSchema.parse(samplePlanJson);
    const dna = buildBenchmarkViralDna(plan);
    const validatedDna = ViralDnaProfileSchema.parse(dna);
    assert.equal(validatedDna.analyzedReelCount, 36);
    assert.ok(validatedDna.firstFrameShockMs <= 1500);

    const directed = buildDeterministicDirectedReel(
      plan,
      validatedDna,
      '더치 틸트 구도로 첫 1.5초 임팩트를 높여줘'
    );
    assert.equal(directed.scenes.length, 3);
    const totalSec = directed.scenes.reduce((acc, s) => acc + s.durationSec, 0);
    assert.ok(totalSec >= 15 && totalSec <= 20, `total duration ${totalSec}s should be 15..20s`);

    // Principle 1 & 2: EventPlan facts must appear in BentoGridShowcase scene and Veo prompts must exclude text
    const bentoScene = directed.scenes.find(
      (s) => s.component === 'BentoGridShowcase'
    );
    assert.ok(bentoScene);
    assert.ok(bentoScene.overlayText.includes(plan.date));
    assert.ok(bentoScene.overlayText.includes(plan.venue));

    for (const scene of directed.scenes) {
      assert.ok(scene.veoPrompt);
      assert.ok(
        scene.veoPrompt.compiledPrompt.toLowerCase().includes('zero text'),
        'Veo prompt must explicitly forbid text rendering'
      );
    }
  });

  it('runs the 3-stage Argon pipeline end-to-end with closed-loop verification pass', async () => {
    const plan = EventPlanSchema.parse(samplePlanJson);
    const result = await runArgonReelsPipeline({
      plan,
      instruction: '첫 1.5초 돌리 줌 속도를 높이고 마감 임박 강조',
    });

    assert.ok(result.reel.scenes.length >= 3);
    assert.ok(result.meta.finalScore >= 85);
    assert.ok(result.meta.iterationsRun >= 2);
  });

  it('contains zero raw hex color codes in lib/reels and app/api/reels', () => {
    const filesToCheck = [
      path.resolve(process.cwd(), 'lib/reels/argon-pipeline.ts'),
      path.resolve(process.cwd(), 'app/api/reels/direct/route.ts'),
      path.resolve(process.cwd(), 'app/api/refine/route.ts'),
    ];
    const hexRegex = /#[0-9A-Fa-f]{6}\b/;

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.equal(
        hexRegex.test(content),
        false,
        `Found forbidden hex literal in ${filePath}`
      );
    }
  });
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { EventPlanSchema, GeneratedSchema, SnsSchema } from "../schema.ts";
import {
  INSTAGRAM_MAX_HASHTAGS,
  INSTAGRAM_MAX_LENGTH,
  THREADS_MAIN_MAX_LENGTH,
  buildDeterministicSnsCopy,
  isFactMutationInstruction,
  refineSnsCopy,
  sanitizeSnsCopy,
  validateSnsConstraints,
} from "../sns/service.ts";

const ROOT_DIR = process.cwd();

function loadSamplePlan() {
  const raw = fs.readFileSync(
    path.join(ROOT_DIR, "fixtures/sample-plan.json"),
    "utf-8"
  );
  return EventPlanSchema.parse(JSON.parse(raw));
}

function loadSampleGenerated() {
  const raw = fs.readFileSync(
    path.join(ROOT_DIR, "fixtures/sample-generated.json"),
    "utf-8"
  );
  return GeneratedSchema.parse(JSON.parse(raw));
}

describe("BK-08 SNS Copy Service & Schema Acceptance Criteria", () => {
  it("validates fixtures/sample-generated.json sns against SnsSchema and length limits", () => {
    const plan = loadSamplePlan();
    const generated = loadSampleGenerated();
    const sns = SnsSchema.parse(generated.sns);

    assert.ok(
      sns.instagramCaption.length <= INSTAGRAM_MAX_LENGTH,
      "Instagram caption must be <= 2200 chars"
    );
    assert.ok(
      sns.threadsMain.length <= THREADS_MAIN_MAX_LENGTH,
      "Threads main body must be <= 500 chars"
    );
    assert.ok(
      sns.threadsReply.includes(plan.registration.url),
      "Threads reply must include registration URL"
    );
    assert.ok(
      sns.instagram.length > 0 && sns.hashtags.length > 0 && sns.threads.length > 0,
      "Alias fields (instagram, hashtags, threads) must also be populated"
    );
  });

  it("enforces Instagram 2200-char limit, 30-hashtag cap, Threads 500-char limit, and external URL stripping", () => {
    const plan = loadSamplePlan();
    const longInstagram = `${"가".repeat(2400)}\n\n${Array.from(
      { length: 35 },
      (_, i) => `#Tag${i + 1}`
    ).join(" ")}`;
    const threadsWithUrlAndOverflow = `${"나".repeat(520)} https://event-us.kr/should-be-stripped`;

    const report = validateSnsConstraints(
      {
        instagramCaption: longInstagram,
        threadsMain: threadsWithUrlAndOverflow,
        threadsReply: "신청 링크 없음",
      },
      plan
    );

    assert.equal(report.instagramOverLimit, true);
    assert.equal(report.threadsMainOverLimit, true);
    assert.equal(report.hashtagOverLimit, true);
    assert.equal(report.threadsMainHasUrl, true);
    assert.equal(report.threadsReplyMissingUrl, true);

    const sanitized = sanitizeSnsCopy(
      {
        instagramCaption: longInstagram,
        threadsMain: threadsWithUrlAndOverflow,
        threadsReply: "신청 링크 안내",
      },
      plan
    );

    assert.ok(sanitized.instagramCaption.length <= INSTAGRAM_MAX_LENGTH);
    assert.ok(sanitized.hashtags.length <= INSTAGRAM_MAX_HASHTAGS);
    assert.ok(sanitized.threadsMain.length <= THREADS_MAIN_MAX_LENGTH);
    assert.equal(/https?:\/\//i.test(sanitized.threadsMain), false);
    assert.ok(sanitized.threadsReply.includes(plan.registration.url));
  });

  it("refines SNS copy deterministically (emoji removal, compression, hashtag expansion) and blocks fact mutation", async () => {
    const plan = loadSamplePlan();
    const initial = buildDeterministicSnsCopy(plan);

    const noEmoji = await refineSnsCopy({
      plan,
      current: initial,
      instruction: "이모지 빼고 담백한 개발자 톤으로 바꿔줘",
    });
    assert.equal(noEmoji.threadsMain.includes("🤔"), false);
    assert.ok(noEmoji.threadsReply.includes(plan.registration.url));

    const compressed = await refineSnsCopy({
      plan,
      current: initial,
      instruction: "쓰레드 본문 300자 이내로 압축해줘",
    });
    assert.ok(compressed.threadsMain.length <= 300);

    const expandedTags = await refineSnsCopy({
      plan,
      current: initial,
      instruction: "해시태그 10개로 확장해줘",
    });
    assert.equal(expandedTags.hashtags.length, 10);

    assert.equal(isFactMutationInstruction("행사 날짜를 5월 10일로 바꿔줘"), true);
    await assert.rejects(
      () =>
        refineSnsCopy({
          plan,
          current: initial,
          instruction: "행사 날짜를 5월 10일로 바꿔줘",
        }),
      /FACT_CHANGE_FORBIDDEN/
    );
  });
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { z } from "zod";
import { EventPlanSchema, GeneratedSchema } from "../schema.ts";
import { brandCycle, color, themes } from "../tokens.ts";

const ROOT_DIR = process.cwd();

describe("BK-01 Acceptance Criteria", () => {
  it("validates fixtures/sample-plan.json with EventPlanSchema.parse", () => {
    const raw = fs.readFileSync(
      path.join(ROOT_DIR, "fixtures/sample-plan.json"),
      "utf-8"
    );
    const parsed = EventPlanSchema.parse(JSON.parse(raw));
    assert.equal(parsed.theme, "BUILD_WITH_AI");
    assert.equal(parsed.title, "Build with AI Hands-on Campus");
    assert.ok(parsed.schedule.length > 0);
    assert.ok(parsed.speakers.length > 0);
  });

  it("validates fixtures/sample-generated.json with GeneratedSchema.parse and z.toJSONSchema", () => {
    const raw = fs.readFileSync(
      path.join(ROOT_DIR, "fixtures/sample-generated.json"),
      "utf-8"
    );
    const parsed = GeneratedSchema.parse(JSON.parse(raw));
    assert.ok(parsed.cards.length >= 6 && parsed.cards.length <= 10);
    assert.ok(parsed.reel.scenes.length >= 1);

    const jsonSchema = z.toJSONSchema(GeneratedSchema);
    assert.equal(jsonSchema.type, "object");
  });

  it("defines the 7 fixed brand/neutral colors and 3 themes in lib/tokens.ts", () => {
    assert.equal(Object.keys(color).length, 7);
    assert.deepEqual(brandCycle, ["blue", "red", "yellow", "green"]);
    assert.ok(themes.BUILD_WITH_AI);
    assert.ok(themes.IO_EXTENDED);
    assert.ok(themes.DEVFEST);
  });

  it("includes Pretendard-Regular.otf and Pretendard-Bold.otf in assets/fonts/", () => {
    const regularPath = path.join(ROOT_DIR, "assets/fonts/Pretendard-Regular.otf");
    const boldPath = path.join(ROOT_DIR, "assets/fonts/Pretendard-Bold.otf");
    assert.ok(fs.existsSync(regularPath), "Pretendard-Regular.otf must exist");
    assert.ok(fs.existsSync(boldPath), "Pretendard-Bold.otf must exist");
    assert.ok(fs.statSync(regularPath).size > 100_000);
    assert.ok(fs.statSync(boldPath).size > 100_000);
  });
});

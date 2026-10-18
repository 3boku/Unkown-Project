import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EventPlanSchema } from "../schema.ts";
import {
  emptyPlan,
  getMissingRequiredFields,
  isPlanValidForGeneration,
  samplePlan,
} from "../storage.ts";

describe("BK-02 Acceptance Criteria & Storage Logic", () => {
  it("validates that samplePlan satisfies all required fields for generation", () => {
    assert.equal(isPlanValidForGeneration(samplePlan), true);
    assert.deepEqual(getMissingRequiredFields(samplePlan), []);
  });

  it("identifies missing required fields in emptyPlan", () => {
    assert.equal(isPlanValidForGeneration(emptyPlan), false);
    const missing = getMissingRequiredFields(emptyPlan);
    assert.ok(missing.includes("제목"));
    assert.ok(missing.includes("날짜"));
    assert.ok(missing.includes("시작 시간"));
    assert.ok(missing.includes("장소"));
  });

  it("handles partial plan validation when mandatory fields are missing or whitespace", () => {
    const partialPlan = {
      ...samplePlan,
      title: "   ",
      venue: "",
    };
    assert.equal(isPlanValidForGeneration(partialPlan), false);
    const missing = getMissingRequiredFields(partialPlan);
    assert.deepEqual(missing, ["제목", "장소"]);
  });

  it("allows adding, removing, and updating schedule items", () => {
    const plan = structuredClone(samplePlan);
    const initialCount = plan.schedule.length;

    // Add new item
    const newItem = {
      start: "18:00",
      end: "19:00",
      title: "애프터 파티",
      note: "네트워킹",
      highlight: true,
    };
    plan.schedule.push(newItem);
    assert.equal(plan.schedule.length, initialCount + 1);

    // Update item
    plan.schedule[0].title = "오프닝 환영식";
    assert.equal(plan.schedule[0].title, "오프닝 환영식");

    // Remove item
    plan.schedule.pop();
    assert.equal(plan.schedule.length, initialCount);

    // Validate schema after modifications
    const parsed = EventPlanSchema.parse(plan);
    assert.equal(parsed.schedule[0].title, "오프닝 환영식");
  });

  it("allows adding, removing, and updating speakers with photos", () => {
    const plan = structuredClone(samplePlan);
    const initialCount = plan.speakers.length;

    // Add new speaker with data URL photo
    const newSpeaker = {
      name: "홍길동",
      affiliation: "Google",
      sessionTitle: "Gemini 2.5 신기능 탐구",
      summary: "실전 프로덕션 적용기",
      photoUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      kind: "SESSION" as const,
    };
    plan.speakers.push(newSpeaker);
    assert.equal(plan.speakers.length, initialCount + 1);

    // Update speaker
    plan.speakers[0].affiliation = "GDG Organizer";
    assert.equal(plan.speakers[0].affiliation, "GDG Organizer");

    // Remove speaker
    plan.speakers.pop();
    assert.equal(plan.speakers.length, initialCount);

    // Validate schema
    const parsed = EventPlanSchema.parse(plan);
    assert.equal(parsed.speakers[0].affiliation, "GDG Organizer");
  });

  it("allows updating fact fields (date, venue, hostName) without breaking schema", () => {
    const plan = structuredClone(samplePlan);
    plan.date = "2026-06-15";
    plan.venue = "코엑스 그랜드볼룸";
    plan.hostName = "GDG Korea";

    const parsed = EventPlanSchema.parse(plan);
    assert.equal(parsed.date, "2026-06-15");
    assert.equal(parsed.venue, "코엑스 그랜드볼룸");
    assert.equal(parsed.hostName, "GDG Korea");
  });
});

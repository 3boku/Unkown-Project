import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  renderPromptString,
  resolvePromptTemplate,
  registerPromptTemplate,
  listPromptTemplates,
} from "../prompts.ts";
import {
  base64ToGenerativePart,
  bufferToGenerativePart,
  fileToGenerativePart,
} from "../multimodal.ts";
import {
  generateText,
  generateFromTemplate,
  generateMultimodal,
} from "../service.ts";
import { GeminiError } from "../types.ts";
import { resolveApiModelName } from "../client.ts";

describe("Prompt Template System", () => {
  it("interpolates variables into template strings", () => {
    const result = renderPromptString("안녕 {{name}}, 오늘 주제는 {{topic}}입니다.", {
      name: "지민",
      topic: "Next.js 서버",
    });
    assert.equal(result, "안녕 지민, 오늘 주제는 Next.js 서버입니다.");
  });

  it("throws GeminiError(VALIDATION_ERROR) when required variables are missing", () => {
    assert.throws(
      () =>
        renderPromptString("필수 변수: {{requiredVar}}, {{secondVar}}", {
          requiredVar: "있음",
        }),
      (err: unknown) => {
        assert.ok(err instanceof GeminiError);
        assert.equal(err.code, "VALIDATION_ERROR");
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /secondVar/);
        return true;
      }
    );
  });

  it("resolves built-in prompt template and allows custom registration", () => {
    const templates = listPromptTemplates();
    assert.ok(templates.length >= 4);

    const resolved = resolvePromptTemplate("summarize", {
      content: "Next.js 16 App Router와 Gemini SDK를 연동하는 백엔드 템플릿입니다.",
      style: "3줄 요약",
    });
    assert.ok(resolved.prompt.includes("Next.js 16 App Router"));
    assert.ok(resolved.prompt.includes("3줄 요약"));
    assert.ok(resolved.systemInstruction);

    registerPromptTemplate({
      id: "custom-greeting",
      description: "테스트용 인사 템플릿",
      systemInstruction: "친절한 어시스턴트",
      template: "{{user}}님 반갑습니다!",
    });

    const custom = resolvePromptTemplate("custom-greeting", { user: "현서" });
    assert.equal(custom.prompt, "현서님 반갑습니다!");
  });
});

describe("Multimodal Helpers", () => {
  it("converts base64 string (with or without data URL prefix) to inlineData part", () => {
    const rawBase64 = Buffer.from("hello image").toString("base64");
    const part1 = base64ToGenerativePart(rawBase64, "image/png");
    assert.deepEqual(part1, {
      inlineData: {
        data: rawBase64,
        mimeType: "image/png",
      },
    });

    const dataUrl = `data:image/jpeg;base64,${rawBase64}`;
    const part2 = base64ToGenerativePart(dataUrl, "image/jpeg");
    assert.deepEqual(part2, {
      inlineData: {
        data: rawBase64,
        mimeType: "image/jpeg",
      },
    });
  });

  it("rejects unsupported MIME types", () => {
    const rawBase64 = Buffer.from("exe").toString("base64");
    assert.throws(
      () => base64ToGenerativePart(rawBase64, "application/x-msdownload"),
      (err: unknown) => {
        assert.ok(err instanceof GeminiError);
        assert.equal(err.code, "UNSUPPORTED_MEDIA_TYPE");
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  it("converts Buffer and File/Blob to inlineData part and enforces size limit", async () => {
    const buf = Buffer.from("sample pdf bytes");
    const part = bufferToGenerativePart(buf, "application/pdf");
    assert.equal(part.inlineData?.mimeType, "application/pdf");
    assert.equal(part.inlineData?.data, buf.toString("base64"));

    const blob = new Blob(["hello text"], { type: "text/plain" });
    const blobPart = await fileToGenerativePart(blob);
    assert.equal(blobPart.inlineData?.mimeType, "text/plain");

    // Exceed custom maxBytes (e.g. 5 bytes)
    assert.throws(
      () => bufferToGenerativePart(buf, "application/pdf", 5),
      (err: unknown) => {
        assert.ok(err instanceof GeminiError);
        assert.equal(err.code, "PAYLOAD_TOO_LARGE");
        assert.equal(err.statusCode, 413);
        return true;
      }
    );
  });
});

describe("Gemini Service Layer (with Mock Client)", () => {
  const createMockClient = () => {
    const calls: unknown[] = [];
    return {
      calls,
      client: {
        models: {
          generateContent: async (params: unknown) => {
            calls.push(params);
            return {
              text: "모의 응답 텍스트입니다.",
              usageMetadata: {
                promptTokenCount: 12,
                candidatesTokenCount: 8,
                totalTokenCount: 20,
              },
            };
          },
        },
      },
    };
  };

  it("generateText calls SDK and returns structured result", async () => {
    const mock = createMockClient();
    const res = await generateText(
      {
        prompt: "테스트 프롬프트",
        systemInstruction: "시스템 지시문",
        model: "gemini-2.5-flash",
      },
      mock.client as never
    );

    assert.equal(res.text, "모의 응답 텍스트입니다.");
    assert.equal(res.model, "gemini-2.5-flash");
    assert.equal(res.usage?.totalTokenCount, 20);
    assert.equal(mock.calls.length, 1);
  });

  it("generateText strips zod safe-integer bounds from responseJsonSchema", async () => {
    const mock = createMockClient();
    await generateText(
      {
        prompt: "스키마 테스트",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              seed: { type: "integer", minimum: -Number.MAX_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER },
              index: { type: "integer", minimum: 0 },
            },
          },
        },
      },
      mock.client as never
    );

    const sent = (mock.calls[0] as { config: { responseJsonSchema: unknown } }).config.responseJsonSchema;
    assert.deepEqual(sent, {
      type: "object",
      properties: { seed: { type: "integer" }, index: { type: "integer", minimum: 0 } },
    });
  });

  it("resolveApiModelName maps gemini-4 aliases to argon with an API key", () => {
    const prev = process.env.GEMINI_API_KEY;
    try {
      process.env.GEMINI_API_KEY = "test-key";
      assert.equal(resolveApiModelName("gemini-4"), "gemini-4-argon");
      assert.equal(resolveApiModelName("gemini-2.5-flash"), "gemini-2.5-flash");
      delete process.env.GEMINI_API_KEY;
      assert.equal(resolveApiModelName("gemini-4-argon"), "gemini-3-flash-preview");
    } finally {
      if (prev === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = prev;
    }
  });

  it("generateFromTemplate renders template and invokes SDK", async () => {
    const mock = createMockClient();
    const res = await generateFromTemplate(
      {
        templateId: "translate",
        variables: {
          targetLanguage: "English",
          text: "안녕하세요",
        },
      },
      mock.client as never
    );

    assert.equal(res.text, "모의 응답 텍스트입니다.");
    assert.equal(res.templateId, "translate");
    assert.equal(mock.calls.length, 1);
  });

  it("generateMultimodal combines media parts and prompt", async () => {
    const mock = createMockClient();
    const mediaPart = bufferToGenerativePart(
      Buffer.from("fake-image"),
      "image/png"
    );

    const res = await generateMultimodal(
      {
        prompt: "이 이미지를 설명해줘",
        media: [mediaPart],
      },
      mock.client as never
    );

    assert.equal(res.text, "모의 응답 텍스트입니다.");
    assert.equal(mock.calls.length, 1);
  });
});

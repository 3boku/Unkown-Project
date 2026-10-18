import type { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { generateText } from "../gemini/service.ts";
import { type EventPlan, type Sns, SnsSchema } from "../schema.ts";

export const INSTAGRAM_MAX_LENGTH = 2200;
export const INSTAGRAM_MAX_HASHTAGS = 30;
export const THREADS_MAIN_MAX_LENGTH = 500;

const EXTERNAL_URL_REGEX = /https?:\/\/[^\s)]+|www\.[^\s)]+/gi;
const HASHTAG_REGEX = /#[\p{L}\p{N}_]+/gu;

const FACT_MUTATION_REGEX =
  /(?:날짜|일자|일시|시작\s*시간|종료\s*시간|시간|장소|연사|발표자|정원).*(?:바꿔|변경|수정|고쳐|옮겨)|change\s+(?:the\s+)?(?:date|time|venue|location|speaker|capacity)/i;

export interface SnsConstraintReport {
  instagramLength: number;
  threadsMainLength: number;
  hashtagCount: number;
  instagramOverLimit: boolean;
  threadsMainOverLimit: boolean;
  hashtagOverLimit: boolean;
  threadsMainHasUrl: boolean;
  threadsReplyMissingUrl: boolean;
}

export function resolveRegistrationUrl(
  plan?: Partial<EventPlan> & { registrationUrl?: string }
): string {
  if (!plan) return "";
  const direct = typeof plan.registrationUrl === "string" ? plan.registrationUrl.trim() : "";
  const nested =
    typeof plan.registration?.url === "string" ? plan.registration.url.trim() : "";
  return direct || nested || "";
}

export function extractHashtags(text: string): string[] {
  if (!text) return [];
  const matches = text.match(HASHTAG_REGEX) ?? [];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of matches) {
    const normalized = raw.startsWith("#") ? raw : `#${raw}`;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(normalized);
    }
  }
  return unique;
}

export function normalizeHashtagList(
  tags: unknown,
  fallbackText = ""
): string[] {
  const rawList: string[] = [];
  if (Array.isArray(tags)) {
    for (const item of tags) {
      if (typeof item === "string" && item.trim()) {
        const parts = item.trim().split(/\s+/);
        for (const part of parts) {
          if (part.trim()) {
            rawList.push(part.startsWith("#") ? part.trim() : `#${part.trim()}`);
          }
        }
      }
    }
  } else if (typeof tags === "string" && tags.trim()) {
    rawList.push(...extractHashtags(tags));
  }

  if (rawList.length === 0 && fallbackText) {
    rawList.push(...extractHashtags(fallbackText));
  }

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const tag of rawList) {
    const clean = tag.replace(/[^#\p{L}\p{N}_]/gu, "");
    if (clean.length > 1 && !seen.has(clean)) {
      seen.add(clean);
      deduped.push(clean);
    }
  }
  return deduped;
}

export function stripTrailingHashtags(caption: string): string {
  if (!caption) return "";
  const lines = caption.trim().split("\n");
  while (lines.length > 0) {
    const last = lines[lines.length - 1].trim();
    if (!last) {
      lines.pop();
      continue;
    }
    const tokens = last.split(/\s+/);
    const allHashtags = tokens.length > 0 && tokens.every((t) => t.startsWith("#"));
    if (allHashtags) {
      lines.pop();
    } else {
      break;
    }
  }
  return lines.join("\n").trim();
}

export function stripExternalUrls(text: string): string {
  if (!text) return "";
  return text
    .replace(EXTERNAL_URL_REGEX, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function ensureThreadsReplyUrl(
  threadsReply: string,
  plan?: Partial<EventPlan> & { registrationUrl?: string }
): string {
  const regUrl = resolveRegistrationUrl(plan);
  const trimmed = (threadsReply ?? "").trim();

  if (!regUrl) {
    return trimmed || "👉 참가 신청은 프로필 링크에서 확인해 주세요!";
  }

  if (trimmed.includes(regUrl)) {
    return trimmed;
  }

  const cleanedReply = stripExternalUrls(trimmed);
  if (!cleanedReply) {
    const deadlineText = plan?.registration?.deadline
      ? ` (~${plan.registration.deadline} 마감)`
      : "";
    const capacityText = plan?.capacity ? `선착순 ${plan.capacity}명` : "참가 신청";
    return `👉 참가 신청 바로가기 (${capacityText}${deadlineText})\n${regUrl}`;
  }

  return `${cleanedReply}\n${regUrl}`;
}

export function isFactMutationInstruction(instruction: string): boolean {
  return FACT_MUTATION_REGEX.test(instruction.trim());
}

export function normalizeSnsInput(
  input: unknown,
  plan?: Partial<EventPlan> & { registrationUrl?: string }
): Sns {
  const obj =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};

  const rawInstagramCaption =
    typeof obj.instagramCaption === "string" ? obj.instagramCaption.trim() : "";
  const rawInstagramBody =
    typeof obj.instagram === "string" ? obj.instagram.trim() : "";

  const hashtags = normalizeHashtagList(
    obj.hashtags,
    rawInstagramCaption || rawInstagramBody
  );

  const instagramBody =
    rawInstagramBody || stripTrailingHashtags(rawInstagramCaption);

  const hashtagBlock = hashtags.join(" ");
  const instagramCaption =
    rawInstagramCaption ||
    (hashtagBlock ? `${instagramBody}\n\n${hashtagBlock}`.trim() : instagramBody);

  const rawThreadsMain =
    typeof obj.threadsMain === "string"
      ? obj.threadsMain.trim()
      : typeof obj.threads === "string"
        ? obj.threads.trim()
        : "";

  const rawThreadsReply =
    typeof obj.threadsReply === "string" ? obj.threadsReply.trim() : "";

  return {
    instagramCaption,
    instagram: instagramBody,
    hashtags,
    threadsMain: rawThreadsMain,
    threads: rawThreadsMain,
    threadsReply: ensureThreadsReplyUrl(rawThreadsReply, plan),
  };
}

export function validateSnsConstraints(
  input: unknown,
  plan?: Partial<EventPlan> & { registrationUrl?: string }
): SnsConstraintReport {
  const obj =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};

  const rawCaption =
    typeof obj.instagramCaption === "string"
      ? obj.instagramCaption
      : typeof obj.instagram === "string"
        ? obj.instagram
        : "";
  const rawThreads =
    typeof obj.threadsMain === "string"
      ? obj.threadsMain
      : typeof obj.threads === "string"
        ? obj.threads
        : "";
  const rawReply =
    typeof obj.threadsReply === "string" ? obj.threadsReply : "";
  const rawHashtags = normalizeHashtagList(obj.hashtags, rawCaption);
  const regUrl = resolveRegistrationUrl(plan);

  return {
    instagramLength: rawCaption.length,
    threadsMainLength: rawThreads.length,
    hashtagCount: rawHashtags.length,
    instagramOverLimit: rawCaption.length > INSTAGRAM_MAX_LENGTH,
    threadsMainOverLimit: rawThreads.length > THREADS_MAIN_MAX_LENGTH,
    hashtagOverLimit: rawHashtags.length > INSTAGRAM_MAX_HASHTAGS,
    threadsMainHasUrl: new RegExp(EXTERNAL_URL_REGEX.source, "i").test(rawThreads),
    threadsReplyMissingUrl: Boolean(regUrl && !rawReply.includes(regUrl)),
  };
}

export function sanitizeSnsCopy(
  input: unknown,
  plan?: Partial<EventPlan> & { registrationUrl?: string }
): Sns {
  const normalized = normalizeSnsInput(input, plan);

  const cappedHashtags = normalized.hashtags.slice(0, INSTAGRAM_MAX_HASHTAGS);
  const hashtagSuffix = cappedHashtags.length > 0 ? `\n\n${cappedHashtags.join(" ")}` : "";

  let instagramBody = stripTrailingHashtags(
    normalized.instagram || normalized.instagramCaption
  );
  const maxBodyLength = Math.max(
    0,
    INSTAGRAM_MAX_LENGTH - hashtagSuffix.length
  );
  if (instagramBody.length > maxBodyLength) {
    instagramBody = instagramBody.slice(0, maxBodyLength).trim();
  }

  let instagramCaption = `${instagramBody}${hashtagSuffix}`.trim();
  if (instagramCaption.length > INSTAGRAM_MAX_LENGTH) {
    instagramCaption = instagramCaption.slice(0, INSTAGRAM_MAX_LENGTH).trim();
  }

  let threadsMain = stripExternalUrls(
    normalized.threadsMain || normalized.threads
  );
  if (threadsMain.length > THREADS_MAIN_MAX_LENGTH) {
    threadsMain = `${threadsMain.slice(0, THREADS_MAIN_MAX_LENGTH - 1).trim()}…`;
  }

  const threadsReply = ensureThreadsReplyUrl(normalized.threadsReply, plan);

  return SnsSchema.parse({
    instagramCaption,
    instagram: instagramBody,
    hashtags: cappedHashtags,
    threadsMain,
    threads: threadsMain,
    threadsReply,
  });
}

export function buildDeterministicSnsCopy(plan: EventPlan): Sns {
  const hook = plan.hook || `${plan.year} ${plan.title}`;
  const timeRange = plan.endTime
    ? `${plan.startTime} ~ ${plan.endTime}`
    : plan.startTime;
  const capacityLabel = plan.capacity ? ` (정원 ${plan.capacity}명)` : "";
  const perksLine =
    plan.perks.length > 0 ? plan.perks.join(", ") : "네트워킹 및 현장 굿즈";
  const speakerPreview = plan.speakers
    .slice(0, 3)
    .map((sp) => sp.sessionTitle)
    .join(", ");

  const instagramBody = [
    hook,
    "",
    `${plan.hostName}가 준비한 ${plan.year} ${plan.title}에서`,
    plan.description || "직접 코드를 작성하고 실습하며 나만의 프로덕트를 완성해 보세요!",
    "",
    "📌 상세 타임테이블과 최신 연사자 정보는 프로필 링크에서 확인해주세요",
    "",
    "🔥 프로그램 구성",
    `- ${plan.programSummary || "실전 핸즈온 & 기술 세션"}`,
    speakerPreview ? `- 주요 주제: ${speakerPreview}` : null,
    "",
    "🛠️ 행사 특징",
    `- 일시: ${plan.date} (${timeRange})`,
    `- 장소: ${plan.venue}`,
    plan.targetAudience ? `- 대상: ${plan.targetAudience}${capacityLabel}` : null,
    `- 혜택: ${perksLine}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const themeTag =
    plan.theme === "IO_EXTENDED"
      ? "#GoogleIOExtended"
      : plan.theme === "DEVFEST"
        ? "#DevFest"
        : "#BuildWithAI";

  const hashtags = [
    "#GDG",
    "#GDGCampusKorea",
    themeTag,
    "#Gemini",
    "#GoogleCloud",
    "#개발자행사",
    "#핸즈온",
    "#대학생개발자",
  ];

  const threadsMain = [
    `${hook} 🤔`,
    "",
    `${plan.year} ${plan.title} 참가자를 모집합니다!`,
    "",
    `📅 ${plan.date} (${timeRange})`,
    `📍 ${plan.venue}`,
    `💻 ${plan.programSummary || "실전 핸즈온 & 세션"}`,
    `🎁 ${plan.perks.slice(0, 3).join(" · ") || "현장 굿즈 및 네트워킹 제공"}`,
    "",
    "직접 실습하고 현업 개발자 멘토링까지 한 번에 경험해 보세요!",
  ].join("\n");

  const regUrl = resolveRegistrationUrl(plan);
  const deadlinePart = plan.registration?.deadline
    ? `, ~${plan.registration.deadline} 마감`
    : "";
  const capacityPart = plan.capacity ? `선착순 ${plan.capacity}명` : "참가 신청";
  const threadsReply = regUrl
    ? `👉 참가 신청 바로가기 (${capacityPart}${deadlinePart})\n${regUrl}`
    : "👉 참가 신청은 프로필 링크에서 확인해 주세요!";

  return sanitizeSnsCopy(
    {
      instagram: instagramBody,
      hashtags,
      threadsMain,
      threadsReply,
    },
    plan
  );
}

const EMOJI_STRIP_REGEX =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

export function applyDeterministicSnsRefinement(
  currentInput: unknown,
  instruction: string,
  plan: EventPlan
): Sns {
  const base = normalizeSnsInput(
    currentInput && typeof currentInput === "object" && Object.keys(currentInput).length > 0
      ? currentInput
      : buildDeterministicSnsCopy(plan),
    plan
  );

  let instagramBody = stripTrailingHashtags(
    base.instagram || base.instagramCaption
  );
  let hashtags = [...base.hashtags];
  let threadsMain = base.threadsMain || base.threads;
  let threadsReply = base.threadsReply;

  const lower = instruction.toLowerCase();

  // 1) Strip emojis / 담백한 톤
  if (/(이모지\s*(?:빼|제거|없이)|담백|차분|깔끔)/i.test(instruction)) {
    instagramBody = instagramBody
      .replace(EMOJI_STRIP_REGEX, "")
      .replace(/^[ \t]+/gm, "")
      .trim();
    threadsMain = threadsMain
      .replace(EMOJI_STRIP_REGEX, "")
      .replace(/^[ \t]+/gm, "")
      .trim();
    threadsReply = threadsReply
      .replace(EMOJI_STRIP_REGEX, "")
      .replace(/^[ \t]+/gm, "")
      .trim();
  }

  // 2) Compress / 300자 이내 / 짧게
  if (/(짧게|간결|압축|줄여|요약|300자)/i.test(instruction)) {
    const timeRange = plan.endTime
      ? `${plan.startTime} ~ ${plan.endTime}`
      : plan.startTime;
    threadsMain = [
      `${plan.hook || plan.title}`,
      `${plan.year} ${plan.title} (${plan.hostName})`,
      `일시: ${plan.date} (${timeRange}) | 장소: ${plan.venue}`,
      `구성: ${plan.programSummary || "핸즈온 & 세션"}`,
      `혜택: ${plan.perks.join(" · ")}`,
    ].join("\n");

    if (threadsMain.length > 290) {
      threadsMain = threadsMain.slice(0, 290).trim();
    }
  }

  // 3) Expand hashtags (e.g. 해시태그 10개로 확장)
  if (/(해시태그|태그|hashtag)/i.test(lower)) {
    const extraTags = [
      "#GDG",
      "#GDGCampusKorea",
      "#BuildWithAI",
      "#Gemini",
      "#GoogleCloud",
      "#개발자행사",
      "#핸즈온",
      "#대학생개발자",
      "#AI에이전트",
      "#클라우드런",
      "#프롬프트엔지니어링",
      "#주니어개발자",
    ];
    const countMatch = instruction.match(/(\d+)\s*개/);
    const targetCount = countMatch
      ? Math.min(INSTAGRAM_MAX_HASHTAGS, Math.max(1, Number(countMatch[1])))
      : 10;
    hashtags = normalizeHashtagList([...hashtags, ...extraTags]).slice(
      0,
      targetCount
    );
  }

  // 4) Emphasize perks & networking
  if (/(혜택|굿즈|네트워킹|멘토링)/i.test(instruction)) {
    const perkHighlight = `\n\n✨ 현장 참가 혜택: ${plan.perks.join(" · ")}${
      plan.specialEvents.length > 0
        ? ` (${plan.specialEvents.map((e) => e.title).join(", ")})`
        : ""
    }`;
    if (!instagramBody.includes("현장 참가 혜택")) {
      instagramBody = `${instagramBody}${perkHighlight}`;
    }
    if (!threadsMain.includes("멘토링") && threadsMain.length < 440) {
      threadsMain = `${threadsMain}\n✨ ${plan.perks.join(" · ")} 현장 제공!`;
    }
  }

  // 5) Developer humor / 친근한 톤
  if (/(유머|재밌|위트|친근|개발자\s*톤)/i.test(instruction)) {
    const wittyLead = "로컬에서는 잘 돌아가는데 배포만 하면 막히셨나요? 😉";
    if (!instagramBody.includes(wittyLead)) {
      instagramBody = `${wittyLead}\n\n${instagramBody}`;
    }
  }

  return sanitizeSnsCopy(
    {
      instagram: instagramBody,
      hashtags,
      threadsMain,
      threadsReply,
    },
    plan
  );
}

export async function refineSnsCopy(
  params: {
    plan: EventPlan;
    current: unknown;
    instruction: string;
  },
  clientOverride?: GoogleGenAI
): Promise<Sns> {
  const { plan, current, instruction } = params;
  const normalizedCurrent = normalizeSnsInput(current, plan);

  if (isFactMutationInstruction(instruction)) {
    throw new Error(
      "FACT_CHANGE_FORBIDDEN: 일시·장소·연사 등 행사 사실 정보는 좌측 기획서 폼에서 수정해 주세요."
    );
  }

  const hasApiKey = Boolean(clientOverride || process.env.GEMINI_API_KEY?.trim());
  if (!hasApiKey) {
    return applyDeterministicSnsRefinement(normalizedCurrent, instruction, plan);
  }

  const regUrl = resolveRegistrationUrl(plan);
  const systemInstruction = [
    "당신은 GDG Campus Korea의 브랜드킷 SNS 카피라이터입니다.",
    "주어진 현재 SNS 문구(current)를 사용자의 수정 지시(instruction)에 맞게 다듬어 JSON으로 반환하세요.",
    "절대 지켜야 할 규칙:",
    "1. 행사 일시(date, startTime, endTime), 장소(venue), 연사 이름, 정원(capacity), 신청 링크(registrationUrl) 등 사실(EventPlan)은 절대 임의로 변경하지 마세요.",
    `2. instagramCaption은 2,200자 이내여야 하며 해시태그는 30개 이하여야 합니다.`,
    `3. threadsMain(및 threads)은 반드시 500자 이내여야 하며, 쓰레드 알고리즘 노출 감소를 방지하기 위해 본문 안에 http:// 또는 https:// 외부 링크를 절대 넣지 마세요.`,
    `4. threadsReply에는 반드시 등록 링크(${regUrl || "프로필 링크"})를 포함하세요.`,
  ].join("\n");

  const basePrompt = JSON.stringify(
    {
      instruction,
      eventFacts: {
        title: plan.title,
        year: plan.year,
        hostName: plan.hostName,
        hook: plan.hook,
        date: plan.date,
        startTime: plan.startTime,
        endTime: plan.endTime,
        venue: plan.venue,
        capacity: plan.capacity,
        programSummary: plan.programSummary,
        perks: plan.perks,
        registrationUrl: regUrl,
      },
      current: normalizedCurrent,
    },
    null,
    2
  );

  const jsonSchema = z.toJSONSchema(SnsSchema) as Record<string, unknown>;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const prompt =
        attempt === 0
          ? basePrompt
          : `${basePrompt}\n\n[이전 응답 검증 오류 — 반드시 수정하여 스키마를 준수하세요]: ${
              lastError instanceof Error ? lastError.message : String(lastError)
            }`;

      const res = await generateText(
        {
          prompt,
          systemInstruction,
          config: {
            temperature: 0.4,
            responseMimeType: "application/json",
            responseJsonSchema: jsonSchema,
          },
        },
        clientOverride
      );

      const parsedJson = JSON.parse(res.text);
      const parsedSns = SnsSchema.parse(parsedJson);
      return sanitizeSnsCopy(parsedSns, plan);
    } catch (err) {
      lastError = err;
    }
  }

  return applyDeterministicSnsRefinement(normalizedCurrent, instruction, plan);
}

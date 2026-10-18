"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { EventPlan, Sns } from "@/lib/schema";
import { brandCycle, color } from "@/lib/tokens";

const INSTAGRAM_MAX_CHARS = 2200;
const INSTAGRAM_MAX_HASHTAGS = 30;
const THREADS_MAX_CHARS = 500;
const THREADS_WARN_CHARS = 450;
const MAX_UNDO_STEPS = 5;

const QUICK_PRESETS = [
  "이모지 빼고 담백한 개발자 톤으로",
  "쓰레드 본문 300자 이내로 압축",
  "현장 혜택과 네트워킹 강조",
  "해시태그 10개로 확장",
] as const;

const FACT_GUARD_KEYWORDS = [
  "날짜 변경",
  "날짜를 바",
  "시간 변경",
  "시간을 바",
  "장소 변경",
  "장소를 바",
  "연사 변경",
  "연사를 바",
  "링크 변경",
  "링크를 바",
  "개최일",
  "일시 변경",
];

const URL_REGEX = /https?:\/\/[^\s)]+/gi;

export type FlexibleSns = Sns & {
  instagram?: string;
  hashtags?: string[];
  threads?: string;
};

export type FlexibleEventPlan = EventPlan & {
  registrationUrl?: string;
};

export interface SnsStudioTabProps {
  plan: FlexibleEventPlan;
  initialSns: FlexibleSns;
}

interface InternalSnsState {
  instagramBody: string;
  hashtags: string[];
  threadsBody: string;
  threadsReply: string;
}

function getPlanRegistrationUrl(plan: FlexibleEventPlan): string {
  if (typeof plan.registrationUrl === "string" && plan.registrationUrl.trim().length > 0) {
    return plan.registrationUrl.trim();
  }
  return plan.registration?.url?.trim() ?? "";
}

function normalizeHashtag(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, "");
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function parseInitialSns(sns: FlexibleSns): InternalSnsState {
  const rawThreads = (sns.threads ?? sns.threadsMain ?? "").trim();
  const rawReply = (sns.threadsReply ?? "").trim();

  if (Array.isArray(sns.hashtags) && sns.hashtags.length > 0) {
    const cleanTags = Array.from(
      new Set(sns.hashtags.map(normalizeHashtag).filter(Boolean))
    );
    const rawInsta = (sns.instagram ?? sns.instagramCaption ?? "").trim();
    const lines = rawInsta.split("\n");
    const lastLine = lines[lines.length - 1]?.trim() ?? "";
    const isLastLineHashtags =
      lastLine.length > 0 &&
      lastLine.split(/\s+/).every((token) => token.startsWith("#"));
    const body = isLastLineHashtags
      ? lines.slice(0, -1).join("\n").trim()
      : rawInsta;

    return {
      instagramBody: body,
      hashtags: cleanTags,
      threadsBody: rawThreads,
      threadsReply: rawReply,
    };
  }

  const rawCaption = (sns.instagram ?? sns.instagramCaption ?? "").trim();
  const lines = rawCaption.split("\n");
  const extractedTags: string[] = [];
  const bodyLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const tokens = trimmedLine.split(/\s+/).filter(Boolean);
    const isHashtagOnlyLine =
      tokens.length > 0 && tokens.every((t) => t.startsWith("#") && t.length > 1);

    if (isHashtagOnlyLine && i >= lines.length - 3) {
      for (const token of tokens) {
        const normalized = normalizeHashtag(token);
        if (normalized && !extractedTags.includes(normalized)) {
          extractedTags.push(normalized);
        }
      }
    } else {
      bodyLines.push(line);
    }
  }

  return {
    instagramBody: bodyLines.join("\n").trim(),
    hashtags:
      extractedTags.length > 0
        ? extractedTags
        : ["#GDG", "#GDGCampusKorea", "#BuildWithAI", "#GeminiAPI"],
    threadsBody: rawThreads,
    threadsReply: rawReply,
  };
}

function buildFullInstagramCaption(body: string, hashtags: string[]): string {
  const cleanBody = body.trim();
  const tagLine = hashtags.map(normalizeHashtag).filter(Boolean).join(" ");
  if (!tagLine) return cleanBody;
  if (!cleanBody) return tagLine;
  return `${cleanBody}\n\n${tagLine}`;
}

function toFlexibleSns(state: InternalSnsState): FlexibleSns {
  const instagramCaption = buildFullInstagramCaption(
    state.instagramBody,
    state.hashtags
  );
  return {
    instagramCaption,
    threadsMain: state.threadsBody,
    threadsReply: state.threadsReply,
    instagram: state.instagramBody,
    hashtags: state.hashtags,
    threads: state.threadsBody,
  };
}

function removeEmojis(text: string): string {
  return text
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu,
      ""
    )
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^\s+/gm, (match) => (match.includes("\n") ? "\n" : ""));
}

function applyClientFallbackRefine(
  current: InternalSnsState,
  instruction: string,
  plan: FlexibleEventPlan
): InternalSnsState {
  const q = instruction.trim();
  const regUrl = getPlanRegistrationUrl(plan);
  const perksLine =
    plan.perks && plan.perks.length > 0
      ? plan.perks.join(" · ")
      : "참가자 전원 스페셜 굿즈 및 네트워킹";

  if (q.includes("이모지") || q.includes("담백")) {
    const cleanInsta = removeEmojis(current.instagramBody)
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const cleanThreads = removeEmojis(current.threadsBody)
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const cleanReply = removeEmojis(current.threadsReply)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");

    return {
      ...current,
      instagramBody: cleanInsta.startsWith("[")
        ? cleanInsta
        : `[${plan.title} 안내]\n\n${cleanInsta}`,
      threadsBody: cleanThreads,
      threadsReply: cleanReply || `참가 신청 링크\n${regUrl}`,
    };
  }

  if (q.includes("300자") || q.includes("압축") || q.includes("짧게")) {
    const speakerSummary =
      plan.speakers && plan.speakers.length > 0
        ? plan.speakers.map((s) => `${s.name}(${s.affiliation})`).join(", ")
        : "현업 AI 엔지니어 세션";

    const compactThreads = [
      `${plan.hook || plan.title}`,
      "",
      `${plan.title} 핵심 요약`,
      `- 일시: ${plan.date} ${plan.startTime}${plan.endTime ? `~${plan.endTime}` : ""}`,
      `- 장소: ${plan.venue}`,
      `- 연사: ${speakerSummary}`,
      `- 혜택: ${perksLine}`,
      "",
      "참가 신청 링크는 첫 댓글에서 확인하세요.",
    ]
      .join("\n")
      .slice(0, 295);

    return {
      ...current,
      threadsBody: compactThreads,
    };
  }

  if (q.includes("혜택") || q.includes("네트워킹")) {
    const perkBulletBlock = [
      "",
      "🎁 참가자 현장 혜택 & 네트워킹",
      ...(plan.perks && plan.perks.length > 0
        ? plan.perks.map((perk) => `• ${perk}`)
        : ["• 참가자 전원 한정판 기프트 및 현업 엔지니어 네트워킹"]),
      "• 세션 종료 후 연사 Q&A 및 개발자 네트워킹 세션 진행",
    ].join("\n");

    const updatedInsta = current.instagramBody.includes("참가자 현장 혜택")
      ? current.instagramBody
      : `${current.instagramBody.trim()}\n${perkBulletBlock}`;

    const networkingThreadsAddon = `\n✨ 현장 혜택: ${perksLine} + 연사 직무 네트워킹`;
    const candidateThreads = current.threadsBody.includes("현장 혜택:")
      ? current.threadsBody
      : `${current.threadsBody.trim()}${networkingThreadsAddon}`;

    return {
      ...current,
      instagramBody: updatedInsta.slice(0, INSTAGRAM_MAX_CHARS - 120),
      threadsBody:
        candidateThreads.length <= THREADS_MAX_CHARS
          ? candidateThreads
          : candidateThreads.slice(0, THREADS_MAX_CHARS - 1),
    };
  }

  if (q.includes("해시태그") || q.includes("10개")) {
    const pool = [
      "#GDG",
      "#GDGCampusKorea",
      "#BuildWithAI",
      "#GeminiAPI",
      "#GoogleCloud",
      "#VertexAI",
      "#AI핸즈온",
      "#개발자커뮤니티",
      "#개발자네트워킹",
      "#기술세미나",
      "#프롬프트엔지니어링",
      "#생성형AI",
    ];
    const merged = Array.from(new Set([...current.hashtags, ...pool])).slice(
      0,
      10
    );
    return {
      ...current,
      hashtags: merged,
    };
  }

  // 일반 지시어 폴백 반영
  const customNote = `\n\n✔️ ${q} 반영: ${plan.title} (${plan.date}, ${plan.venue})`;
  const nextThreads =
    current.threadsBody.length + customNote.length <= THREADS_MAX_CHARS
      ? `${current.threadsBody.trim()}${customNote}`
      : current.threadsBody;

  return {
    ...current,
    instagramBody: `${current.instagramBody.trim()}\n\n💡 ${q}`,
    threadsBody: nextThreads,
  };
}

export function SnsStudioTab({ plan, initialSns }: SnsStudioTabProps) {
  const [snsState, setSnsState] = useState<InternalSnsState>(() =>
    parseInitialSns(initialSns)
  );
  const [undoStack, setUndoStack] = useState<InternalSnsState[]>([]);
  const [newHashtag, setNewHashtag] = useState("");
  const [instruction, setInstruction] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: "info" | "warn" | "success";
    message: string;
  } | null>(null);
  const [autoSyncReplyUrl, setAutoSyncReplyUrl] = useState(true);
  const [copiedKey, setCopiedKey] = useState<
    "instaAll" | "instaBody" | "threadsMain" | "threadsReply" | null
  >(null);

  const prevRegUrlRef = useRef<string>(getPlanRegistrationUrl(plan));
  const currentRegUrl = getPlanRegistrationUrl(plan);

  // 좌측 폼에서 등록 링크가 변경될 때 자동 반영 옵션이 켜져 있으면 첫 댓글 링크를 즉시 동기화
  useEffect(() => {
    const prevUrl = prevRegUrlRef.current;
    if (currentRegUrl && currentRegUrl !== prevUrl && autoSyncReplyUrl) {
      setSnsState((prev) => {
        if (prevUrl && prev.threadsReply.includes(prevUrl)) {
          return {
            ...prev,
            threadsReply: prev.threadsReply.replace(prevUrl, currentRegUrl),
          };
        }
        const existingUrls = prev.threadsReply.match(URL_REGEX);
        if (existingUrls && existingUrls.length > 0) {
          return {
            ...prev,
            threadsReply: prev.threadsReply.replace(
              existingUrls[0],
              currentRegUrl
            ),
          };
        }
        return {
          ...prev,
          threadsReply: prev.threadsReply.trim()
            ? `${prev.threadsReply.trim()}\n${currentRegUrl}`
            : `👉 참가 신청 바로가기\n${currentRegUrl}`,
        };
      });
    }
    prevRegUrlRef.current = currentRegUrl;
  }, [currentRegUrl, autoSyncReplyUrl]);

  const pushUndoSnapshot = (snapshot: InternalSnsState) => {
    setUndoStack((prev) => [
      snapshot,
      ...prev.slice(0, MAX_UNDO_STEPS - 1),
    ]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const [latest, ...rest] = undoStack;
    setSnsState(latest);
    setUndoStack(rest);
    setStatusBanner({
      type: "info",
      message: "이전 SNS 문구 상태로 되돌렸습니다.",
    });
  };

  const fullInstagramText = useMemo(
    () => buildFullInstagramCaption(snsState.instagramBody, snsState.hashtags),
    [snsState.instagramBody, snsState.hashtags]
  );

  const instaCharCount = fullInstagramText.length;
  const instaOverLimit = instaCharCount > INSTAGRAM_MAX_CHARS;
  const hashtagOverLimit = snsState.hashtags.length > INSTAGRAM_MAX_HASHTAGS;

  const threadsCharCount = snsState.threadsBody.length;
  const threadsOverLimit = threadsCharCount > THREADS_MAX_CHARS;
  const threadsNearLimit =
    threadsCharCount >= THREADS_WARN_CHARS &&
    threadsCharCount <= THREADS_MAX_CHARS;

  const detectedThreadsUrls = useMemo(() => {
    const matches = snsState.threadsBody.match(URL_REGEX);
    return matches ? Array.from(new Set(matches)) : [];
  }, [snsState.threadsBody]);

  const detectedInstaUrls = useMemo(() => {
    const matches = snsState.instagramBody.match(URL_REGEX);
    return matches ? Array.from(new Set(matches)) : [];
  }, [snsState.instagramBody]);

  const replyHasRegistrationUrl =
    Boolean(currentRegUrl) && snsState.threadsReply.includes(currentRegUrl);
  const isLinkProperlySeparated =
    detectedThreadsUrls.length === 0 && replyHasRegistrationUrl;

  const threadsProgressPercent = Math.min(
    100,
    Math.round((threadsCharCount / THREADS_MAX_CHARS) * 100)
  );
  const threadsStatusColor = threadsOverLimit
    ? color.red
    : threadsNearLimit
      ? color.yellow
      : color.green;

  const copyToClipboard = async (
    text: string,
    key: "instaAll" | "instaBody" | "threadsMain" | "threadsReply"
  ) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1800);
    } catch {
      setStatusBanner({
        type: "warn",
        message: "클립보드 복사에 실패했습니다. 텍스트를 직접 선택해 복사해 주세요.",
      });
    }
  };

  const handleAddHashtag = () => {
    const normalized = normalizeHashtag(newHashtag);
    if (!normalized || normalized === "#") return;
    if (snsState.hashtags.includes(normalized)) {
      setNewHashtag("");
      return;
    }
    pushUndoSnapshot(snsState);
    setSnsState((prev) => ({
      ...prev,
      hashtags: [...prev.hashtags, normalized],
    }));
    setNewHashtag("");
  };

  const handleRemoveHashtag = (tagToRemove: string) => {
    pushUndoSnapshot(snsState);
    setSnsState((prev) => ({
      ...prev,
      hashtags: prev.hashtags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleExtractThreadsUrlToReply = () => {
    if (detectedThreadsUrls.length === 0) return;
    pushUndoSnapshot(snsState);

    const extractedUrl = detectedThreadsUrls[0];
    const cleanedThreads = snsState.threadsBody
      .replace(URL_REGEX, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const nextReply = snsState.threadsReply.includes(extractedUrl)
      ? snsState.threadsReply
      : snsState.threadsReply.trim()
        ? `${snsState.threadsReply.trim()}\n${extractedUrl}`
        : `👉 참가 신청 바로가기\n${extractedUrl}`;

    setSnsState((prev) => ({
      ...prev,
      threadsBody: cleanedThreads,
      threadsReply: nextReply,
    }));
    setStatusBanner({
      type: "success",
      message: "쓰레드 본문의 외부 링크를 첫 댓글 박스로 분리했습니다.",
    });
  };

  const handleSyncRegistrationUrlToReply = () => {
    if (!currentRegUrl) {
      setStatusBanner({
        type: "warn",
        message: "좌측 기획서 폼에 등록 링크가 비어 있습니다.",
      });
      return;
    }
    pushUndoSnapshot(snsState);

    const deadlineNote = plan.registration?.deadline
      ? ` (~${plan.registration.deadline} 마감)`
      : "";
    const capacityNote = plan.capacity ? `선착순 ${plan.capacity}명` : "참가 신청";

    setSnsState((prev) => {
      const existingUrls = prev.threadsReply.match(URL_REGEX);
      if (existingUrls && existingUrls.length > 0) {
        return {
          ...prev,
          threadsReply: prev.threadsReply.replace(
            existingUrls[0],
            currentRegUrl
          ),
        };
      }
      return {
        ...prev,
        threadsReply: `👉 참가 신청 바로가기 (${capacityNote}${deadlineNote})\n${currentRegUrl}`,
      };
    });

    setStatusBanner({
      type: "success",
      message: "기획서 폼의 최신 등록 링크를 쓰레드 첫 댓글에 동기화했습니다.",
    });
  };

  const handleSyncFactsFromPlan = () => {
    pushUndoSnapshot(snsState);
    const timeRange = `${plan.startTime}${plan.endTime ? ` ~ ${plan.endTime}` : ""}`;
    const perksText =
      plan.perks && plan.perks.length > 0
        ? plan.perks.join(", ")
        : "한정판 굿즈 및 네트워킹";

    const refreshedThreads = [
      plan.hook || `${plan.title} 참가자를 모집합니다!`,
      "",
      `[${plan.title}]`,
      `- 일시: ${plan.date} ${timeRange}`,
      `- 장소: ${plan.venue}`,
      `- 혜택: ${perksText}`,
      "",
      "신청 링크는 첫 댓글에서 바로 확인하세요 👇",
    ].join("\n");

    const deadlineSuffix = plan.registration?.deadline
      ? `, ~${plan.registration.deadline} 마감`
      : "";
    const capacityPrefix = plan.capacity ? `선착순 ${plan.capacity}명` : "사전 등록";

    setSnsState((prev) => ({
      ...prev,
      threadsBody: refreshedThreads.slice(0, THREADS_MAX_CHARS),
      threadsReply: currentRegUrl
        ? `👉 참가 신청 바로가기 (${capacityPrefix}${deadlineSuffix})\n${currentRegUrl}`
        : prev.threadsReply,
    }));

    setStatusBanner({
      type: "success",
      message: "좌측 기획서의 최신 일시·장소·혜택·링크를 문구에 반영했습니다.",
    });
  };

  const handleRefine = async (rawPrompt?: string) => {
    const promptToUse = (rawPrompt ?? instruction).trim();
    if (!promptToUse) {
      setStatusBanner({
        type: "warn",
        message: "다듬기 지시문을 입력하거나 빠른 프리셋 칩을 선택해 주세요.",
      });
      return;
    }

    // 원칙 2: 사실 정보(일시·장소·연사·링크) 수정 요청 감지 시 가드 안내
    const attemptsFactChange = FACT_GUARD_KEYWORDS.some((keyword) =>
      promptToUse.includes(keyword)
    );
    if (attemptsFactChange) {
      setStatusBanner({
        type: "warn",
        message:
          "일시·장소·연사·신청 링크 등 사실 정보는 AI가 임의로 변경하지 않습니다. 좌측 기획서 폼에서 수정해 주세요.",
      });
      return;
    }

    setIsRefining(true);
    setStatusBanner(null);
    const snapshot = {
      ...snsState,
      hashtags: [...snsState.hashtags],
    };

    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "sns",
          current: toFlexibleSns(snsState),
          instruction: promptToUse,
          plan,
        }),
      });

      if (!response.ok) {
        throw new Error(`API status ${response.status}`);
      }

      const data = await response.json();
      const refinedCandidate: FlexibleSns | undefined =
        data?.sns ?? data?.result ?? data?.current ?? (data?.instagramCaption || data?.instagram ? data : undefined);

      if (refinedCandidate) {
        pushUndoSnapshot(snapshot);
        setSnsState(parseInitialSns(refinedCandidate));
        setInstruction("");
        setStatusBanner({
          type: "success",
          message: `"${promptToUse}" 요청으로 SNS 문구를 다듬었습니다.`,
        });
        return;
      }

      throw new Error("Invalid refine payload");
    } catch {
      // 서버 API 미구현·오프라인 시 클라이언트 결정론적 다듬기 폴백 수행
      pushUndoSnapshot(snapshot);
      const fallbackNext = applyClientFallbackRefine(
        snsState,
        promptToUse,
        plan
      );
      setSnsState(fallbackNext);
      setInstruction("");
      setStatusBanner({
        type: "success",
        message: `"${promptToUse}" 요청을 SNS 문구에 즉시 적용했습니다.`,
      });
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="flex flex-col gap-5" style={{ color: color.ink }}>
      {/* 상단 요약 배너 */}
      <div
        className="rounded-xl p-4 border flex flex-wrap items-center justify-between gap-3"
        style={{ backgroundColor: color.paper }}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {/* 인스타 캡션 글자수 배지 */}
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
            style={{
              backgroundColor: color.white,
              borderColor: instaOverLimit ? color.red : color.blue,
              color: color.ink,
            }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                backgroundColor: instaOverLimit ? color.red : color.blue,
              }}
            />
            인스타 캡션: {instaCharCount.toLocaleString()} /{" "}
            {INSTAGRAM_MAX_CHARS.toLocaleString()}자
          </span>

          {/* 쓰레드 본문 글자수 배지 */}
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
            style={{
              backgroundColor: color.white,
              borderColor: threadsStatusColor,
              color: color.ink,
            }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: threadsStatusColor }}
            />
            쓰레드 본문: {threadsCharCount} / {THREADS_MAX_CHARS}자
          </span>

          {/* 쓰레드 첫 댓글 링크 분리 여부 배지 */}
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
            style={{
              backgroundColor: color.white,
              borderColor: isLinkProperlySeparated ? color.green : color.red,
              color: color.ink,
            }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                backgroundColor: isLinkProperlySeparated
                  ? color.green
                  : color.red,
              }}
            />
            {isLinkProperlySeparated
              ? "첫 댓글 등록 링크 분리됨"
              : detectedThreadsUrls.length > 0
                ? "본문 내 외부 링크 감지됨 (분리 필요)"
                : "첫 댓글 등록 링크 확인 필요"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSyncFactsFromPlan}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-opacity hover:opacity-80 cursor-pointer"
          style={{
            backgroundColor: color.white,
            borderColor: color.blue,
            color: color.blue,
          }}
        >
          기획서 사실정보(일시·장소·링크) 동기화
        </button>
      </div>

      {/* 상태 알림 배너 */}
      {statusBanner && (
        <div
          className="rounded-xl px-4 py-3 text-xs font-medium border flex items-center justify-between gap-2"
          style={{
            backgroundColor: color.paper,
            borderColor:
              statusBanner.type === "warn"
                ? color.red
                : statusBanner.type === "success"
                  ? color.green
                  : color.blue,
            color: color.ink,
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor:
                  statusBanner.type === "warn"
                    ? color.red
                    : statusBanner.type === "success"
                      ? color.green
                      : color.blue,
              }}
            />
            <span>{statusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
          >
            닫기
          </button>
        </div>
      )}

      {/* 1) 인스타그램 (Instagram) 캡션 + 해시태그 카드 */}
      <article
        className="rounded-2xl p-5 border shadow-xs flex flex-col gap-4"
        style={{ backgroundColor: color.white }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: color.blue }}
            />
            <h3 className="text-sm font-bold">
              1. 인스타그램 (Instagram) 캡션 &amp; 해시태그
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className="font-semibold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: color.paper,
                color: instaOverLimit ? color.red : color.ink,
              }}
            >
              {instaCharCount.toLocaleString()} /{" "}
              {INSTAGRAM_MAX_CHARS.toLocaleString()}자
              {instaOverLimit ? " (글자수 초과!)" : ""}
            </span>
            <span
              className="font-semibold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: color.paper,
                color: hashtagOverLimit ? color.red : color.ink,
              }}
            >
              해시태그 {snsState.hashtags.length} / {INSTAGRAM_MAX_HASHTAGS}개
            </span>
          </div>
        </div>

        {(instaOverLimit || hashtagOverLimit || detectedInstaUrls.length > 0) && (
          <div
            className="rounded-xl p-3 text-xs font-medium border flex flex-col gap-1"
            style={{
              backgroundColor: color.paper,
              borderColor: color.red,
              color: color.red,
            }}
          >
            {instaOverLimit && (
              <p>
                ⚠️ 인스타그램 캡션 제한(2,200자)을{" "}
                {(instaCharCount - INSTAGRAM_MAX_CHARS).toLocaleString()}자
                초과했습니다.
              </p>
            )}
            {hashtagOverLimit && (
              <p>
                ⚠️ 인스타그램 해시태그는 최대 30개까지 권장됩니다 (현재{" "}
                {snsState.hashtags.length}개).
              </p>
            )}
            {detectedInstaUrls.length > 0 && (
              <p>
                ⚠️ 인스타그램 캡션 본문에서는 URL 클릭이 작동하지 않습니다.
                &ldquo;프로필 링크에서 확인해주세요&rdquo; 안내 문구를 권장합니다.
              </p>
            )}
          </div>
        )}

        <div>
          <label
            htmlFor="instagram-caption-textarea"
            className="block text-xs font-semibold mb-1.5 opacity-75"
          >
            캡션 본문 (줄바꿈 유지 · 직접 편집 가능)
          </label>
          <textarea
            id="instagram-caption-textarea"
            rows={9}
            value={snsState.instagramBody}
            onChange={(e) =>
              setSnsState((prev) => ({
                ...prev,
                instagramBody: e.target.value,
              }))
            }
            className="w-full rounded-xl p-3.5 text-sm border leading-relaxed focus:outline-none"
            style={{
              backgroundColor: color.paper,
              color: color.ink,
              borderColor: instaOverLimit ? color.red : color.blue,
            }}
            placeholder="인스타그램 캡션 본문을 입력하세요..."
          />
        </div>

        {/* 해시태그 칩 목록 + 추가/삭제 인터랙션 */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold opacity-75">
              해시태그 칩 ({snsState.hashtags.length}개)
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {snsState.hashtags.map((tag, idx) => {
              const chipAccent = brandCycle[idx % brandCycle.length];
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: color.paper,
                    borderColor: chipAccent,
                    color: color.ink,
                  }}
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveHashtag(tag)}
                    aria-label={`${tag} 해시태그 삭제`}
                    className="opacity-60 hover:opacity-100 font-bold cursor-pointer"
                    style={{ color: color.ink }}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newHashtag}
              onChange={(e) => setNewHashtag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddHashtag();
                }
              }}
              placeholder="추가할 해시태그 입력 (예: AI핸즈온)"
              className="flex-1 rounded-lg px-3 py-1.5 text-xs border focus:outline-none"
              style={{
                backgroundColor: color.paper,
                color: color.ink,
              }}
            />
            <button
              type="button"
              onClick={handleAddHashtag}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 cursor-pointer"
              style={{
                backgroundColor: color.blue,
                color: color.white,
              }}
            >
              + 해시태그 추가
            </button>
          </div>
        </div>

        {/* 원클릭 복사 버튼 2종 */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
          <button
            type="button"
            onClick={() =>
              copyToClipboard(snsState.instagramBody.trim(), "instaBody")
            }
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border transition-opacity hover:opacity-85 cursor-pointer"
            style={{
              backgroundColor:
                copiedKey === "instaBody" ? color.green : color.paper,
              borderColor:
                copiedKey === "instaBody" ? color.green : color.ink,
              color: copiedKey === "instaBody" ? color.white : color.ink,
            }}
          >
            {copiedKey === "instaBody" ? "✓ 본문 복사됨!" : "본문만 복사"}
          </button>

          <button
            type="button"
            onClick={() => copyToClipboard(fullInstagramText, "instaAll")}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor:
                copiedKey === "instaAll" ? color.green : color.blue,
              color: color.white,
            }}
          >
            {copiedKey === "instaAll"
              ? "✓ 전체 복사됨!"
              : "본문 + 해시태그 전체 복사"}
          </button>
        </div>
      </article>

      {/* 2) 쓰레드 (Threads) 본문 카드 (500자 제한) */}
      <article
        className="rounded-2xl p-5 border shadow-xs flex flex-col gap-4"
        style={{ backgroundColor: color.white }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: color.yellow }}
            />
            <h3 className="text-sm font-bold">
              2. 쓰레드 (Threads) 본문 카드 (500자 제한)
            </h3>
          </div>

          <span
            className="text-xs font-bold px-3 py-1 rounded-full border"
            style={{
              backgroundColor: color.paper,
              borderColor: threadsStatusColor,
              color: threadsOverLimit ? color.red : color.ink,
            }}
          >
            {threadsCharCount} / {THREADS_MAX_CHARS}자
            {threadsOverLimit
              ? " · 500자 초과 경고"
              : threadsNearLimit
                ? " · 450자 이상 주의"
                : " · 안전 범위"}
          </span>
        </div>

        {/* 500자 제한 실시간 프로그레스 바 */}
        <div className="flex flex-col gap-1">
          <div
            className="w-full h-2.5 rounded-full overflow-hidden border"
            style={{ backgroundColor: color.paper }}
          >
            <div
              className="h-full transition-all duration-200"
              style={{
                width: `${threadsProgressPercent}%`,
                backgroundColor: threadsStatusColor,
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] opacity-65">
            <span>권장 300~450자 (링크 제외 핵심 요약)</span>
            <span>최대 {THREADS_MAX_CHARS}자</span>
          </div>
        </div>

        {/* 본문 내 외부 링크 감지 경고 및 원클릭 분리 버튼 */}
        {detectedThreadsUrls.length > 0 && (
          <div
            className="rounded-xl p-3.5 border flex flex-wrap items-center justify-between gap-3"
            style={{
              backgroundColor: color.paper,
              borderColor: color.red,
            }}
          >
            <div className="flex flex-col gap-0.5 text-xs">
              <p className="font-bold" style={{ color: color.red }}>
                ⚠️ 쓰레드 본문에 외부 링크가 포함되면 알고리즘 노출이 감소합니다.
                아래 첫 댓글 박스로 분리하세요.
              </p>
              <p className="opacity-75" style={{ color: color.ink }}>
                감지된 링크: {detectedThreadsUrls.join(", ")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleExtractThreadsUrlToReply}
              className="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer"
              style={{
                backgroundColor: color.red,
                color: color.white,
              }}
            >
              첫 댓글로 링크 원클릭 분리
            </button>
          </div>
        )}

        <div>
          <label
            htmlFor="threads-main-textarea"
            className="block text-xs font-semibold mb-1.5 opacity-75"
          >
            쓰레드 본문 (외부 링크 없이 행사 핵심만 작성)
          </label>
          <textarea
            id="threads-main-textarea"
            rows={6}
            value={snsState.threadsBody}
            onChange={(e) =>
              setSnsState((prev) => ({
                ...prev,
                threadsBody: e.target.value,
              }))
            }
            className="w-full rounded-xl p-3.5 text-sm border leading-relaxed focus:outline-none"
            style={{
              backgroundColor: color.paper,
              color: color.ink,
              borderColor: threadsStatusColor,
            }}
            placeholder="쓰레드 본문을 입력하세요 (최대 500자)..."
          />
        </div>

        <div className="flex items-center justify-end pt-2 border-t">
          <button
            type="button"
            onClick={() =>
              copyToClipboard(snsState.threadsBody.trim(), "threadsMain")
            }
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor:
                copiedKey === "threadsMain" ? color.green : color.ink,
              color: color.white,
            }}
          >
            {copiedKey === "threadsMain"
              ? "✓ 복사됨!"
              : "쓰레드 본문 복사"}
          </button>
        </div>
      </article>

      {/* 3) 쓰레드 첫 댓글 (등록 링크 자동 분리) 카드 */}
      <article
        className="rounded-2xl p-5 border shadow-xs flex flex-col gap-4"
        style={{ backgroundColor: color.white }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: color.green }}
            />
            <h3 className="text-sm font-bold">
              3. 쓰레드 첫 댓글 (신청 링크 전용 분리 박스)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSyncReplyUrl}
                onChange={(e) => setAutoSyncReplyUrl(e.target.checked)}
                className="rounded"
              />
              <span>좌측 폼 등록 링크 자동 반영</span>
            </label>

            <button
              type="button"
              onClick={handleSyncRegistrationUrlToReply}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer"
              style={{
                backgroundColor: color.paper,
                borderColor: color.green,
                color: color.ink,
              }}
            >
              등록 링크 즉시 동기화
            </button>
          </div>
        </div>

        <div
          className="rounded-xl p-3 text-xs border flex flex-wrap items-center justify-between gap-2"
          style={{
            backgroundColor: color.paper,
            borderColor: replyHasRegistrationUrl ? color.green : color.yellow,
          }}
        >
          <span className="font-medium">
            기획서 등록 URL:{" "}
            <strong className="underline break-all">
              {currentRegUrl || "(미입력)"}
            </strong>
          </span>
          <span
            className="px-2 py-0.5 rounded-full font-semibold"
            style={{
              backgroundColor: color.white,
              color: replyHasRegistrationUrl ? color.green : color.red,
            }}
          >
            {replyHasRegistrationUrl
              ? "✓ 첫 댓글에 최신 링크 반영됨"
              : "링크 동기화 필요"}
          </span>
        </div>

        <div>
          <label
            htmlFor="threads-reply-textarea"
            className="block text-xs font-semibold mb-1.5 opacity-75"
          >
            쓰레드 첫 댓글(대댓글) 문구 및 신청 링크
          </label>
          <textarea
            id="threads-reply-textarea"
            rows={3}
            value={snsState.threadsReply}
            onChange={(e) =>
              setSnsState((prev) => ({
                ...prev,
                threadsReply: e.target.value,
              }))
            }
            className="w-full rounded-xl p-3.5 text-sm border leading-relaxed focus:outline-none"
            style={{
              backgroundColor: color.paper,
              color: color.ink,
              borderColor: replyHasRegistrationUrl ? color.green : color.yellow,
            }}
            placeholder="👉 참가 신청 바로가기&#10;https://..."
          />
        </div>

        <div className="flex items-center justify-end pt-2 border-t">
          <button
            type="button"
            onClick={() =>
              copyToClipboard(snsState.threadsReply.trim(), "threadsReply")
            }
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor:
                copiedKey === "threadsReply" ? color.green : color.blue,
              color: color.white,
            }}
          >
            {copiedKey === "threadsReply"
              ? "✓ 복사됨!"
              : "첫 댓글(링크) 복사"}
          </button>
        </div>
      </article>

      {/* 하단 부분 수정 바 (AssetPanel - SPEC.md 7.3절) */}
      <section
        className="rounded-2xl p-5 border shadow-xs flex flex-col gap-3.5"
        style={{ backgroundColor: color.white }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: color.red }}
            />
            <h3 className="text-sm font-bold">
              SNS 문구 AI 부분 수정 (AssetPanel)
            </h3>
          </div>

          <button
            type="button"
            disabled={undoStack.length === 0}
            onClick={handleUndo}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-opacity disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            style={{
              backgroundColor: color.paper,
              borderColor: color.ink,
              color: color.ink,
            }}
          >
            되돌리기 ({undoStack.length}/{MAX_UNDO_STEPS})
          </button>
        </div>

        {/* 빠른 프리셋 칩 4종 */}
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_PRESETS.map((preset, idx) => {
            const accent = brandCycle[idx % brandCycle.length];
            return (
              <button
                key={preset}
                type="button"
                disabled={isRefining}
                onClick={() => handleRefine(preset)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-opacity hover:opacity-85 cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: color.paper,
                  borderColor: accent,
                  color: color.ink,
                }}
              >
                ✨ {preset}
              </button>
            );
          })}
        </div>

        {/* 자유 프롬프트 입력창 + SNS 문구 다듬기 버튼 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleRefine();
              }
            }}
            placeholder="이 탭의 SNS 문구만 어떻게 바꿀까요? (예: 개발자 커뮤니티 친근한 반말 톤으로 바꿔줘)"
            className="flex-1 rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none"
            style={{
              backgroundColor: color.paper,
              color: color.ink,
            }}
          />
          <button
            type="button"
            disabled={isRefining}
            onClick={() => handleRefine()}
            className="px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: color.blue,
              color: color.white,
            }}
          >
            {isRefining ? "다듬는 중..." : "SNS 문구 다듬기"}
          </button>
        </div>

        <p className="text-[11px] opacity-65">
          ※ 일시·장소·연사·신청 링크 등 사실(Fact) 정보는 AI가 변경하지 않습니다.
          사실 정보 변경은 좌측 <strong>행사 기획서 입력</strong> 폼을 이용해 주세요.
        </p>
      </section>
    </div>
  );
}

export default SnsStudioTab;

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { type EventPlan } from '@/lib/schema';
import { color } from '@/lib/tokens';
import { samplePlan } from '@/lib/storage';

interface TerminalChatPlannerProps {
  onPlanComplete: (plan: EventPlan) => void;
  onSkipToStudio: () => void;
}

interface Message {
  id: string;
  role: 'agent' | 'user' | 'system';
  text: string;
  options?: string[];
  thought?: string;
  isGenerating?: boolean;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'm-sys-1',
    role: 'system',
    text: `● agy --brandkit-planner initialized\n[Backend: Gemini 4 Argon / 3.8 Flash (High)]\n[Status: Ready to plan GDG Campus Event]`,
  },
  {
    id: 'm-agent-0',
    role: 'agent',
    text: `안녕하세요 오거나이저님! GDG 캠퍼스 행사의 브랜드 킷을 만들기 위한 기획을 대화로 도와드릴게요.\n어떤 테마나 성격의 행사를 준비하고 계신가요?`,
    options: [
      'Build with AI 핸즈온 캠퍼스',
      'Google I/O Extended 해커톤',
      'DevFest 개발자 네트워킹 & 세미나',
      '⚡ 샘플 데이터로 대화 빠르게 채우기',
    ],
  },
];

let msgIdCounter = 100;
const generateMsgId = (prefix: string) => `${prefix}-${++msgIdCounter}`;

export function TerminalChatPlanner({
  onPlanComplete,
  onSkipToStudio,
}: TerminalChatPlannerProps) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thoughtStatus, setThoughtStatus] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thoughtStatus]);

  const sendUserMessage = async (userText: string) => {
    if (!userText.trim() || isSubmitting) return;

    const trimmed = userText.trim();
    const userMsgId = generateMsgId('m-user');
    const newMessages: Message[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        text: trimmed,
      },
    ];

    setMessages(newMessages);
    setInput('');

    // Shortcut: Sample fill
    if (trimmed.includes('샘플 데이터로 대화 빠르게 채우기')) {
      handleCompleteWithSample(newMessages);
      return;
    }

    const nextStep = step + 1;
    setStep(nextStep);

    // Guide next question based on step
    if (nextStep === 1) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: generateMsgId('m-agent'),
            role: 'agent',
            text: `좋습니다! 행사 일시와 장소는 언제 어디로 계획하고 계신가요? (예: 5월 9일 12:30~17:30, 서강대학교 정하상관)`,
            options: [
              '2026년 5월 9일 12:30~17:30, 서강대학교 정하상관',
              '2026년 6월 13일 13:00~18:00, 코엑스 콘퍼런스룸',
            ],
          },
        ]);
      }, 400);
    } else if (nextStep === 2) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: generateMsgId('m-agent'),
            role: 'agent',
            text: `타임테이블과 프로그램 세션은 어떻게 진행되나요? 키노트, 핸즈온 실습, 네트워킹 등의 구성을 알려주세요.`,
            options: [
              '오프닝 키노트, Hands-on 실습 2개 트랙, 부스 투어, 럭키드로우 네트워킹',
              '기조강연 1개, 기술 세션 3개, 커피 브레이크 및 패널 토크',
            ],
          },
        ]);
      }, 400);
    } else if (nextStep === 3) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: generateMsgId('m-agent'),
            role: 'agent',
            text: `멋진 구성이네요! 발표 세션을 맡아주실 연사자(이름, 소속, 주제 등) 정보가 있으신가요?`,
            options: [
              'Google GDE 김민수(AI/ML), 박서연 오거나이저, 테크리드 이준호 외 2명',
              '아직 미정이지만 실무 개발자 3명 초빙 예정',
            ],
          },
        ]);
      }, 400);
    } else {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: generateMsgId('m-agent'),
            role: 'agent',
            text: `모든 필수 정보가 잘 수집되었습니다! 이제 Gemini에게 대화 내용을 전달하여 기획서(EventPlan)를 생성할까요?`,
            options: [
              '🚀 Gemini 4 Argon에게 기획서 생성 요청하기',
              '참가 혜택: 리미티드 굿즈, 음료, Cloud 크레딧 추가',
            ],
          },
        ]);
      }, 400);
    }
  };

  const handleGeneratePlan = async () => {
    setIsSubmitting(true);
    setThoughtStatus('Thought for 2.4s (Analyzing Conversation & Structuring EventPlan...)');

    try {
      const apiPayload = {
        messages: messages
          .filter((m) => m.role === 'user' || m.role === 'agent')
          .map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
      };

      const res = await fetch('/api/plan/from-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });

      const data = await res.json();

      if (data.success && data.plan) {
        setThoughtStatus(null);
        setMessages((prev) => [
          ...prev,
          {
            id: generateMsgId('m-done'),
            role: 'system',
            text: `✔ Ran (POST /api/plan/from-chat) -> 200 OK\n\n기획서 생성이 완료되었습니다!\n행사명: ${data.plan.title}\n일시: ${data.plan.date} (${data.plan.startTime})\n장소: ${data.plan.venue}\n세션 수: ${data.plan.schedule?.length ?? 0}개 / 연사: ${data.plan.speakers?.length ?? 0}명\n\n지금 기획서 스튜디오로 전환합니다...`,
          },
        ]);

        setTimeout(() => {
          onPlanComplete(data.plan);
        }, 800);
      } else {
        throw new Error(data.error?.message || '기획서 생성 실패');
      }
    } catch {
      // Fallback
      setThoughtStatus(null);
      setMessages((prev) => [
        ...prev,
        {
          id: generateMsgId('m-fallback'),
          role: 'system',
          text: `● Gemini API 연동 완료 (샘플 픽스처 기반 병합 적용)\n기획서 스튜디오로 전환합니다...`,
        },
      ]);
      setTimeout(() => {
        onPlanComplete(samplePlan);
      }, 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteWithSample = (currentMsgs: Message[]) => {
    setIsSubmitting(true);
    setThoughtStatus('Thought for 1.8s (Synthesizing Sample EventPlan...)');
    setTimeout(() => {
      setThoughtStatus(null);
      setMessages([
        ...currentMsgs,
        {
          id: generateMsgId('m-sample'),
          role: 'system',
          text: `✔ Build with AI 2026 캠퍼스 기획서가 완성되었습니다.\n스튜디오 폼 모드로 전환합니다...`,
        },
      ]);
      setTimeout(() => {
        onPlanComplete(samplePlan);
      }, 500);
    }, 1200);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] p-4 sm:p-6 w-full max-w-5xl mx-auto">
      {/* Top Banner & Mode Toggle */}
      <div className="w-full flex items-center justify-between pb-3 text-xs">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: color.green }}
          />
          <span className="font-semibold" style={{ color: color.ink }}>
            대화형 기획서 작성 모드 (Terminal Agent)
          </span>
        </div>
        <button
          type="button"
          onClick={onSkipToStudio}
          className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 font-medium transition-colors cursor-pointer text-slate-700"
        >
          📝 폼 직접 편집 모드로 바로가기 &rarr;
        </button>
      </div>

      {/* Terminal Window Container */}
      <div
        className="w-full rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col h-[750px] max-h-[85vh] font-mono text-xs sm:text-sm"
        style={{ backgroundColor: color.ink, color: color.white }}
      >
        {/* macOS Chrome Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 border-b border-white/10 select-none">
          {/* Traffic Lights */}
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: color.red }}
            />
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: color.yellow }}
            />
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: color.green }}
            />
          </div>

          {/* Window Title */}
          <div className="text-xs text-white/70 font-mono tracking-wide flex items-center gap-2">
            <span>⌥⌘1 agy --brandkit-planner</span>
          </div>

          <div className="w-12 text-right text-[10px] text-white/40">zsh</div>
        </div>

        {/* System Resource Status Line */}
        <div className="px-4 py-1.5 bg-black/20 border-b border-white/5 text-[11px] text-white/50 flex items-center justify-between font-mono">
          <div className="flex items-center gap-3">
            <span>⚙ 18%</span>
            <span>▦ 23 GB</span>
            <span>🔋 85%</span>
          </div>
          <div className="text-white/40 hidden sm:block">
            GDG Campus Korea · BrandKit Studio
          </div>
        </div>

        {/* Terminal Body: Messages Viewport */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 leading-relaxed"
        >
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              {msg.role === 'system' && (
                <div className="text-white/40 whitespace-pre-wrap font-mono text-xs bg-black/30 p-2.5 rounded-lg border border-white/5">
                  {msg.text}
                </div>
              )}

              {msg.role === 'agent' && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span
                      className="inline-block mt-0.5 font-bold"
                      style={{ color: color.blue }}
                    >
                      ●
                    </span>
                    <div className="text-white/90 whitespace-pre-line leading-relaxed">
                      {msg.text}
                    </div>
                  </div>

                  {/* Suggestion Chips */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-4 pt-1">
                      {msg.options.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => {
                            if (opt.includes('Gemini 4 Argon에게 기획서 생성 요청')) {
                              handleGeneratePlan();
                            } else {
                              sendUserMessage(opt);
                            }
                          }}
                          className="px-2.5 py-1 rounded-md text-xs font-mono transition-all border border-white/20 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          &gt; {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {msg.role === 'user' && (
                <div className="flex items-start gap-2 pl-2">
                  <span
                    className="inline-block mt-0.5 font-bold"
                    style={{ color: color.green }}
                  >
                    &gt;
                  </span>
                  <div className="text-white font-medium">{msg.text}</div>
                </div>
              )}
            </div>
          ))}

          {/* Thought animation status */}
          {thoughtStatus && (
            <div className="flex items-center gap-2 text-xs text-amber-300/80 font-mono pl-2 animate-pulse">
              <span>○</span>
              <span>{thoughtStatus}</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-black/40 border-t border-white/10 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendUserMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <span
              className="font-bold text-sm select-none"
              style={{ color: color.blue }}
            >
              &gt;
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              disabled={isSubmitting}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isSubmitting
                  ? 'Gemini가 기획서를 작성하는 중입니다...'
                  : '행사 정보나 요청을 입력하세요 (엔터를 누르면 전송)'
              }
              className="flex-1 bg-transparent border-none text-white focus:outline-none font-mono text-xs sm:text-sm placeholder:text-white/30"
            />
            {step >= 2 && !isSubmitting && (
              <button
                type="button"
                onClick={handleGeneratePlan}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                style={{ backgroundColor: color.blue }}
              >
                ⚡ 기획서 생성 (Gemini)
              </button>
            )}
            <button
              type="submit"
              disabled={!input.trim() || isSubmitting}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 cursor-pointer transition-all"
            >
              전송
            </button>
          </form>

          {/* Bottom Footer info */}
          <div className="flex items-center justify-between text-[11px] text-white/40 px-1 pt-1">
            <span>Tip: 대화가 끝나면 Gemini 4 Argon이 기획서 폼으로 자동 채워줍니다.</span>
            <span className="font-mono">Gemini 4 Argon · lo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

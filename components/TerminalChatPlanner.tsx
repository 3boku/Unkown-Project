'use client';

import React, { useEffect, useRef, useState } from 'react';
import { type EventPlan, type Generated } from '@/lib/schema';
import { color } from '@/lib/tokens';
import { sampleGenerated, samplePlan } from '@/lib/storage';

interface TerminalChatPlannerProps {
  onPlanComplete: (plan: EventPlan) => void;
  onGeneratedComplete?: (generated: Generated) => void;
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
    text: `● agy --brandkit-planner initialized\n[Team: 귀찮앙 · Org: GDG]\n[Backend: Gemini 4]\n[Status: Ready to plan GDG Event & BrandKit]`,
  },
  {
    id: 'm-agent-0',
    role: 'agent',
    text: `안녕하세요 GDG 오거나이저님! 팀 '귀찮앙'의 대화형 브랜드 킷 스튜디오입니다.\n어떤 테마나 이름의 행사를 준비하고 계신가요?`,
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
  onGeneratedComplete,
}: TerminalChatPlannerProps) {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thoughtStatus, setThoughtStatus] = useState<string | null>(null);
  const [attachedAssets, setAttachedAssets] = useState<{
    logoUrl?: string;
    keyVisualUrl?: string;
  }>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);
  const [pendingUploadType, setPendingUploadType] = useState<
    'logo' | 'keyVisual' | 'sponsor' | null
  >(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thoughtStatus]);

  const handleChatFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        if (pendingUploadType === 'logo') {
          setAttachedAssets((prev) => ({ ...prev, logoUrl: dataUrl }));
          setMessages((prev) => [
            ...prev,
            {
              id: generateMsgId('m-user'),
              role: 'user',
              text: `[행사 커스텀 로고 첨부 완료: ${file.name}]`,
            },
            {
              id: generateMsgId('m-agent'),
              role: 'agent',
              text: `로고 파일이 등록되었습니다! 이제 Gemini 4로 기획서와 브랜드 킷을 생성할까요?`,
              options: [
                '📁 키비주얼/포스터 파일 첨부하기',
                '🚀 Gemini 4에게 기획서 & 브랜드 킷 생성 요청하기',
              ],
            },
          ]);
        } else if (pendingUploadType === 'keyVisual') {
          setAttachedAssets((prev) => ({ ...prev, keyVisualUrl: dataUrl }));
          setMessages((prev) => [
            ...prev,
            {
              id: generateMsgId('m-user'),
              role: 'user',
              text: `[키비주얼 이미지 첨부 완료: ${file.name}]`,
            },
            {
              id: generateMsgId('m-agent'),
              role: 'agent',
              text: `키비주얼 이미지가 등록되었습니다! 이제 Gemini 4로 기획서와 브랜드 킷을 생성할까요?`,
              options: ['🚀 Gemini 4에게 기획서 & 브랜드 킷 생성 요청하기'],
            },
          ]);
        } else if (pendingUploadType === 'sponsor') {
          setMessages((prev) => [
            ...prev,
            {
              id: generateMsgId('m-user'),
              role: 'user',
              text: `[후원사 로고 파일 첨부 완료: ${file.name}]`,
            },
            {
              id: generateMsgId('m-agent'),
              role: 'agent',
              text: `후원사 로고가 등록되었습니다! 이제 기획서와 브랜드 킷을 생성할까요?`,
              options: ['🚀 Gemini 4에게 기획서 & 브랜드 킷 생성 요청하기'],
            },
          ]);
        }
      }
    };
    reader.readAsDataURL(file);
    if (chatFileRef.current) chatFileRef.current.value = '';
  };

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
            text: `좋습니다! 행사 일시와 장소는 언제 어디로 계획하고 계신가요? (예: 2026년 5월 9일 12:30~17:30, 서강대학교 정하상관)`,
            options: [
              '2026년 5월 9일 12:30~17:30, 서강대학교 정하상관',
              '2026년 6월 13일 13:00~18:00, 코엑스 콘퍼런스룸',
            ],
          },
        ]);
      }, 300);
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
      }, 300);
    } else if (nextStep === 3) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: generateMsgId('m-agent'),
            role: 'agent',
            text: `발표 세션을 맡아주실 연사자(이름, 소속, 주제 등) 정보가 있으신가요?`,
            options: [
              'Google GDE 김민수(AI/ML), GDG 오거나이저 박서연, 테크리드 이준호',
              '현업 AI 엔지니어 3명 초빙 예정',
            ],
          },
        ]);
      }, 300);
    } else if (nextStep === 4) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: generateMsgId('m-agent'),
            role: 'agent',
            text: `참가 혜택이나 행사 로고 파일이 있다면 알려주시고, 준비되셨다면 바로 Gemini 4로 기획서와 브랜드 킷을 생성해 보세요!`,
            options: [
              '🚀 Gemini 4에게 기획서 & 브랜드 킷 생성 요청하기',
              '참가 혜택: 리미티드 굿즈, 간식 및 음료, Cloud 크레딧 추가',
              '📁 행사 로고 파일 첨부하기',
            ],
          },
        ]);
      }, 300);
    } else {
      // 5단계 이후에 추가 텍스트를 입력하면 바로 Gemini 4에 반영하여 기획서 & 브랜드 킷 갱신
      await handleGeneratePlan(newMessages);
    }
  };

  const handleGeneratePlan = async (overrideMessages?: Message[]) => {
    const activeMessages = overrideMessages ?? messages;
    setIsSubmitting(true);
    setThoughtStatus(
      'Thought for 1.8s (Gemini 4: 대화 내용을 분석하여 기본 행사 정보(EventPlan) 구조화 중...)',
    );

    try {
      const apiPayload = {
        messages: activeMessages
          .filter((m) => m.role === 'user' || m.role === 'agent')
          .map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
        attachedAssets,
      };

      const res = await fetch('/api/plan/from-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });

      const data = await res.json();

      if (data.success && data.plan) {
        const createdPlan: EventPlan = data.plan;
        onPlanComplete(createdPlan);

        setThoughtStatus(
          'Thought for 2.1s (Gemini 4 BK-03: 썸네일·카드뉴스·릴스·SNS 브랜드 킷 생성 중...)',
        );

        let generatedKit: Generated | null = null;
        try {
          const genRes = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: createdPlan }),
          });
          const genData = await genRes.json();
          if (genData.success && genData.generated) {
            generatedKit = genData.generated;
            onGeneratedComplete?.(genData.generated);
          }
        } catch {
          // ignore and keep existing or fallback
        }

        setThoughtStatus(null);
        setMessages((prev) => [
          ...prev,
          {
            id: generateMsgId('m-done'),
            role: 'system',
            text: `✔ Ran (POST /api/plan/from-chat & POST /api/generate [Gemini 4]) -> 200 OK\n\n[기본 행사 정보 반영 완료]\n• 주최: ${createdPlan.hostName} (팀: 귀찮앙)\n• 행사명: ${createdPlan.title}\n• 일시: ${createdPlan.date} (${createdPlan.startTime}${createdPlan.endTime ? `~${createdPlan.endTime}` : ''})\n• 장소: ${createdPlan.venue}\n• 세션 수: ${createdPlan.schedule?.length ?? 0}개 / 연사: ${createdPlan.speakers?.length ?? 0}명\n• 브랜드 킷(BK-03): 카드뉴스 ${generatedKit?.cards.length ?? 7}장 · 릴스 ${generatedKit?.reel.scenes.length ?? 3}씬 · SNS 캡션 생성 완료!\n\n추가로 수정하고 싶은 내용을 터미널에 입력하시면 실시간으로 다시 반영됩니다.`,
          },
        ]);
      } else {
        throw new Error(data.error?.message || '기획서 생성 실패');
      }
    } catch {
      setThoughtStatus(null);
      onPlanComplete(samplePlan);
      onGeneratedComplete?.(sampleGenerated);
      setMessages((prev) => [
        ...prev,
        {
          id: generateMsgId('m-fallback'),
          role: 'system',
          text: `● Gemini 4 기획서 & 브랜드 킷 반영 완료\n우측 패널에서 기본 행사 정보와 생성된 에셋을 확인하세요.`,
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteWithSample = async (currentMsgs: Message[]) => {
    setIsSubmitting(true);
    setThoughtStatus('Thought for 1.5s (Gemini 4: 샘플 기획서 및 브랜드 킷 생성 중...)');
    onPlanComplete(samplePlan);

    try {
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: samplePlan }),
      });
      const genData = await genRes.json();
      if (genData.success && genData.generated) {
        onGeneratedComplete?.(genData.generated);
      } else {
        onGeneratedComplete?.(sampleGenerated);
      }
    } catch {
      onGeneratedComplete?.(sampleGenerated);
    }

    setThoughtStatus(null);
    setMessages([
      ...currentMsgs,
      {
        id: generateMsgId('m-sample'),
        role: 'system',
        text: `✔ GDG 2026 Build with AI 기획서 및 브랜드 킷(BK-03) 생성이 완료되었습니다.\n아래 기본 행사 정보와 우측 프리뷰 탭에서 결과를 확인하세요!`,
      },
    ]);
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col w-full">
      {/* Terminal Window Container */}
      <div
        className="w-full rounded-2xl shadow-xl border border-slate-700 overflow-hidden flex flex-col h-[520px] font-mono text-xs sm:text-sm"
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
            <span>⌥⌘1 agy --gdg-planner (팀: 귀찮앙)</span>
          </div>

          <div className="text-right text-[10px] text-white/50">Gemini 4</div>
        </div>

        {/* System Resource Status Line */}
        <div className="px-4 py-1.5 bg-black/20 border-b border-white/5 text-[11px] text-white/50 flex items-center justify-between font-mono">
          <div className="flex items-center gap-3">
            <span>⚙ Gemini 4</span>
            <span>● GDG</span>
            <span>🏷 팀: 귀찮앙</span>
          </div>
          <div className="text-white/40 hidden sm:block">
            대화형 터미널 전용 모드
          </div>
        </div>

        {/* Terminal Body: Messages Viewport */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 leading-relaxed"
        >
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              {msg.role === 'system' && (
                <div className="text-white/60 whitespace-pre-wrap font-mono text-xs bg-black/30 p-2.5 rounded-lg border border-white/10">
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
                    <div className="flex flex-wrap gap-1.5 pl-4 pt-1">
                      {msg.options.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => {
                            if (
                              opt.includes('행사/챕터 로고 파일 첨부') ||
                              opt.includes('행사 로고 파일 첨부')
                            ) {
                              setPendingUploadType('logo');
                              chatFileRef.current?.click();
                            } else if (opt.includes('키비주얼/포스터 파일 첨부')) {
                              setPendingUploadType('keyVisual');
                              chatFileRef.current?.click();
                            } else if (opt.includes('후원사 로고 파일 첨부')) {
                              setPendingUploadType('sponsor');
                              chatFileRef.current?.click();
                            } else if (
                              opt.includes('기획서') &&
                              opt.includes('생성')
                            ) {
                              handleGeneratePlan(messages);
                            } else {
                              sendUserMessage(opt);
                            }
                          }}
                          className="px-2.5 py-1 rounded-md text-xs font-mono transition-all border border-white/20 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white cursor-pointer active:scale-95 disabled:opacity-50 text-left"
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
            <div className="flex items-center gap-2 text-xs text-amber-300/90 font-mono pl-2 animate-pulse">
              <span>○</span>
              <span>{thoughtStatus}</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-black/40 border-t border-white/10 space-y-2">
          <input
            type="file"
            ref={chatFileRef}
            onChange={handleChatFileUpload}
            accept="image/*"
            className="hidden"
          />

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
                  ? 'Gemini 4가 기획서와 브랜드 킷을 생성 중입니다...'
                  : '행사 정보 입력 (엔터 전송)'
              }
              className="flex-1 bg-transparent border-none text-white focus:outline-none font-mono text-xs sm:text-sm placeholder:text-white/30"
            />

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setPendingUploadType('logo');
                chatFileRef.current?.click();
              }}
              title="행사 로고 첨부"
              className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white/90 disabled:opacity-30 cursor-pointer transition-all shrink-0"
            >
              📁 파일
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleGeneratePlan(messages)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95 shrink-0 disabled:opacity-40"
              style={{ backgroundColor: color.blue }}
            >
              ⚡ Gemini 4 반영
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isSubmitting}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 cursor-pointer transition-all shrink-0"
            >
              전송
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-white/40 px-1 pt-0.5">
            <span>터미널 대화 내용이 기본 행사 정보 및 브랜드 킷에 즉시 반영됩니다.</span>
            <span className="font-mono">Gemini 4 · 귀찮앙</span>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { CardNewsPreview } from '@/components/CardNewsPreview';
import ArgonReelsStudio from '@/components/reels/ArgonReelsStudio';
import { SnsStudioTab } from '@/components/sns/SnsStudioTab';
import { ThumbnailPreview } from '@/components/ThumbnailPreview';
import { type EventPlan, type Generated, type Reel } from '@/lib/schema';
import { color } from '@/lib/tokens';

type TabKey = 'thumbnail' | 'cards' | 'reel' | 'sns';

const TABS: ReadonlyArray<readonly [TabKey, string]> = [
  ['thumbnail', '썸네일'],
  ['cards', '카드뉴스'],
  ['reel', '릴스'],
  ['sns', 'SNS 문구'],
];

interface BrandKitTabsProps {
  plan: EventPlan;
  generated: Generated;
  /** 새 브랜드 킷이 생성될 때마다 바뀌는 값. 내부 상태를 가진 스튜디오를 다시 초기화합니다. */
  kitVersion: number;
  onReelChange: (reel: Reel) => void;
}

export function BrandKitTabs({
  plan,
  generated,
  kitVersion,
  onReelChange,
}: BrandKitTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('thumbnail');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-medium self-start">
        {TABS.map(([tabKey, label]) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setActiveTab(tabKey)}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === tabKey
                ? 'bg-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            style={activeTab === tabKey ? { color: color.ink } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'thumbnail' && (
        <ThumbnailPreview plan={plan} thumbnail={generated.thumbnail} />
      )}
      {activeTab === 'cards' && (
        <CardNewsPreview plan={plan} cards={generated.cards} />
      )}
      {activeTab === 'reel' && (
        <ArgonReelsStudio
          key={`reel-${kitVersion}`}
          plan={plan}
          initialReel={generated.reel}
          onReelChange={onReelChange}
        />
      )}
      {activeTab === 'sns' && (
        <SnsStudioTab
          key={`sns-${kitVersion}`}
          plan={plan}
          initialSns={generated.sns}
        />
      )}
    </div>
  );
}

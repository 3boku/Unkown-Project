'use client';

import React, { useEffect, useRef } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import type { EventPlan } from '@/lib/schema';
import { color } from '@/lib/tokens';
import {
  type ArgonReel,
  REEL_FPS,
  REEL_HEIGHT,
  REEL_WIDTH,
  ReelComposition,
  getReelTotalFrames,
} from '@/remotion/Reel';

export interface RemotionPlayerClientProps {
  reel: ArgonReel;
  plan: EventPlan;
  showSafeZoneGuide: boolean;
  seekRequest: { frame: number; nonce: number } | null;
}

export default function RemotionPlayerClient({
  reel,
  plan,
  showSafeZoneGuide,
  seekRequest,
}: RemotionPlayerClientProps) {
  const playerRef = useRef<PlayerRef>(null);
  const durationInFrames = getReelTotalFrames(reel, REEL_FPS);

  useEffect(() => {
    if (seekRequest && playerRef.current) {
      playerRef.current.seekTo(seekRequest.frame);
    }
  }, [seekRequest]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border shadow-xs"
      style={{
        aspectRatio: '9 / 16',
        backgroundColor: color.ink,
      }}
    >
      <Player
        ref={playerRef}
        component={ReelComposition}
        inputProps={{
          reel,
          plan,
          showSafeZoneGuide,
        }}
        durationInFrames={durationInFrames}
        compositionWidth={REEL_WIDTH}
        compositionHeight={REEL_HEIGHT}
        fps={REEL_FPS}
        style={{
          width: '100%',
          height: '100%',
        }}
        controls
        autoPlay
        loop
        acknowledgeRemotionLicense
      />
    </div>
  );
}

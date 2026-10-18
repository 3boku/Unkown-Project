import { z } from 'zod';

export const ThemeSchema = z.enum(['BUILD_WITH_AI', 'IO_EXTENDED', 'DEVFEST']);
export type Theme = z.infer<typeof ThemeSchema>;

export const BrandColorSchema = z.enum(['blue', 'red', 'yellow', 'green']);

export const RegistrationPlatformSchema = z.enum([
  'EVENTUS',
  'TICKETTACO',
  'OTHER',
]);
export type RegistrationPlatform = z.infer<typeof RegistrationPlatformSchema>;

export const SpeakerKindSchema = z.enum(['HANDS_ON', 'SESSION']);
export type SpeakerKind = z.infer<typeof SpeakerKindSchema>;

export const RegistrationSchema = z.object({
  platform: RegistrationPlatformSchema,
  url: z.string(),
  deadline: z.string().optional(),
});
export type Registration = z.infer<typeof RegistrationSchema>;

export const ScheduleItemSchema = z.object({
  start: z.string(),
  end: z.string(),
  title: z.string(),
  note: z.string().optional(),
  highlight: z.boolean(),
});
export type ScheduleItem = z.infer<typeof ScheduleItemSchema>;

export const SpeakerSchema = z.object({
  name: z.string(),
  affiliation: z.string(),
  sessionTitle: z.string(),
  summary: z.string(),
  photoUrl: z.string().optional(),
  kind: SpeakerKindSchema,
});
export type Speaker = z.infer<typeof SpeakerSchema>;

export const SpecialEventSchema = z.object({
  title: z.string(),
  desc: z.string(),
});
export type SpecialEvent = z.infer<typeof SpecialEventSchema>;

/**
 * 5.1 EventPlan — 웹 폼으로 입력·수정하는 기획서 스키마
 */
export const EventPlanSchema = z.object({
  theme: ThemeSchema,
  year: z.string().min(1),
  title: z.string().min(1),
  hostName: z.string().default('GDG Campus Korea'),
  hook: z.string().default(''),
  description: z.string().default(''),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().default(''),
  venue: z.string().min(1),
  capacity: z.number().int().positive().optional(),
  programSummary: z.string().default(''),
  targetAudience: z.string().default(''),
  perks: z.array(z.string()).default([]),
  registration: RegistrationSchema.default({
    platform: 'EVENTUS',
    url: '',
  }),
  registrationUrl: z
    .string()
    .default('https://event-us.kr/gdgcampuskorea/event/2026-build-with-ai'),
  schedule: z.array(ScheduleItemSchema).default([]),
  speakers: z.array(SpeakerSchema).default([]),
  specialEvents: z.array(SpecialEventSchema).default([]),
  sponsors: z.array(z.string()).default([]),
});
export type EventPlan = z.infer<typeof EventPlanSchema>;

/**
 * 5.2 Generated — Gemini가 만드는 홍보 문구·구성 스키마
 * 주의: z.toJSONSchema() 호환성을 위해 .refine 및 .transform을 사용하지 않습니다.
 */
export const AssetStyleSchema = z.object({
  accent: BrandColorSchema,
  layout: z.enum(['A', 'B']),
  emphasis: z.enum(['calm', 'bold']),
});
export type AssetStyle = z.infer<typeof AssetStyleSchema>;

export const ThumbnailSchema = z.object({
  headline: z.string(),
  subline: z.string(),
  style: AssetStyleSchema,
});
export const ThumbnailCopySchema = ThumbnailSchema;
export type Thumbnail = z.infer<typeof ThumbnailSchema>;
export type ThumbnailCopy = Thumbnail;

export const IntroSectionSchema = z.object({
  label: z.string(),
  body: z.string(),
});
export type IntroSection = z.infer<typeof IntroSectionSchema>;

export const CoverCardSlideSchema = z.object({
  type: z.literal('COVER'),
  headline: z.string(),
  style: AssetStyleSchema,
});

export const IntroCardSlideSchema = z.object({
  type: z.literal('INTRO'),
  hookTitle: z.string(),
  hookBody: z.string(),
  sections: z.array(IntroSectionSchema),
  style: AssetStyleSchema,
});

export const TimetableCardSlideSchema = z.object({
  type: z.literal('TIMETABLE'),
  title: z.string(),
  style: AssetStyleSchema,
});

export const SpeakersCardSlideSchema = z.object({
  type: z.literal('SPEAKERS'),
  title: z.string(),
  kind: SpeakerKindSchema,
  speakerIndexes: z.array(z.number().int().min(0)).max(3),
  style: AssetStyleSchema,
});

export const SpecialEventCardSlideSchema = z.object({
  type: z.literal('SPECIAL_EVENT'),
  title: z.string(),
  style: AssetStyleSchema,
});

export const CtaCardSlideSchema = z.object({
  type: z.literal('CTA'),
  headline: z.string(),
  body: z.string(),
  style: AssetStyleSchema,
});

export const DDayCardSlideSchema = z.object({
  type: z.literal('D_DAY'),
  daysLeft: z.number().int(),
  style: AssetStyleSchema,
});

export const CardSlideSchema = z.discriminatedUnion('type', [
  CoverCardSlideSchema,
  IntroCardSlideSchema,
  TimetableCardSlideSchema,
  SpeakersCardSlideSchema,
  SpecialEventCardSlideSchema,
  CtaCardSlideSchema,
  DDayCardSlideSchema,
]);
export type CardSlide = z.infer<typeof CardSlideSchema>;

export const ReelComponentSchema = z.enum([
  'KineticStompText',
  'BentoGridShowcase',
]);
export type ReelComponent = z.infer<typeof ReelComponentSchema>;

export const ReelSceneSchema = z.object({
  component: ReelComponentSchema,
  durationSec: z.number(),
  overlayText: z.string(),
  highlightWords: z.array(z.string()),
});
export type ReelScene = z.infer<typeof ReelSceneSchema>;

export const ReelSchema = z.object({
  scenes: z.array(ReelSceneSchema).min(1),
});
export type Reel = z.infer<typeof ReelSchema>;

export const SnsSchema = z.object({
  instagramCaption: z.string().default(''),
  threadsMain: z.string().default(''),
  threadsReply: z.string(),
  instagram: z.string().default(''),
  hashtags: z.array(z.string()).default([]),
  threads: z.string().default(''),
});
export type Sns = z.infer<typeof SnsSchema>;

export const GeneratedSchema = z.object({
  thumbnail: ThumbnailSchema,
  cards: z.array(CardSlideSchema).min(6).max(10),
  reel: ReelSchema,
  sns: SnsSchema,
});
export type Generated = z.infer<typeof GeneratedSchema>;

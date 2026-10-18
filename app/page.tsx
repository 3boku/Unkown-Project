import { CardNewsPreview } from '@/components/CardNewsPreview';
import sampleGeneratedRaw from '@/fixtures/sample-generated.json';
import samplePlanRaw from '@/fixtures/sample-plan.json';
import { EventPlanSchema, GeneratedSchema } from '@/lib/schema';
import { color } from '@/lib/tokens';

export default function Home() {
  const samplePlan = EventPlanSchema.parse(samplePlanRaw);
  const sampleGenerated = GeneratedSchema.parse(sampleGeneratedRaw);

  return (
    <div
      className="flex flex-1 flex-col min-h-screen"
      style={{ backgroundColor: color.paper, color: color.ink }}
    >
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ backgroundColor: color.white }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: color.blue }}
            />
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: color.red }}
            />
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: color.yellow }}
            />
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: color.green }}
            />
          </div>
          <h1 className="text-lg font-bold tracking-tight">
            GDG BrandKit &amp; Reels Studio
          </h1>
        </div>
        <span className="text-xs font-medium opacity-60">
          GDG Campus Korea · BrandKit MVP
        </span>
      </header>

      <main className="grid flex-1 grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl w-full mx-auto">
        <section
          className="lg:col-span-5 rounded-2xl p-6 shadow-xs border"
          style={{ backgroundColor: color.white }}
        >
          <h2 className="text-base font-bold mb-2">행사 기획서 입력</h2>
          <p className="text-sm opacity-60 mb-4">
            현재 샘플 기획서({samplePlan.title})가 연결되어 있습니다.
          </p>
          <div
            className="rounded-xl p-4 border text-xs space-y-1.5"
            style={{ backgroundColor: color.paper, borderColor: color.ink }}
          >
            <div>
              <strong>테마:</strong> {samplePlan.theme}
            </div>
            <div>
              <strong>행사명:</strong> {samplePlan.year} {samplePlan.title}
            </div>
            <div>
              <strong>일시:</strong> {samplePlan.date} ({samplePlan.startTime} ~{' '}
              {samplePlan.endTime})
            </div>
            <div>
              <strong>장소:</strong> {samplePlan.venue}
            </div>
            <div>
              <strong>연사 수:</strong> {samplePlan.speakers.length}명 /{' '}
              <strong>타임테이블:</strong> {samplePlan.schedule.length}행
            </div>
          </div>
        </section>

        <section
          className="lg:col-span-7 rounded-2xl p-6 shadow-xs border"
          style={{ backgroundColor: color.white }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">
              인스타 카드뉴스 세트 (GDG Campus Korea 포맷)
            </h2>
            <span className="text-xs font-medium opacity-60">
              1080×1350 PNG
            </span>
          </div>
          <CardNewsPreview
            plan={samplePlan}
            cards={sampleGenerated.cards}
          />
        </section>
      </main>
    </div>
  );
}

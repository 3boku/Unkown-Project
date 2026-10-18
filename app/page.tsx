import { color } from "@/lib/tokens";

export default function Home() {
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
          <p className="text-sm opacity-60">
            기획서 폼(BK-02)이 이 영역에 표시됩니다.
          </p>
        </section>

        <section
          className="lg:col-span-7 rounded-2xl p-6 shadow-xs border"
          style={{ backgroundColor: color.white }}
        >
          <h2 className="text-base font-bold mb-2">브랜드 킷 프리뷰</h2>
          <p className="text-sm opacity-60">
            썸네일 · 카드뉴스 · 릴스 · SNS 문구 탭이 이 영역에 표시됩니다.
          </p>
        </section>
      </main>
    </div>
  );
}

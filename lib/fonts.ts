import fs from 'node:fs/promises';
import path from 'node:path';

export interface SatoriFontConfig {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: 'normal';
}

let cachedFontsPromise: Promise<SatoriFontConfig[]> | null = null;

/**
 * assets/fonts/ 의 Pretendard OTF 폰트 2종을 읽어 메모리에 캐시합니다. (SPEC 3, 8, 11절)
 */
export async function getPretendardFonts(): Promise<SatoriFontConfig[]> {
  if (!cachedFontsPromise) {
    cachedFontsPromise = (async () => {
      const fontsDir = path.join(process.cwd(), 'assets', 'fonts');
      const [regularBuf, boldBuf] = await Promise.all([
        fs.readFile(path.join(fontsDir, 'Pretendard-Regular.otf')),
        fs.readFile(path.join(fontsDir, 'Pretendard-Bold.otf')),
      ]);

      const toArrayBuffer = (buf: Buffer): ArrayBuffer =>
        buf.buffer.slice(
          buf.byteOffset,
          buf.byteOffset + buf.byteLength
        ) as ArrayBuffer;

      return [
        {
          name: 'Pretendard',
          data: toArrayBuffer(regularBuf),
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Pretendard',
          data: toArrayBuffer(boldBuf),
          weight: 700,
          style: 'normal',
        },
      ];
    })();
  }

  return cachedFontsPromise;
}

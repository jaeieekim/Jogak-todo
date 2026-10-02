// 초대 링크 OG 이미지 — 보관소에서 쓰던 은하수 배경(--color-vault-sky-*) 위에 사용자가 준 알 이미지,
// "젤리 선물이 도착했어요! / 무엇이 나올까요?" 헤딩. Next.js의 opengraph-image 파일 컨벤션(next/og) 사용.
// 폰트: Pretendard(이 프로젝트 전역 서체) 정적 OTF를 런타임에 받아온다 — ImageResponse는 CSS @import로
// 불러오는 가변 폰트를 못 쓰고 바이너리를 직접 줘야 해서(satori 렌더러), 코드용 고정 폭 .otf를 그 때 받는다.

import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';
export const alt = '말랑말랑, 동물 젤리 선물이 도착했어요';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 아래 색상은 전부 리터럴 헥스다 — ImageResponse(satori)는 var(--color-*) 같은 CSS 커스텀 프로퍼티를
// 못 읽어서(독립된 렌더링 컨텍스트) 토큰 참조가 안 통한다. 값 자체는 --color-vault-sky-*/--color-vault-foreground와 동일.
export default async function Image() {
  const [eggBuffer, boldFont] = await Promise.all([
    readFile(join(process.cwd(), 'public/invite/egg.png')),
    fetch('https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Bold.otf').then((r) =>
      r.arrayBuffer(),
    ),
  ]);
  const eggSrc = `data:image/png;base64,${eggBuffer.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          // 보관소 Galaxy.jsx와 동일한 은하수 배경(--color-vault-sky-*)
          background: 'radial-gradient(120% 90% at 50% 20%, #241454 0%, #140b34 45%, #070417 100%)',
        }}
      >
        <div style={{ display: 'flex', fontSize: 56, fontWeight: 700, color: '#eef0ff', textAlign: 'center' }}>
          젤리 선물이 도착했어요!
        </div>
        <div style={{ display: 'flex', fontSize: 56, fontWeight: 700, color: '#eef0ff', textAlign: 'center', marginTop: 8 }}>
          무엇이 나올까요?
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={eggSrc} width={300} height={342} style={{ objectFit: 'contain', marginTop: 36 }} />
      </div>
    ),
    { ...size, fonts: [{ name: 'Pretendard', data: boldFont, weight: 700, style: 'normal' }] },
  );
}

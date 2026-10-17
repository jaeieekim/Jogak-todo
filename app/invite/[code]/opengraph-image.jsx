// 이벤트(초대 링크) OG 이미지 — Figma "이벤트 공유 og"(node 111:5, 600×315) 그대로를 2배(1200×630)로 그린다.
// 배경(은하수 그라데이션·별·희미한 선)과 알은 Figma에서 내보낸 원본 에셋(public/og/)을 그대로 쓰고, 문구만 텍스트로 올린다.
// 폰트: Pretendard SemiBold 정적 OTF를 런타임에 받아온다 — ImageResponse(satori)는 CSS @import 가변 폰트를 못 쓰고
// 바이너리를 직접 줘야 해서.

import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';
export const alt = '말랑말랑, 동물 젤리 선물이 도착했어요';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 아래 색상·수치는 전부 Figma 리터럴 값(×2) — ImageResponse(satori)는 var(--color-*) 같은 CSS 커스텀 프로퍼티를
// 못 읽어서(독립된 렌더링 컨텍스트) 토큰 참조가 안 통한다.
export default async function Image() {
  const [bgBuffer, eggSvg, semiBoldFont] = await Promise.all([
    readFile(join(process.cwd(), 'public/og/galaxy-bg.png')),
    readFile(join(process.cwd(), 'public/og/egg.svg')),
    fetch('https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-SemiBold.otf').then((r) =>
      r.arrayBuffer(),
    ),
  ]);
  const bgSrc = `data:image/png;base64,${bgBuffer.toString('base64')}`;
  const eggSrc = `data:image/svg+xml;base64,${eggSvg.toString('base64')}`;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', background: '#070417' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bgSrc} width={1200} height={630} style={{ position: 'absolute', left: 0, top: 0 }} />
        {/* 알(120×154.879, top 119.93) + 보라 글로우 — 에셋이 글로우 여백까지 포함한 231.628×264.558.
            가로는 Figma 위치(x 220.75)가 아니라 화면 정중앙에 맞춘다(사용자 지시) — left = 600 - 463.256/2 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={eggSrc} width={463.256} height={529.116} style={{ position: 'absolute', left: 368.372, top: 128.232 }} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 81, // Figma top 40(×2=80) — satori의 줄높이 배치가 Figma보다 1px 위로 그려져서 보정
            width: 1202, // Figma 텍스트 중심 x=300.5(×2=601) — 폭 1202 안에서 가운데 정렬
            display: 'flex',
            justifyContent: 'center',
            fontSize: 60,
            fontWeight: 600,
            lineHeight: 1.4,
            letterSpacing: -0.6,
            color: '#ffffff',
            whiteSpace: 'nowrap',
          }}
        >
          젤리 선물이 도착했어요! 무엇이 나올까요?
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Pretendard', data: semiBoldFont, weight: 600, style: 'normal' }] },
  );
}

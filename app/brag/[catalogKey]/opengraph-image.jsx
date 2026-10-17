// 캐릭터 젤리 자랑 OG 이미지 — Figma "일반 젤리 공유 og"(node 156:32, 600×315)를 2배(1200×630)로 그린다.
// 배경은 이벤트 OG와 같은 Figma 원본 에셋(public/og/galaxy-bg.png), 젤리는 catalogKey별 /vault/jelly-*.png로 바꿔 끼운다.
// 젤리 그림자(Figma 드롭섀도 2개)는 이미지 알파를 따라가야 해서, satori가 못 하는 filter 대신 SVG feDropShadow로 감싼다.

import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { characterName } from '../../../lib/encouragementCards';

export const runtime = 'nodejs';
export const alt = '친구가 자랑한 캐릭터 젤리';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 젤리 이미지 박스(Figma 176.672×159.991 @ 211.67,109.99, object-cover) ×2
const JELLY = { x: 423.34, y: 219.98, w: 353.345, h: 319.981 };
const PAD = 260; // 그림자가 잘리지 않게 SVG 캔버스에 두는 여백(가장 큰 블러 stdDeviation 83.6의 약 3배)

// 아래 색상·수치는 전부 Figma 리터럴 값(×2) — ImageResponse(satori)는 var(--color-*)를 못 읽는다.
function jellySvg(pngBase64) {
  const W = JELLY.w + PAD * 2;
  const H = JELLY.h + PAD * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><filter id="s" x="0" y="0" width="${W}" height="${H}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feDropShadow dx="0" dy="0" stdDeviation="83.607" flood-color="rgb(93,0,216)" flood-opacity="0.25"/>
<feDropShadow dx="0" dy="24.806" stdDeviation="55.123" flood-color="#000000" flood-opacity="0.55"/>
</filter></defs>
<g filter="url(#s)"><image x="${PAD}" y="${PAD}" width="${JELLY.w}" height="${JELLY.h}" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/png;base64,${pngBase64}" href="data:image/png;base64,${pngBase64}"/></g>
</svg>`;
  return { src: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, W, H };
}

export default async function Image({ params }) {
  const { catalogKey } = await params;
  const name = characterName(catalogKey);
  const jellyPath = join(process.cwd(), `public/vault/jelly-${catalogKey}.png`);

  const [bgBuffer, jellyBuffer, semiBoldFont] = await Promise.all([
    readFile(join(process.cwd(), 'public/og/galaxy-bg.png')),
    // 없는 키(잘못된 링크)면 기본 캐릭터(검은고양이)로
    readFile(jellyPath).catch(() => readFile(join(process.cwd(), 'public/vault/jelly-blackcat.png'))),
    fetch('https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-SemiBold.otf').then((r) =>
      r.arrayBuffer(),
    ),
  ]);
  const bgSrc = `data:image/png;base64,${bgBuffer.toString('base64')}`;
  const jelly = jellySvg(jellyBuffer.toString('base64'));

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', background: '#070417' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bgSrc} width={1200} height={630} style={{ position: 'absolute', left: 0, top: 0 }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={jelly.src} width={jelly.W} height={jelly.H} style={{ position: 'absolute', left: JELLY.x - PAD, top: JELLY.y - PAD }} />
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
          {`친구가 ${name}자리 젤리를 자랑했어요!`}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Pretendard', data: semiBoldFont, weight: 600, style: 'normal' }] },
  );
}

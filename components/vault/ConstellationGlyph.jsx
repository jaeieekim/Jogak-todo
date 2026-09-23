'use client';

// 별자리 SVG 그리기 — Figma ConstellationView.tsx를 그대로 옮김.
// 좌표는 shape.stars(정규화 0~1)를 받아 그리기만 한다 — 모양 자체를 바꾸려면
// lib/constellationShapes.js만 고치면 되고 이 컴포넌트는 손댈 필요 없다.
//
// shape.image가 있으면(별 좌표 대신 완성된 SVG 통째로 쓰는 별자리) 그 이미지를 그대로 그린다 —
// 항상 완성 상태로만 쓰이므로 진행률(filled)에 따른 부분 렌더링은 없다.
// (SVG는 next/image 최적화기가 기본적으로 막아서 일반 img 태그를 씀 — 벡터라 최적화도 불필요)

export default function ConstellationGlyph({ shape, size, filled, locked = false, sparkIndex = null, glyphId = 'g' }) {
  const s = size ?? shape.size ?? 210;

  if (shape.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={shape.image}
        alt=""
        width={s}
        height={s}
        style={{ display: 'block', filter: locked ? 'blur(2px) grayscale(0.4)' : undefined, opacity: locked ? 0.5 : 1 }}
      />
    );
  }

  const xs = shape.stars.map((st) => st.x);
  const ys = shape.stars.map((st) => st.y);
  // 별자리 좌표가 어디에 몰려 있든 박스 중앙에 오도록 보정
  const offX = 0.5 - (Math.min(...xs) + Math.max(...xs)) / 2;
  const offY = 0.5 - (Math.min(...ys) + Math.max(...ys)) / 2;
  const pxX = (n) => (n + offX) * s;
  const pxY = (n) => (n + offY) * s;
  const filledCount = filled ?? shape.stars.length;

  const edgeLit = (a, b) => !locked && a < filledCount && b < filledCount;

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      style={{ overflow: 'visible', filter: locked ? 'blur(2px)' : undefined }}
    >
      {shape.edges.map(([a, b], i) => {
        const lit = edgeLit(a, b);
        return (
          <line
            key={i}
            x1={pxX(shape.stars[a].x)}
            y1={pxY(shape.stars[a].y)}
            x2={pxX(shape.stars[b].x)}
            y2={pxY(shape.stars[b].y)}
            stroke={lit ? shape.hue : 'color-mix(in srgb, var(--color-vault-white) 6%, transparent)'}
            strokeWidth={lit ? 1.6 : 1}
            strokeLinecap="round"
            style={lit ? { filter: `drop-shadow(0 0 4px ${shape.hue})` } : undefined}
          />
        );
      })}

      {shape.stars.map((st, i) => {
        const isFilled = !locked && i < filledCount;
        const cx = pxX(st.x);
        const cy = pxY(st.y);
        const r = 210 * (isFilled ? 0.026 : 0.012);

        if (!isFilled) {
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill={
                locked
                  ? 'color-mix(in srgb, var(--color-vault-white) 12%, transparent)'
                  : 'color-mix(in srgb, var(--color-vault-white) 20%, transparent)'
              }
            />
          );
        }

        // 은하수 화면엔 여러 별자리 SVG가 동시에 떠 있어서, 별 인덱스만으로 id를 만들면 서로 다른
        // 별자리끼리 id가 겹쳐(예: 모든 별자리의 0번째 별이 전부 "jelly-glow-0") 브라우저가 문서에서
        // 가장 먼저 나온 그라디언트(=검은고양이자리 색)를 엉뚱하게 재사용하는 버그가 있었다 — glyphId로 별자리별로 구분.
        const gid = `jelly-glow-${glyphId}-${i}`;
        return (
          <g key={i}>
            <defs>
              <radialGradient id={gid} cx="40%" cy="35%" r="80%">
                <stop offset="0%" stopColor={shape.hue} stopOpacity="0.9" />
                <stop offset="100%" stopColor={shape.hue} stopOpacity="0.45" />
              </radialGradient>
            </defs>
            <circle cx={cx} cy={cy} r={r * 1.9} fill={shape.hue} opacity={0.16} />
            <circle cx={cx} cy={cy} r={r} fill={`url(#${gid})`} stroke={shape.hue} strokeOpacity={0.5} strokeWidth={0.8} />
            {sparkIndex === i && (
              <circle
                cx={cx}
                cy={cy}
                r={r * 1.3}
                fill="none"
                stroke="var(--color-vault-amber-soft)"
                strokeWidth={1.5}
                style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'vault-spark 1.8s ease-out infinite' }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

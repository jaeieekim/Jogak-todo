// 은하수 화면의 배치 알고리즘 — Figma 시안(constellations.ts의 layout())을 그대로 옮겼다.
// 좌표·색상 같은 "에셋"이 아니라 배치 규칙(로직)이라 lib/constellationShapes.js와는 분리해 둔다.
// 화면 폭에 맞춰 4개씩 지그재그(serpentine)로 늘어놓아, 카탈로그 순서 그대로 한 줄 선으로 이을 수 있게 한다.

const PER_ROW = 4;
const GAP_X = 380;
const GAP_Y = 340;

// sortOrder 기준 인덱스(0부터)의 월드 좌표. 지그재그라 홀수 줄은 방향이 뒤집힌다.
export function layoutPosition(index) {
  const row = Math.floor(index / PER_ROW);
  let col = index % PER_ROW;
  if (row % 2 === 1) col = PER_ROW - 1 - col;
  return { x: col * GAP_X, y: row * GAP_Y };
}

// 진행 중 별자리가 항상 화면 중앙(0,0)에 오도록, 그 별자리 기준으로 좌표를 이동한다.
export function centerOn(index) {
  return layoutPosition(index);
}

// 팬(드래그 이동) 가능 범위 — 가장 먼 별자리까지 여유 있게 이동할 수 있도록
const MARGIN = 300;
export function panBounds(positions, boxSize = 300) {
  const bounds = positions.reduce(
    (b, p) => ({
      minX: Math.min(b.minX, p.x - boxSize / 2),
      maxX: Math.max(b.maxX, p.x + boxSize / 2),
      minY: Math.min(b.minY, p.y - boxSize / 2),
      maxY: Math.max(b.maxY, p.y + boxSize / 2),
    }),
    { minX: 0, maxX: 0, minY: 0, maxY: 0 },
  );
  return {
    minX: -bounds.maxX - MARGIN,
    maxX: -bounds.minX + MARGIN,
    minY: -bounds.maxY - MARGIN,
    maxY: -bounds.minY + MARGIN,
  };
}

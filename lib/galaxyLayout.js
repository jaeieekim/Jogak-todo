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

// 콘텐츠(별자리 노드 전체)의 월드 좌표 경계 — 줌과 무관한 원본 크기. 노드 하나당 boxSize만큼 자리를 차지한다고 보고 계산.
function contentExtent(positions, boxSize = 300) {
  return positions.reduce(
    (b, p) => ({
      minX: Math.min(b.minX, p.x - boxSize / 2),
      maxX: Math.max(b.maxX, p.x + boxSize / 2),
      minY: Math.min(b.minY, p.y - boxSize / 2),
      maxY: Math.max(b.maxY, p.y + boxSize / 2),
    }),
    { minX: 0, maxX: 0, minY: 0, maxY: 0 },
  );
}

// 팬(드래그 이동) 가능 범위 — 고정값이 아니라 "콘텐츠 크기 × 줌배율"마다 다시 계산한다.
// 뷰포트 밖으로 넘치는 만큼(overflow)만 이동을 허용하고, 콘텐츠 크기의 15%를 여유 여백으로 더한다.
// (콘텐츠가 뷰포트보다 작을 때도 여백만큼은 살짝 움직일 수 있게 둔다 — 고무줄 효과가 붙을 자리.)
const EDGE_MARGIN_RATIO = 0.15;
export function panBounds(positions, { zoom = 1, viewportW = 0, viewportH = 0, boxSize = 300 } = {}) {
  const c = contentExtent(positions, boxSize);
  const marginX = (c.maxX - c.minX) * EDGE_MARGIN_RATIO;
  const marginY = (c.maxY - c.minY) * EDGE_MARGIN_RATIO;

  const overflowLeft = Math.max(0, -c.minX * zoom - viewportW / 2);
  const overflowRight = Math.max(0, c.maxX * zoom - viewportW / 2);
  const overflowTop = Math.max(0, -c.minY * zoom - viewportH / 2);
  const overflowBottom = Math.max(0, c.maxY * zoom - viewportH / 2);

  return {
    minX: -overflowRight - marginX,
    maxX: overflowLeft + marginX,
    minY: -overflowBottom - marginY,
    maxY: overflowTop + marginY,
  };
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// 한계(min~max)를 살짝 넘어갈 때 저항을 줘서 "끌렸다가 돌아오는" 느낌을 만든다.
// 드래그/핀치 중엔 이 값을 그리고, 손을 떼는 순간 clamp()로 다시 범위 안에 스냅시킨다.
const RUBBER_BAND_RATIO = 0.35;
export function rubberband(value, min, max) {
  if (value < min) return min - (min - value) * RUBBER_BAND_RATIO;
  if (value > max) return max + (value - max) * RUBBER_BAND_RATIO;
  return value;
}

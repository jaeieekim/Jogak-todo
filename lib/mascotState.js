// 마스코트 말풍선 — 상태 판정 로직 + 문구.
// 카피는 PRD 6-2(라이팅 톤 가이드)에 이미 승인된 문구를 재사용한다. 1:1로 정의된 적 없는
// 상태(IN_PROGRESS)만 플레이스홀더로 남아있음 — 표시 확인해서 교체할 것.

export const MASCOT_STATE = {
  EMPTY: 'EMPTY',
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  ALL_COMPLETE: 'ALL_COMPLETE',
};

// 상태 판정: 선택 날짜의 리스트 전체 기준
export function getMascotState(todos) {
  if (todos.length === 0) return MASCOT_STATE.EMPTY;

  const isTodoComplete = (todo) => todo.originalChecked && todo.steps.every((s) => s.checked);
  const isTodoStarted = (todo) => todo.originalChecked || todo.steps.some((s) => s.checked);

  if (todos.every(isTodoComplete)) return MASCOT_STATE.ALL_COMPLETE;
  if (todos.some(isTodoStarted)) return MASCOT_STATE.IN_PROGRESS;
  return MASCOT_STATE.NOT_STARTED;
}

// 상시 상태 문구 — PRD 6-2 접점별 카피 예시에서 재사용
export const MASCOT_STATE_MESSAGES = {
  [MASCOT_STATE.EMPTY]: '부담 없이, 하나면 돼요', // PRD 빈 리스트 카피 그대로
  [MASCOT_STATE.NOT_STARTED]: '5분만 해볼까요?', // PRD 생성 직후 카피 재사용
  [MASCOT_STATE.IN_PROGRESS]: '[플레이스홀더 · 진행 중 문구]', // PRD에 1:1 대응 카피 없음
  [MASCOT_STATE.ALL_COMPLETE]: '오늘 몫은 충분해요', // PRD 전체 체크 토스트 카피 그대로
};

// 체크 순간 3초간 보여주는 순간 반응 문구 — PRD 첫 체크 토스트 카피 재사용
export const MASCOT_MOMENT_MESSAGE = '시작이 반이에요. 이대로 잘하고 있어요';

export const MASCOT_MOMENT_DURATION_MS = 3000;

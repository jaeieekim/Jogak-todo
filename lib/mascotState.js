// 마스코트 말풍선 — 상태 판정 로직 + 문구.
// 카피는 PRD 6-2(라이팅 톤 가이드)에 이미 승인된 문구를 재사용한다.
// IN_PROGRESS 상시 상태는 고정 문구 대신 STEP_CHECKED 순간 반응과 동일한 카피 풀을
// 공유하며, 미니스텝 체크 시(동일 시점)마다 함께 로테이션된다.

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
// IN_PROGRESS는 고정 문구가 아니라 풀(MASCOT_STATE_IN_PROGRESS_POOL)에서 로테이션되므로
// 여기엔 포함하지 않는다 — 조회 시 mascotState === IN_PROGRESS 분기 처리할 것.
export const MASCOT_STATE_MESSAGES = {
  [MASCOT_STATE.EMPTY]: '부담 없이, 하나면 돼요', // PRD 빈 리스트 카피 그대로
  [MASCOT_STATE.NOT_STARTED]: '5분만 해볼까요?', // PRD 생성 직후 카피 재사용
  [MASCOT_STATE.ALL_COMPLETE]: '오늘 몫은 충분해요', // PRD 전체 체크 토스트 카피 그대로
};

// 순간 반응 — 행동 이벤트별 카피 풀. 3초 노출 후 상시 상태 문구로 복귀.
export const MOMENT_EVENT = {
  MINISTEP_GENERATED: 'MINISTEP_GENERATED', // ① 할일 생성 직후(미니스텝 생성 완료 시)
  STEP_CHECKED: 'STEP_CHECKED', // ② 미니스텝 체크 시
  TODO_COMPLETED: 'TODO_COMPLETED', // ③ 할일 하나 통째 완수 시(생애 첫 완수 제외 — 그땐 팝업으로 대체)
  ALL_TODOS_COMPLETE: 'ALL_TODOS_COMPLETE', // ⑤ 오늘 할 일 전체 완수 시(모든 할일의 모든 항목 체크) — ③보다 우선
};

export const MOMENT_MESSAGES = {
  [MOMENT_EVENT.MINISTEP_GENERATED]: [
    '좋아요, 이만큼 작아졌어요',
    '이 정도면 해볼 만하죠?',
    '첫 번째 거, 5분이면 돼요',
  ],
  [MOMENT_EVENT.STEP_CHECKED]: [
    '시작이 반이에요. 이대로 잘하고 있어요',
    '그 한 걸음이 제일 무거운 거였어요',
    '좋아요, 흐름 탔어요',
  ],
  [MOMENT_EVENT.TODO_COMPLETED]: ['하나를 통째로 해냈어요', '미루던 게 방금 끝났어요'],
  [MOMENT_EVENT.ALL_TODOS_COMPLETE]: [
    '오늘 몫, 전부 해냈어요',
    '마지막 조각까지 끝났어요. 이제 진짜 쉬어요',
    '오늘은 미룬 게 하나도 없네요',
  ],
};

// 직전과 같은 문구가 연속으로 나오지 않도록 로테이션
function pickFromPool(pool, lastMessage) {
  const candidates = pool.filter((m) => m !== lastMessage);
  const options = candidates.length > 0 ? candidates : pool;
  return options[Math.floor(Math.random() * options.length)];
}

export function pickMomentMessage(event, lastMessage) {
  return pickFromPool(MOMENT_MESSAGES[event], lastMessage);
}

// 진행 중 상시 상태 카피 풀 — ② 미니스텝 체크 시 순간 반응과 동일한 풀을 공유하고,
// 신규 문구 1종을 추가한다.
export const MASCOT_STATE_IN_PROGRESS_POOL = [
  ...MOMENT_MESSAGES[MOMENT_EVENT.STEP_CHECKED],
  '오늘도 한 걸음씩 나아가고 있어요',
];

export function pickInProgressMessage(lastMessage) {
  return pickFromPool(MASCOT_STATE_IN_PROGRESS_POOL, lastMessage);
}

export const MASCOT_MOMENT_DURATION_MS = 3000;

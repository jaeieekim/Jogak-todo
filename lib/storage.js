// localStorage 기반 저장 — V1.0에서 Supabase 테이블로 옮기기 쉽게
// "날짜별 할 일 배열" 구조를 유지한다 (PRD 9번).
//
// 데이터 구조:
// todosByDate = {
//   'YYYY-MM-DD': [
//     {
//       id, text, date, // 소속 날짜
//       steps: [{ id, text, minutes, checked, checkedAt }],
//       originalChecked, // 원본 할 일 체크 여부
//     },
//   ],
// }
// 배열 순서 = 정렬 순서 (드래그 결과 보존)

const TODOS_KEY = 'minitodo.todosByDate.v1';
const FIRST_DONE_FLAG_KEY = 'minitodo.firstDoneFeedbackShown.v1';
const FIRST_FEEDBACK_KEY = 'minitodo.firstFeedback.v1'; // { rating: 1~5 | 'dismissed' }
const ONBOARDING_FLAG_KEY = 'minitodo.onboardingSeen.v1';
// 보관소 첫 진입 온보딩(2단계: 별 조각 소개 → 캐릭터 젤리 소개, Figma node 96:2) 노출 여부
const VAULT_ONBOARDING_FLAG_KEY = 'minitodo.vaultOnboardingSeen.v1';
// 이어가기(V1.3) 박스를 오늘 이미 봤는지 — 값은 마지막으로 본 날짜('YYYY-MM-DD'), 오늘과 다르면 다시 노출
const CARRYOVER_SEEN_DATE_KEY = 'minitodo.carryoverSeenDate.v1';
// 생애 최초 별 조각 획득 여부 (V1.0 M3) — 처음 한 번만 팝업에 설명 서브 문구를 보여주기 위한 플래그
const FIRST_JELLY_FLAG_KEY = 'minitodo.firstJellyShown.v1';

export function loadTodosByDate() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(TODOS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveTodosByDate(todosByDate) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TODOS_KEY, JSON.stringify(todosByDate));
  } catch {
    // 저장 실패는 조용히 무시 (기기 내 저장 한계)
  }
}

export function wasFirstDonePopupShown() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(FIRST_DONE_FLAG_KEY) === '1';
}

export function markFirstDonePopupShown() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FIRST_DONE_FLAG_KEY, '1');
}

// rating: 1~5 (별점 응답) 또는 'dismissed'(X로 닫음, 응답 없음)
export function saveFirstFeedback(rating) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FIRST_FEEDBACK_KEY, JSON.stringify({ rating }));
  } catch {
    // 저장 실패는 조용히 무시
  }
}

export function wasFirstJellyShown() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(FIRST_JELLY_FLAG_KEY) === '1';
}

export function markFirstJellyShown() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FIRST_JELLY_FLAG_KEY, '1');
}

export function wasOnboardingSeen() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(ONBOARDING_FLAG_KEY) === '1';
}

export function markOnboardingSeen() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ONBOARDING_FLAG_KEY, '1');
}

export function wasVaultOnboardingSeen() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(VAULT_ONBOARDING_FLAG_KEY) === '1';
}

export function markVaultOnboardingSeen() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(VAULT_ONBOARDING_FLAG_KEY, '1');
}

// todayKey: 'YYYY-MM-DD'. 오늘 이미 봤으면(닫았거나 칩을 다 골랐으면) true.
export function wasCarryoverSeenToday(todayKey) {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(CARRYOVER_SEEN_DATE_KEY) === todayKey;
}

export function markCarryoverSeenToday(todayKey) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CARRYOVER_SEEN_DATE_KEY, todayKey);
}

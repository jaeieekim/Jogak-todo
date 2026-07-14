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

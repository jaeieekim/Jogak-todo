// Mixpanel 클라이언트 연동. PRD 9번 '데이터' — 익명 사용자 식별 규칙 참조.
// 메인 퍼널 4단계 + 보조 이벤트. GA4는 이 프로젝트에서 완전히 대체됨(더 이상 사용 안 함).

import mixpanel from 'mixpanel-browser';

const ANON_ID_KEY = 'minitodo.anonId.v1';
let initialized = false;

function getOrCreateAnonId() {
  if (typeof window === 'undefined') return null;
  let id = window.localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

function ensureInit() {
  if (initialized || typeof window === 'undefined') return;
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token) return; // 토큰 미설정 시 조용히 비활성화 (로컬 개발 중 에러 방지)

  mixpanel.init(token, { autocapture: false, persistence: 'localStorage' });
  mixpanel.identify(getOrCreateAnonId());
  initialized = true;
}

export function track(eventName, properties = {}) {
  ensureInit();
  if (!initialized) return;
  mixpanel.track(eventName, properties);
}

// 메인 퍼널 4단계 (PRD 9번)
export const EVENTS = {
  TODO_INPUT: '할일 입력',
  MINISTEP_GENERATED: '미니스텝 생성',
  FIRST_STEP_CHECKED: '첫 스텝 체크',
  ALL_COMPLETE: '전체 완수',
  // 보조 이벤트
  RESPLIT: '할일 다시 쪼개기',
  STEP_EDITED: '스텝 편집',
  DELETED: '삭제',
  FEEDBACK_RESPONDED: '피드백 팝업 응답',
};

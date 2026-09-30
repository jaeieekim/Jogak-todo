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

// app_open은 새로고침마다가 아니라 세션(탭)당 1회만 찍는다 (M3). sessionStorage는 탭을 새로 열면 비워지지만
// 같은 탭 새로고침에는 남아있어서 딱 이 조건에 맞는다. 홈·보관소 어느 화면이 먼저 뜨든 한 번만 발생한다.
const APP_OPEN_FLAG_KEY = 'minitodo.appOpenTracked.v1';
export function trackAppOpenOnce() {
  if (typeof window === 'undefined') return;
  try {
    if (window.sessionStorage.getItem(APP_OPEN_FLAG_KEY) === '1') return;
    window.sessionStorage.setItem(APP_OPEN_FLAG_KEY, '1');
  } catch {
    // sessionStorage 접근 불가(프라이빗 모드 등) — 중복 방지는 못 하지만 이벤트는 보낸다
  }
  track(EVENTS.APP_OPEN);
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
  // 생애 첫 완수 피드백(별점) — 이름은 명세대로 영문 유지
  FIRST_FEEDBACK: 'first_feedback',

  // V1.0 젤리 컬렉션 (PRD §7) — 영문 이름은 명세 그대로
  APP_OPEN: 'app_open', // 기존 V0.7 이벤트로 문서엔 있었으나 실제 코드엔 없었음 — M3에서 신설
  JELLY_EARNED: 'jelly_earned',
  CONSTELLATION_COMPLETE: 'constellation_complete',
  VAULT_OPEN: 'vault_open',
  CONSTELLATION_DETAIL_OPEN: 'constellation_detail_open',
  COMEBACK_BONUS_GRANTED: 'comeback_bonus_granted',

  // V1.3 이어가기(가벼운 버전 — AI 재쪼개기 없이 재노출+선택만) — 이름은 명세 그대로
  CARRYOVER_SHOWN: 'carryover_shown',
  CARRYOVER_CHIP_CLICK: 'carryover_chip_click',
  CARRYOVER_DISMISS: 'carryover_dismiss',
};

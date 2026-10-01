// 젤리 조각 적립 클라이언트. V1.0 PRD §4.1 (적립 규칙) · §4.6 (익명 인증).
// 테이블은 직접 건드리지 않고 DB 함수(ensure_user / earn_jelly)만 호출한다.
// Supabase 키가 없거나 요청이 실패해도 앱의 체크 동작에는 영향이 없도록 항상 조용히 무시한다
// (mixpanel.js와 같은 방식). 적립은 서버가 멱등하게 처리하므로 재요청해도 중복되지 않는다.

import { createClient } from '@supabase/supabase-js';

let client = null;
let accountPromise = null;
// ensure_user()의 결과({bonus_granted, completed}) — 세션당 한 번만 소비되도록 여기 보관해둔다.
// 여러 화면(홈·보관소)이 같은 세션에서 마운트돼도 보너스/완성 팝업이 중복으로 뜨지 않게 하기 위함(M3).
let pendingAppOpenResult = null;

function getClient() {
  if (typeof window === 'undefined') return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null; // 미설정 시 비활성화 (로컬 개발 중 에러 방지)
  if (!client) client = createClient(url, key);
  return client;
}

// 카카오 로그인. 기존 앱은 첫 실행 때 익명 계정으로 별조각을 이미 쌓아 놨으므로, 여기서 그냥
// signInWithOAuth를 쓰면 완전히 새 계정으로 바뀌어 그동안 모은 조각을 잃는다 — 그래서 linkIdentity로
// "지금의 익명 계정에 카카오 로그인 수단을 연결"하는 방식을 쓴다(유저 id·데이터는 그대로 유지).
// 호출하면 브라우저가 카카오 동의 화면으로 이동하고, 끝나면 redirectTo로 돌아온다.
export async function signInWithKakao(redirectTo) {
  const supabase = await ensureJellyAccount();
  if (!supabase) return { error: new Error('supabase_unavailable') };
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'kakao',
    options: {
      redirectTo: redirectTo ?? `${window.location.origin}/vault`,
      scopes: 'profile_nickname profile_image account_email',
    },
  });
  return { data, error };
}

// linkIdentity가 "이미 다른 유저에 연결된 카카오 계정"이라 실패했을 때(identity_already_exists) 쓰는
// 경로 — 이번엔 "연결"이 아니라 그냥 "그 계정으로 로그인"한다(지금의 새 익명 계정은 버려짐 —
// 아직 아무 것도 안 쌓인 빈 계정이라 잃을 게 없다).
export async function signInWithKakaoExisting(redirectTo) {
  const supabase = getClient();
  if (!supabase) return { error: new Error('supabase_unavailable') };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo: redirectTo ?? `${window.location.origin}/vault` },
  });
  return { data, error };
}

// /vault(카카오 로그인의 redirectTo) 진입 시 호출: linkIdentity가 "이미 다른 기기/브라우저에서
// 연결된 카카오 계정"이라 실패해 URL에 error_code=identity_already_exists가 붙어 돌아온 경우,
// signInWithKakaoExisting으로 자동 재시도한다(그 카카오 계정의 원래 데이터로 로그인됨).
// true를 반환하면 즉시 카카오로 다시 리다이렉트되므로, 호출부는 이후 로직을 더 진행할 필요가 없다.
export function retryKakaoIfIdentityConflict() {
  if (typeof window === 'undefined') return false;
  const hasConflict = (window.location.search + window.location.hash).includes('identity_already_exists');
  if (!hasConflict) return false;
  window.history.replaceState(null, '', window.location.pathname); // 재시도 중 새로고침해도 또 안 걸리게 정리
  signInWithKakaoExisting(`${window.location.origin}/vault`);
  return true;
}

// 현재 로그인 상태(카카오 등 실계정 연결 여부) — is_anonymous 클레임은 linkIdentity 후에도 안 바뀌는
// 걸로 확인돼서(2026-09-29), 대신 Supabase 공식 문서에 나온 대로 "익명 유저는 identities가 비어있다"는
// 사실을 이용한다. 카카오를 연결하면 identities 배열에 실제 provider가 하나 생긴다.
export async function isLoggedIn() {
  const supabase = getClient();
  if (!supabase) return false;
  const { data } = await supabase.auth.getUser();
  return (data?.user?.identities?.length ?? 0) > 0;
}

// 로그아웃 — 세션을 끝낸다. 다음 진입 시 ensureJellyAccount가 새 익명 계정을 만든다.
export async function signOutUser() {
  const supabase = getClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

// 앱 진입 시 호출: 익명 세션(없으면 생성)과 내 users 행·첫 별자리를 보장한다.
// 동시에 여러 번 불려도 한 번만 실행되고, 실패하면 다음 호출에서 다시 시도한다.
export function ensureJellyAccount() {
  if (accountPromise) return accountPromise;
  const supabase = getClient();
  if (!supabase) return Promise.resolve(null);

  accountPromise = (async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
      }
      const { data: appOpenResult, error } = await supabase.rpc('ensure_user');
      if (error) throw error;
      // { bonus_granted: 'first' | 'comeback' | null, completed: [{id,name}, ...] }
      pendingAppOpenResult = appOpenResult ?? null;
      return supabase;
    } catch {
      accountPromise = null;
      return null;
    }
  })();
  return accountPromise;
}

// 앱 진입 시 지급된 보너스·완성 신호를 한 번만 꺼내 쓴다(먼저 부르는 화면이 팝업을 담당, 이후엔 null).
export function consumeAppOpenResult() {
  const result = pendingAppOpenResult;
  pendingAppOpenResult = null;
  return result;
}

// ───────────────────────── 공유 보상(V1.3, 캐릭터 젤리 선물) ─────────────────────────

// 내 고정 초대 코드(없으면 생성). 실패 시 null.
export async function getOrCreateInviteCode() {
  try {
    const supabase = await ensureJellyAccount();
    if (!supabase) return null;
    const { data, error } = await supabase.rpc('get_or_create_invite_code');
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

// 받는 사람(신규 유저)이 초대 코드를 claim. 카카오 로그인 완료 직후 호출해야 한다.
// 반환: { status: 'granted'|'needs_login'|'invalid_code'|'self_referral'|'existing_user'|'already_claimed', catalogKey?, name?, pieces? } 또는 실패 시 null
export async function claimInviteGift(code) {
  try {
    const supabase = await ensureJellyAccount();
    if (!supabase) return null;
    const { data, error } = await supabase.rpc('claim_invite_gift', { p_code: code });
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

// 공유자가 "선물 도착" 팝업에서 받기를 눌렀을 때 호출.
// 반환: { status: 'granted'|'nothing_to_claim', catalogKey?, name?, pieces? } 또는 실패 시 null
export async function claimReferralReward() {
  try {
    const supabase = await ensureJellyAccount();
    if (!supabase) return null;
    const { data, error } = await supabase.rpc('claim_referral_reward');
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

// source: 'ministep'(1조각) | 'todo'(2조각), localDate: 'YYYY-MM-DD' (체크한 순간의 로컬 날짜)
// 반환: { earned, total_pieces, first_of_day, completed: [{id,name}, ...] } 또는 실패 시 null
export async function earnJelly(source, localDate) {
  try {
    const supabase = await ensureJellyAccount();
    if (!supabase) return null;
    const { data, error } = await supabase.rpc('earn_jelly', {
      p_source: source,
      p_local_date: localDate,
    });
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

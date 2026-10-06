'use client';

// 받는 사람(신규 유저) 뽑기 흐름. 흐름: 진입(추적) → [뽑기] → (비로그인이면 카카오로 먼저 보냄) →
// 복귀(?claim=1) → 서버 claim_invite_gift 호출 → 결과.
// 기존(카카오 로그인 이미 돼있는) 유저가 들어오면 안내만 하고 뽑기 UI 자체를 숨긴다(서버도 한 번 더 막음).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import InviteDraw from '../../../components/InviteDraw';
import { ensureJellyAccount, isLoggedIn, signInWithKakao, claimInviteGift, retryKakaoIfIdentityConflict } from '../../../lib/jelly';
import { track, EVENTS } from '../../../lib/mixpanel';

export default function InviteClient({ code }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [existingUser, setExistingUser] = useState(false);
  const [resumeAfterLogin, setResumeAfterLogin] = useState(false);

  useEffect(() => {
    // 카카오 linkIdentity 충돌(이미 다른 기기에 연결된 계정) 복구 — 기존 로그인 흐름과 동일 패턴
    if (retryKakaoIfIdentityConflict()) return;

    (async () => {
      await ensureJellyAccount();
      const params = new URLSearchParams(window.location.search);
      const afterLogin = params.get('claim') === '1';

      if (afterLogin) {
        window.history.replaceState(null, '', window.location.pathname);
        setResumeAfterLogin(true);
        setChecking(false);
        return;
      }

      track(EVENTS.INVITE_LINK_OPENED, { code });
      if (await isLoggedIn()) {
        setExistingUser(true); // 이미 카카오 로그인된 유저 — 뽑기 UI 자체를 안 보여줌
      }
      setChecking(false);
    })();
  }, [code]);

  async function handleDraw() {
    if (!(await isLoggedIn())) {
      const { error } = await signInWithKakao(`${window.location.origin}/invite/${code}?claim=1`);
      if (error) return { status: 'error' };
      return { status: 'needs_login' }; // 이 시점엔 이미 카카오로 리다이렉트 중
    }
    const r = await claimInviteGift(code);
    if (r?.status === 'granted') {
      track(EVENTS.INVITE_GIFT_CLAIMED, { catalog_key: r.catalogKey ?? null });
    }
    return r ?? { status: 'error' };
  }

  if (checking) return null;

  // 보관소(app/vault/page.jsx)와 동일한 틀: 웹에서는 바깥(전체폭, 어두운 레터박스) + 안쪽 440px 프레임으로
  // 모바일 폭을 유지한다 — 이 틀이 없으면 데스크톱 웹에서 풀스크린으로 늘어나 버린다.
  return (
    <div className="flex min-h-[100dvh] w-full items-stretch justify-center" style={{ background: 'var(--color-vault-black)' }}>
      <div className="relative h-[100dvh] w-full max-w-[440px] overflow-hidden">
        {existingUser ? (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-20px px-24px text-center"
            style={{ background: 'var(--color-vault-sky-deep)' }}
          >
            <p className="text-vault-13" style={{ color: 'var(--color-vault-white)' }}>
              이미 계정이 있어요! 이 선물은 최초 공유와 최초 가입 시에 한 번만 받을 수 있어요.
            </p>
            <button
              type="button"
              onClick={() => router.push('/vault')}
              className="rounded-12 px-20px py-[14px] text-15 font-medium transition active:scale-[0.98]"
              style={{ background: 'var(--color-vault-amber)', color: 'var(--color-vault-black)' }}
            >
              보관소로 돌아가기
            </button>
          </div>
        ) : (
          <InviteDraw
            autoStart={resumeAfterLogin}
            onDraw={handleDraw}
            onDone={() => router.push('/vault?from=invite')}
          />
        )}
      </div>
    </div>
  );
}

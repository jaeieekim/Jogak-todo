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

  if (existingUser) {
    return (
      <div
        className="flex min-h-[100dvh] w-full items-center justify-center px-24px text-center"
        style={{ background: 'var(--color-vault-sky-deep)' }}
      >
        <p className="text-vault-13" style={{ color: 'var(--color-vault-muted-foreground)' }}>
          이미 계정이 있으시네요 — 이 선물은 새로 시작하는 분을 위한 거예요.
        </p>
      </div>
    );
  }

  return (
    <InviteDraw
      autoStart={resumeAfterLogin}
      onDraw={handleDraw}
      onDone={() => router.push('/vault?from=invite')}
    />
  );
}

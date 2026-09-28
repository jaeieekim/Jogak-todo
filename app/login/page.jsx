'use client';

// 로그인 페이지 — Figma node 96:46("로그인") 이식.
// Figma 원본엔 배경(은하수 + 장식 별자리)만 있고 로그인 버튼은 없어서, 하단 "간편로그인" 영역은
// 이번에 새로 추가했다(사용자 요청). 실제 카카오 로그인은 lib/jelly.js의 signInWithKakao()가
// linkIdentity로 처리해 기존 익명 계정의 별조각·젤리를 그대로 유지한다.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Starfield from '../../components/vault/Starfield';
import { signInWithKakao } from '../../lib/jelly';

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  const handleKakao = async () => {
    setPending(true);
    setError(false);
    const { error: err } = await signInWithKakao(`${window.location.origin}/vault`);
    if (err) {
      setError(true);
      setPending(false);
    }
    // 성공 시엔 브라우저가 카카오 동의 화면으로 이동하므로 여기서 더 할 일 없음
  };

  return (
    // 보관소·온보딩과 똑같이 440px 폭 제한 — 이게 없어서 넓은 화면(데스크탑 크롬)에서 로그인 페이지만
    // 화면 전체 너비로 쭉 늘어나 보이던 문제(다른 화면은 다 이 프레임 안에 있었음).
    <div className="flex min-h-[100dvh] w-full items-stretch justify-center" style={{ background: 'var(--color-vault-black)' }}>
      <div
        className="relative flex h-[100dvh] w-full max-w-[440px] flex-col items-center overflow-hidden"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 12%, var(--color-vault-sky-violet) 0%, var(--color-vault-sky-mid) 45%, var(--color-vault-sky-deep) 100%)',
        }}
      >
      <Starfield count={80} seed={5} />

      <button
        type="button"
        onClick={() => router.back()}
        className="absolute left-4 z-30 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-transform active:scale-90"
        style={{
          top: 'calc(16px + env(safe-area-inset-top))',
          background: 'color-mix(in srgb, var(--color-vault-sky-mid) 60%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-vault-white) 10%, transparent)',
        }}
        aria-label="뒤로가기"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M15 5l-7 7 7 7" stroke="var(--color-vault-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <h1
        className="relative z-10 px-24px pt-[100px] text-center text-32 font-semibold"
        style={{ color: 'var(--color-vault-foreground)' }}
      >
        <span className="block whitespace-nowrap">로그인 하면</span>
        <span className="block whitespace-nowrap">캐릭터 젤리를 받아요!</span>
      </h1>

      {/* flex-1을 안 줘서 남는 세로 공간을 전부 안 먹고, 마스코트+버튼이 헤드라인 바로 아래로 붙는다
          (전엔 마스코트가 flex-1로 중앙 정렬되면서 버튼이 화면 맨 아래로 밀렸었음) */}
      <div className="relative z-10 mt-[80px] flex items-center justify-center">
        <Image
          src="/mascot-starcandy.png"
          alt="별사탕 마스코트"
          width={220}
          height={220}
          className="drop-shadow-[0_18px_40px_rgba(0,0,0,0.5)]"
          style={{ animation: 'login-star-jump 2200ms ease-in-out infinite' }}
          priority
        />
      </div>

      <div className="relative z-10 mt-[76px] w-full px-24px" style={{ paddingBottom: 'calc(48px + env(safe-area-inset-bottom))' }}>
        <p className="mb-12px text-center text-vault-13" style={{ color: 'var(--color-vault-muted-foreground)' }}>
          간편로그인
        </p>
        {/* 카카오 로그인 공식 버튼 에셋(개발자 도구 > 리소스 다운로드) 그대로 사용 — 심볼·문구·색·비율이
            브랜드 가이드로 고정돼 있어(임의 변형 금지) 우리 버튼 스타일이 아닌 이 SVG를 그대로 씀 */}
        <button
          type="button"
          onClick={handleKakao}
          disabled={pending}
          aria-label="카카오 로그인"
          className="mx-auto block transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {/* 카카오 공식 리소스의 medium(224×46) 원본 그대로 — 크기 임의 변형 없음 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/vault/kakao-login-btn-ko.svg" alt="카카오 로그인" width={224} height={46} className="block" />
        </button>
        {pending && (
          <p className="mt-16px text-center text-vault-13" style={{ color: 'var(--color-vault-muted-foreground)' }}>
            이동하는 중…
          </p>
        )}
        {error && (
          <p className="mt-8px text-center text-vault-13" style={{ color: 'var(--color-status-danger)' }}>
            로그인에 실패했어요. 다시 시도해주세요.
          </p>
        )}

        <button
          type="button"
          onClick={() => router.push('/vault')}
          className="mt-32px block w-full text-center text-vault-13 underline underline-offset-2 transition-opacity active:opacity-60"
          style={{ color: 'var(--color-vault-muted-foreground)' }}
        >
          로그인 없이 이용할래요
        </button>
      </div>
      </div>
    </div>
  );
}

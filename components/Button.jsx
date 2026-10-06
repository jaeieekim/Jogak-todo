// 공통 버튼. CLAUDE.md 공통 UI 스펙 — 주요/보조 버튼 참조.
// 4번째 반복(할일 등록, 도움됐어요/안됐어요, 편집 끝내기) 시점에 추출 승인받아 컴포넌트로 분리함.

const VARIANT_CLASSES = {
  primary: 'bg-brand-primary text-text-on-brand',
  secondary: 'bg-bg-tint text-brand-pressed',
  inverse: 'bg-bg-inverse text-text-on-inverse', // 어두운 서피스 버튼 — 온보딩의 "로그인 없이 사용해보기" 등
};

export default function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`rounded-8 py-[14px] text-15 font-medium transition duration-[96ms] ease-out active:scale-[0.98] disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

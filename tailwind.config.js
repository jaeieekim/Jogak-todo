/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: {
          DEFAULT: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          dim: 'var(--color-text-dim)',
          'on-brand': 'var(--color-text-on-brand)',
          'on-inverse': 'var(--color-text-on-inverse)',
        },
        bg: {
          default: 'var(--color-bg-default)',
          alt: 'var(--color-bg-alt)',
          surface: 'var(--color-bg-surface)',
          tint: 'var(--color-bg-tint)',
          inverse: 'var(--color-bg-inverse)',
        },
        brand: {
          primary: 'var(--color-brand-primary)',
          hover: 'var(--color-brand-hover)',
          pressed: 'var(--color-brand-pressed)',
          soft: 'var(--color-brand-soft)',
        },
        status: {
          success: 'var(--color-status-success)',
          warning: 'var(--color-status-warning)',
          danger: 'var(--color-status-danger)',
          info: 'var(--color-status-info)',
        },
      },
      spacing: {
        '4px': 'var(--spacing-4)',
        '8px': 'var(--spacing-8)',
        '12px': 'var(--spacing-12)',
        '16px': 'var(--spacing-16)',
        '20px': 'var(--spacing-20)',
        '24px': 'var(--spacing-24)',
        '32px': 'var(--spacing-32)',
        '48px': 'var(--spacing-48)',
        '64px': 'var(--spacing-64)',
      },
      borderRadius: {
        4: 'var(--radius-4)',
        8: 'var(--radius-8)',
        12: 'var(--radius-12)',
        16: 'var(--radius-16)',
        24: 'var(--radius-24)',
        32: 'var(--radius-32)',
        full: 'var(--radius-full)',
      },
      fontFamily: {
        base: ['var(--font-family-base)'],
      },
      fontSize: {
        12: ['var(--font-size-12)', { lineHeight: 'var(--line-height-body)' }],
        14: ['var(--font-size-14)', { lineHeight: 'var(--line-height-body)' }],
        15: ['var(--font-size-15)', { lineHeight: 'var(--line-height-body)' }],
        17: ['var(--font-size-17)', { lineHeight: 'var(--line-height-body)' }],
        20: ['var(--font-size-20)', { lineHeight: 'var(--line-height-heading)' }],
        24: ['var(--font-size-24)', { lineHeight: 'var(--line-height-heading)' }],
        32: ['var(--font-size-32)', { lineHeight: 'var(--line-height-heading)' }],
        40: ['var(--font-size-40)', { lineHeight: 'var(--line-height-heading)' }],
        50: ['var(--font-size-50)', { lineHeight: 'var(--line-height-heading)' }],
        66: ['var(--font-size-66)', { lineHeight: 'var(--line-height-heading)' }],
      },
      letterSpacing: {
        default: 'var(--letter-spacing-default)',
      },
      // 로딩 모션 — playful-todolist-ko.md 섹션 7-1 참조
      keyframes: {
        'mascot-jump': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-12px)' }, // spacing/12 값과 정렬
        },
        'loader-pulse': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        // 온보딩 쪼개기 시연 파티클 — 이동량은 CSS 변수(--demo-dx/--demo-dy)로 주입 (md 7-2)
        'demo-particle': {
          '0%': { opacity: '1', transform: 'translate(0, 0) rotate(0deg)' },
          '100%': { opacity: '0', transform: 'translate(var(--demo-dx), var(--demo-dy)) rotate(45deg)' },
        },
        // 온보딩 시연 순차 체크 — 체크마크 살짝 통통한 scale-in (md 7-2)
        'demo-check-pop': {
          '0%': { transform: 'scale(0)' },
          '70%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'mascot-jump': 'mascot-jump 700ms ease-in-out infinite',
        'loader-pulse': 'loader-pulse 900ms ease-in-out infinite',
        'demo-particle': 'demo-particle 600ms ease-out forwards',
        'demo-check-pop': 'demo-check-pop 180ms ease-out forwards',
      },
    },
  },
  plugins: [],
};

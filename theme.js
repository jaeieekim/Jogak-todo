// theme.js — CSS 변수 참조용 JS 토큰 객체
// Single Source of Truth: playful-todolist-ko.md → theme.css 동기화 필수

export const theme = {
  color: {
    border: {
      default: 'var(--color-border-default)',
      strong: 'var(--color-border-strong)',
    },
    text: {
      primary: 'var(--color-text-primary)',
      secondary: 'var(--color-text-secondary)',
      muted: 'var(--color-text-muted)',
      dim: 'var(--color-text-dim)',
      onBrand: 'var(--color-text-on-brand)',
      onInverse: 'var(--color-text-on-inverse)',
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
    4: 'var(--spacing-4)',
    8: 'var(--spacing-8)',
    12: 'var(--spacing-12)',
    16: 'var(--spacing-16)',
    20: 'var(--spacing-20)',
    24: 'var(--spacing-24)',
    32: 'var(--spacing-32)',
    48: 'var(--spacing-48)',
  },
  radius: {
    4: 'var(--radius-4)',
    8: 'var(--radius-8)',
    12: 'var(--radius-12)',
    16: 'var(--radius-16)',
    24: 'var(--radius-24)',
    32: 'var(--radius-32)',
    full: 'var(--radius-full)',
  },
  fontFamily: {
    base: 'var(--font-family-base)',
  },
  fontSize: {
    12: 'var(--font-size-12)',
    14: 'var(--font-size-14)',
    15: 'var(--font-size-15)',
    17: 'var(--font-size-17)',
    20: 'var(--font-size-20)',
    24: 'var(--font-size-24)',
    32: 'var(--font-size-32)',
    40: 'var(--font-size-40)',
    50: 'var(--font-size-50)',
    66: 'var(--font-size-66)',
  },
  lineHeight: {
    body: 'var(--line-height-body)',
    heading: 'var(--line-height-heading)',
  },
  letterSpacing: {
    default: 'var(--letter-spacing-default)',
  },
};

export default theme;

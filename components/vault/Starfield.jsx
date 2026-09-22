'use client';

// 배경 반짝이는 별 입자 — Figma Starfield.tsx 이식. seed를 바꾸면 다른 배치가 나오되,
// 같은 seed는 리렌더링에도 흔들리지 않는다(결정론적 의사난수).

import { useMemo } from 'react';

function mulberry(seed) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export default function Starfield({ count = 90, seed = 7, className }) {
  const stars = useMemo(() => {
    const rand = mulberry(seed);
    return Array.from({ length: count }, () => ({
      left: rand() * 100,
      top: rand() * 100,
      size: 0.6 + rand() * 1.8,
      delay: rand() * 6,
      dur: 3 + rand() * 5,
      bright: rand(),
    }));
  }, [count, seed]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}>
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            background: s.bright > 0.85 ? 'var(--color-vault-amber-soft)' : 'var(--color-vault-white)',
            boxShadow: `0 0 ${s.size * 3}px color-mix(in srgb, var(--color-vault-white) 60%, transparent)`,
            animation: `vault-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// "내 젤리 자랑하기" 공유 링크 — 초대 링크와는 완전히 분리된, 순수 전시용 페이지(로그인·claim 로직 없음).
// 캐릭터별로 OG 타이틀/이미지가 다르다 — 이미지는 opengraph-image.jsx가 기존 /vault/jelly-*.png 에셋으로 그린다.

import Link from 'next/link';
import Button from '../../../components/Button';
import { characterName, bragShareText } from '../../../lib/encouragementCards';

const VALID_KEYS = [
  'blackcat', 'cheesecat', 'hamster', 'capybara', 'cub', 'quokka', 'panda', 'otter',
  'seal', 'raccoon', 'rabbit', 'squirrel', 'chick', 'dino', 'sheep', 'dog',
];

export async function generateMetadata({ params }) {
  const { catalogKey } = await params;
  const { title, description } = bragShareText(catalogKey);
  // OG 이미지는 같은 폴더의 opengraph-image.jsx(Next.js 파일 컨벤션)가 캐릭터별로 그려서 자동으로 연결한다
  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function BragPage({ params }) {
  const { catalogKey } = await params;
  const name = characterName(catalogKey);
  const valid = VALID_KEYS.includes(catalogKey);

  return (
    // 보관소(app/vault/page.jsx)와 동일한 틀 — 웹에서 풀스크린으로 늘어나지 않게 440px 프레임으로 감싼다.
    <div className="flex min-h-[100dvh] w-full items-stretch justify-center" style={{ background: 'var(--color-vault-black)' }}>
      <div
        className="flex h-[100dvh] w-full max-w-[440px] flex-col items-center justify-center gap-24px overflow-hidden px-24px text-center"
        style={{ background: 'radial-gradient(120% 90% at 50% 20%, var(--color-vault-sky-violet) 0%, var(--color-vault-sky-mid) 45%, var(--color-vault-sky-deep) 100%)' }}
      >
        {valid ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/vault/jelly-${catalogKey}.png`}
              alt={`${name} 젤리 캐릭터`}
              width={180}
              height={180}
              style={{ filter: 'drop-shadow(0 0 32px rgba(255,255,255,0.5))' }}
            />
            <h1 className="text-vault-26 font-bold" style={{ color: 'var(--color-vault-foreground)' }}>
              {name} 젤리를 얻었어요!
            </h1>
            <p className="text-vault-13" style={{ color: 'var(--color-vault-muted-foreground)' }}>
              조각투두에서 모은 말랑 동물 젤리 컬렉션
            </p>
          </>
        ) : (
          <p className="text-vault-13" style={{ color: 'var(--color-vault-muted-foreground)' }}>
            존재하지 않는 캐릭터예요.
          </p>
        )}
        <Link href="/" className="w-full max-w-[280px]">
          <Button className="w-full">나도 조각투두 시작하기</Button>
        </Link>
      </div>
    </div>
  );
}

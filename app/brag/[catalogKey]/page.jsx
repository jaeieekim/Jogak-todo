// "내 젤리 자랑하기" 공유 링크 — 초대 링크와는 완전히 분리된, 순수 전시용 페이지(로그인·claim 로직 없음).
// 캐릭터별로 OG 타이틀/이미지가 다르다 — 기존 /vault/jelly-*.png 에셋을 그대로 재사용.

import Link from 'next/link';
import Button from '../../../components/Button';
import { characterName } from '../../../lib/encouragementCards';

const VALID_KEYS = [
  'blackcat', 'cheesecat', 'hamster', 'capybara', 'cub', 'quokka', 'panda', 'otter',
  'seal', 'raccoon', 'rabbit', 'squirrel', 'chick', 'dino', 'sheep', 'dog',
];

export async function generateMetadata({ params }) {
  const { catalogKey } = await params;
  const name = characterName(catalogKey);
  const title = `${name} 젤리를 얻었어요!`;
  const description = '조각투두에서 모은 말랑 동물 젤리 컬렉션';
  const image = VALID_KEYS.includes(catalogKey) ? `/vault/jelly-${catalogKey}.png` : undefined;
  return {
    title,
    description,
    openGraph: { title, description, images: image ? [image] : undefined },
  };
}

export default async function BragPage({ params }) {
  const { catalogKey } = await params;
  const name = characterName(catalogKey);
  const valid = VALID_KEYS.includes(catalogKey);

  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-24px px-24px text-center"
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
  );
}

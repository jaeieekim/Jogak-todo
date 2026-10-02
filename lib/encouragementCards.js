// 이어가기 응원카드 — 별자리 카탈로그 순서(supabase/migrations/0001_jelly_schema.sql 시드)와
// 동일한 순서로 명언 16개를 고정 배정한다. 랜덤 아님 — catalogKey가 constellation_catalog.key와 1:1 대응.
// 캐릭터 젤리 이미지는 components/vault/ConstellationDetail.jsx의 JELLY_SRC_BY_KEY를 그대로 재사용.
//
// 현재는 "이어가기 최초 1회"에서만 쓰여서 실제로는 0번(검은고양이)만 노출되지만, 추후 다른 트리거
// (예: 별자리 완성 축하)에서 재사용할 수 있게 16개를 전부 미리 준비해둔다.
export const ENCOURAGEMENT_CARDS = [
  { catalogKey: 'blackcat', name: '검은고양이', caption: '밤을 지키는 아이', quote: '시작하는 방법은 말을 멈추고\n행동을 시작하는 것' },
  { catalogKey: 'cheesecat', name: '치즈고양이', caption: '노곤한 오후의 볕', quote: '천 리 길도 한 걸음부터' },
  { catalogKey: 'hamster', name: '햄스터', caption: '볼주머니 가득', quote: '성공은 매일 반복한\n작은 노력들의 합이다' },
  { catalogKey: 'capybara', name: '카피바라', caption: '느긋한 온천지기', quote: '코끼리를 먹는 방법은\n한 번에 한 입씩' },
  { catalogKey: 'cub', name: '작은곰', caption: '가장 밝게 빛나는', quote: '끝내 이루기 전까지는\n늘 불가능해 보인다' },
  { catalogKey: 'quokka', name: '쿼카', caption: '세상에서 제일 밝은 미소', quote: '한 마리씩, 차근차근' },
  { catalogKey: 'panda', name: '판다', caption: '흑백의 균형', quote: '시작이 반이다' },
  { catalogKey: 'otter', name: '수달', caption: '물살을 가르며', quote: '앞서가는 비결은\n일단 시작하는 것' },
  { catalogKey: 'seal', name: '물범', caption: '동그란 파도', quote: '하지 않은 슛은\n100% 빗나간다' },
  { catalogKey: 'raccoon', name: '라쿤', caption: '달빛 도둑', quote: '티끌 모아 태산' },
  { catalogKey: 'rabbit', name: '토끼', caption: '달로 가는 길', quote: '크든 작든\n절대로 포기하지 마라' },
  { catalogKey: 'squirrel', name: '다람쥐', caption: '도토리를 모으며', quote: '작은 일에 최선을 다하면\n큰 힘이 자란다' },
  { catalogKey: 'chick', name: '병아리', caption: '갓 깨어난 봄', quote: '느려도 꾸준한 쪽이 이긴다' },
  { catalogKey: 'dino', name: '공룡', caption: '먼 옛날의 발자국', quote: '꾸준함이 재능을 이긴다' },
  { catalogKey: 'sheep', name: '양', caption: '포근한 구름 한 조각', quote: '작은 시작이\n큰 변화를 만든다.' },
  { catalogKey: 'dog', name: '강아지', caption: null, quote: '한 번의 실천이\n백 번의 계획보다 낫다.' },
];

// catalogKey → 짧은 캐릭터 이름("~자리" 뗀 형태, 예: 'otter' → '수달'). 공유 보상(초대/자랑 OG 타이틀 등)에서 재사용.
export function characterName(catalogKey) {
  return ENCOURAGEMENT_CARDS.find((c) => c.catalogKey === catalogKey)?.name ?? catalogKey;
}

// catalogKey → 한 줄 캡션(constellation_catalog.caption과 동일 값). 뽑기 결과 화면에서 사용.
export function characterCaption(catalogKey) {
  return ENCOURAGEMENT_CARDS.find((c) => c.catalogKey === catalogKey)?.caption ?? null;
}

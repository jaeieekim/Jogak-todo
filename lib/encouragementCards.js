// 이어가기 응원카드 — 별자리 카탈로그 순서(supabase/migrations/0001_jelly_schema.sql 시드)와
// 동일한 순서로 명언 16개를 고정 배정한다. 랜덤 아님 — catalogKey가 constellation_catalog.key와 1:1 대응.
// 캐릭터 젤리 이미지는 components/vault/ConstellationDetail.jsx의 JELLY_SRC_BY_KEY를 그대로 재사용.
//
// 현재는 "이어가기 최초 1회"에서만 쓰여서 실제로는 0번(검은고양이)만 노출되지만, 추후 다른 트리거
// (예: 별자리 완성 축하)에서 재사용할 수 있게 16개를 전부 미리 준비해둔다.
export const ENCOURAGEMENT_CARDS = [
  { catalogKey: 'blackcat', name: '검은고양이', quote: '시작하는 방법은 말을 멈추고\n행동을 시작하는 것' },
  { catalogKey: 'cheesecat', name: '치즈고양이', quote: '천 리 길도 한 걸음부터' },
  { catalogKey: 'hamster', name: '햄스터', quote: '성공은 매일 반복한\n작은 노력들의 합이다' },
  { catalogKey: 'capybara', name: '카피바라', quote: '코끼리를 먹는 방법은\n한 번에 한 입씩' },
  { catalogKey: 'cub', name: '작은곰', quote: '끝내 이루기 전까지는\n늘 불가능해 보인다' },
  { catalogKey: 'quokka', name: '쿼카', quote: '한 마리씩, 차근차근' },
  { catalogKey: 'panda', name: '판다', quote: '시작이 반이다' },
  { catalogKey: 'otter', name: '수달', quote: '앞서가는 비결은\n일단 시작하는 것' },
  { catalogKey: 'seal', name: '물범', quote: '하지 않은 슛은\n100% 빗나간다' },
  { catalogKey: 'raccoon', name: '라쿤', quote: '티끌 모아 태산' },
  { catalogKey: 'rabbit', name: '토끼', quote: '크든 작든\n절대로 포기하지 마라' },
  { catalogKey: 'squirrel', name: '다람쥐', quote: '작은 일에 최선을 다하면\n큰 힘이 자란다' },
  { catalogKey: 'chick', name: '병아리', quote: '느려도 꾸준한 쪽이 이긴다' },
  { catalogKey: 'dino', name: '공룡', quote: '꾸준함이 재능을 이긴다' },
  { catalogKey: 'sheep', name: '양', quote: '작은 시작이\n큰 변화를 만든다.' },
  { catalogKey: 'dog', name: '강아지', quote: '한 번의 실천이\n백 번의 계획보다 낫다.' },
];

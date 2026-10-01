// 이어가기 응원카드 — 별자리 카탈로그 순서(supabase/migrations/0001_jelly_schema.sql 시드)와
// 동일한 순서로 명언 16개를 고정 배정한다. 랜덤 아님 — catalogKey가 constellation_catalog.key와 1:1 대응.
// 캐릭터 젤리 이미지는 components/vault/ConstellationDetail.jsx의 JELLY_SRC_BY_KEY를 그대로 재사용.
//
// 현재는 "이어가기 최초 1회"에서만 쓰여서 실제로는 0번(검은고양이)만 노출되지만, 추후 다른 트리거
// (예: 별자리 완성 축하)에서 재사용할 수 있게 16개를 전부 미리 준비해둔다.
export const ENCOURAGEMENT_CARDS = [
  { catalogKey: 'blackcat', name: '검은고양이', quote: '시작하는 방법은 말을 멈추고 행동을 시작하는 것' },
  { catalogKey: 'cheesecat', name: '치즈고양이', quote: '천 리 길도 한 걸음부터' },
  { catalogKey: 'hamster', name: '햄스터', quote: '성공은 매일 반복한 작은 노력들의 합이다' },
  { catalogKey: 'capybara', name: '카피바라', quote: '코끼리를 먹는 방법은 한 번에 한 입씩' },
  { catalogKey: 'cub', name: '작은곰', quote: '티끌 모아 태산' },
  { catalogKey: 'quokka', name: '쿼카', quote: '오늘 걷지 않으면 내일은 뛰어야 한다' },
  { catalogKey: 'panda', name: '판다', quote: '완벽보다 완성이 낫다' },
  { catalogKey: 'otter', name: '수달', quote: '시작이 반이다' },
  { catalogKey: 'seal', name: '물범', quote: '작은 발걸음이 모여 큰 여정을 만든다' },
  { catalogKey: 'raccoon', name: '라쿤', quote: '오늘 할 수 있는 일을 내일로 미루지 마라' },
  { catalogKey: 'rabbit', name: '토끼', quote: '느려도 꾸준하면 이긴다' },
  { catalogKey: 'squirrel', name: '다람쥐', quote: '작은 습관이 큰 변화를 만든다' },
  { catalogKey: 'chick', name: '병아리', quote: '한 걸음씩 나아가면 못할 일이 없다' },
  { catalogKey: 'dino', name: '공룡', quote: '포기하지 않는 한 실패한 것이 아니다' },
  { catalogKey: 'sheep', name: '양', quote: '꾸준함이 재능을 이긴다' },
  { catalogKey: 'dog', name: '강아지', quote: '지금 이 순간이 가장 좋은 시작점이다' },
];

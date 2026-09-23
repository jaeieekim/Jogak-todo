// 보관소(은하수) 화면 데이터 읽기. V1.0 PRD §5.2·§5.3.
// 테이블을 직접 쓰지 않는 M1과 달리, 조회는 RLS(본인 행만/카탈로그는 공개)로 보호되므로 클라이언트가 직접 select 한다.
// Supabase 미설정이거나 요청 실패 시 null을 반환 — 화면은 이 경우 빈 상태로 조용히 처리한다(mixpanel.js/lib/jelly.js와 동일 원칙).

import { ensureJellyAccount } from './jelly';
import { layoutPosition } from './galaxyLayout';
import { getConstellationShape, eggShape } from './constellationShapes';

function toLocalDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const LOCKED_PREVIEW_COUNT = 3; // 원경에 흐릿하게 보여줄, 아직 만들어지지 않은 다음 별자리 개수 (PRD §5.2)

// 은하수 전체 데이터. 실패하면 null.
export async function loadGalaxy() {
  const supabase = await ensureJellyAccount();
  if (!supabase) return null;

  const todayKey = toLocalDateKey(new Date());

  const [mineRes, catalogRes, userRes, todayRes] = await Promise.all([
    supabase.from('constellations').select('id,name,catalog_key,piece_count,completed_at'),
    supabase.from('constellation_catalog').select('sort_order,key,name,caption,piece_total').order('sort_order'),
    supabase.from('users').select('created_at').single(),
    supabase.from('jelly_pieces').select('constellation_id').eq('local_date', todayKey),
  ]);
  if (mineRes.error || catalogRes.error) return null;

  const catalogByKey = new Map(catalogRes.data.map((c) => [c.key, c]));
  const todayCountByConstellation = new Map();
  for (const row of todayRes.data ?? []) {
    if (!row.constellation_id) continue;
    todayCountByConstellation.set(row.constellation_id, (todayCountByConstellation.get(row.constellation_id) ?? 0) + 1);
  }

  const mine = (mineRes.data ?? [])
    .map((c) => {
      const cat = catalogByKey.get(c.catalog_key);
      const isProgress = !c.completed_at;
      const shape = isProgress ? { size: 300, ...eggShape } : getConstellationShape(c.catalog_key);
      const total = cat?.piece_total ?? 9;
      const todayCount = todayCountByConstellation.get(c.id) ?? 0;
      return {
        id: c.id,
        catalogKey: c.catalog_key,
        sortOrder: cat?.sort_order ?? 0,
        name: c.name, // "잠든 ○○ 알" 표기는 화면에서 조립 (원본 이름은 카탈로그 name 그대로)
        caption: cat?.caption ?? null,
        pieceCount: c.piece_count,
        pieceTotal: total,
        completed: !isProgress,
        completedAt: c.completed_at,
        status: isProgress ? 'progress' : 'done',
        shape,
        // 오늘 조각을 받았다면 방금 채워진 별 하나를 반짝이게 — 여러 개 받았어도 마지막 하나만 강조(시안 방식)
        sparkIndex: todayCount > 0 ? c.piece_count - 1 : null,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // 원경에 보여줄, 아직 만들지 않은 다음 별자리 몇 개(흐릿한 실루엣) — 유저 데이터는 만들지 않고 공용 카탈로그만 읽는다
  const reachedCount = mine.length;
  const locked = catalogRes.data
    .filter((c) => c.sort_order > reachedCount)
    .slice(0, LOCKED_PREVIEW_COUNT)
    .map((c) => ({
      catalogKey: c.key,
      sortOrder: c.sort_order,
      shape: getConstellationShape(c.key),
      status: 'locked',
      name: null,
    }));

  const all = [...mine, ...locked];
  const progressIndex = mine.findIndex((c) => c.status === 'progress');
  const originIndex = progressIndex >= 0 ? progressIndex : 0;
  const origin = layoutPosition(originIndex);

  const positioned = all.map((c, i) => {
    const p = layoutPosition(i);
    return { ...c, wx: p.x - origin.x, wy: p.y - origin.y };
  });

  const totalPieces = mine.reduce((n, c) => n + c.pieceCount, 0);
  const startedDays = userRes.data?.created_at
    ? Math.max(1, Math.floor((Date.now() - new Date(userRes.data.created_at).getTime()) / 86400000) + 1)
    : 1;

  return { constellations: positioned, totalPieces, startedDays };
}

// ───────────────────────── 개발용 미리보기 (Supabase 안 씀, 실제 데이터 건드리지 않음) ─────────────────────────
// supabase/migrations/0001의 시드와 동일한 카탈로그. 전체 별자리를 다 모은 상태를 화면에서 바로 보고 싶을 때 사용.
// /vault?preview=full 로 접속하면 이 데이터로 렌더링한다 (app/vault/page.jsx에서 분기).
const PREVIEW_CATALOG = [
  { key: 'blackcat', name: '검은고양이자리', caption: '밤을 지키는 아이' },
  { key: 'cheesecat', name: '치즈고양이자리', caption: '노곤한 오후의 볕' },
  { key: 'hamster', name: '햄스터자리', caption: '볼주머니 가득' },
  { key: 'capybara', name: '카피바라자리', caption: '느긋한 온천지기' },
  { key: 'cub', name: '작은곰자리', caption: '가장 밝게 빛나는' },
  { key: 'quokka', name: '쿼카자리', caption: '세상에서 제일 밝은 미소' },
  { key: 'panda', name: '판다자리', caption: '흑백의 균형' },
  { key: 'otter', name: '수달자리', caption: '물살을 가르며' },
  { key: 'seal', name: '물범자리', caption: '동그란 파도' },
  { key: 'raccoon', name: '라쿤자리', caption: '달빛 도둑' },
  { key: 'rabbit', name: '토끼자리', caption: '달로 가는 길' },
  { key: 'squirrel', name: '다람쥐자리', caption: '도토리를 모으며' },
  { key: 'chick', name: '병아리자리', caption: '갓 깨어난 봄' },
  { key: 'dino', name: '공룡자리', caption: '먼 옛날의 발자국' },
  { key: 'sheep', name: '양자리', caption: '포근한 구름 한 조각' },
  { key: 'dog', name: '강아지자리', caption: null },
];

export function buildPreviewGalaxy() {
  const raw = PREVIEW_CATALOG.map((c, i) => {
    const shape = getConstellationShape(c.key);
    const p = layoutPosition(i);
    return {
      id: `preview-${c.key}`,
      catalogKey: c.key,
      sortOrder: i + 1,
      name: c.name,
      caption: c.caption,
      pieceCount: 9,
      pieceTotal: 9,
      completed: true,
      completedAt: new Date(2026, 0, 1 + i * 3).toISOString(),
      status: 'done',
      shape,
      sparkIndex: null,
      wx: p.x,
      wy: p.y,
    };
  });
  const origin = layoutPosition(raw.length - 1); // 가장 최근(마지막) 별자리를 화면 중앙에
  const constellations = raw.map((c) => ({ ...c, wx: c.wx - origin.x, wy: c.wy - origin.y }));
  return { constellations, totalPieces: constellations.length * 9, startedDays: constellations.length * 3 };
}

// 별자리 상세용 — "N일간 함께했어요"(PRD §5.3, 시도 일수 기준. Figma의 "완료한 할 일 N개"는 경계 케이스에서
// 정확히 셀 수 없어 PRD 본문 스펙을 따르고 대체함)
export async function loadConstellationDays(constellationId) {
  const supabase = await ensureJellyAccount();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('jelly_pieces')
    .select('local_date')
    .eq('constellation_id', constellationId);
  if (error) return null;
  return new Set((data ?? []).map((r) => r.local_date)).size;
}

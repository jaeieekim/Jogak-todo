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

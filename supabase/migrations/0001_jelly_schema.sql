-- V1.0 M1: 젤리 컬렉션 스키마 + 익명 인증 기반 적립 로직 (PRD §4.1 · §4.4 · §4.6 · §4.7)
--
-- 설계 요점
--  * 유저 = Supabase 익명 인증 계정(auth.users). 앱은 테이블을 직접 읽고 쓰지 않고, 아래 함수만 호출한다.
--    (RLS는 켜되 정책은 두지 않는다 → 클라이언트 키로는 테이블 직접 접근 불가. 조회 정책은 M2에서 추가)
--  * 적립 멱등성: jelly_pieces 부분 유니크 인덱스 (user_id, source, local_date, seq)
--    → 같은 날 같은 종류는 몇 번을 요청해도 DB가 한 번만 받는다. 하루 3조각 상한은 (ministep 1 + todo 2)의 구조에서 나온다.
--  * 별자리: 유저당 진행 중 1개(부분 유니크 인덱스). 완성되면 카탈로그 순서대로 다음 별자리를 즉시 만든다.
--    카탈로그에 다음 별자리가 없으면 조각은 constellation_id NULL로 쌓아두고, 새 별자리가 추가된 뒤 이어서 배정한다.
--  * 조각은 삭제·차감하는 코드가 없다 (PRD §4.1).

-- ───────────────────────── 테이블 ─────────────────────────

create table public.users (
  id                    uuid primary key references auth.users (id) on delete cascade,
  created_at            timestamptz not null default now(),
  last_seen_at          timestamptz not null default now(),
  first_bonus_granted   boolean not null default false,
  comeback_bonus_granted boolean not null default false
);

-- 별자리 카탈로그: 종류·순서·이름의 원본. 새 별자리는 INSERT 한 줄로 추가한다 (코드 수정 불필요).
create table public.constellation_catalog (
  sort_order   int  primary key check (sort_order > 0),
  key          text not null unique,
  name         text not null unique,
  caption      text,                                        -- 별자리 한 줄 문구 (없으면 NULL)
  piece_total  int  not null default 9 check (piece_total > 0) -- 이 별자리를 완성하는 데 필요한 조각 수
);

create table public.constellations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  name          text not null,                               -- 카탈로그 name (기본 이름, "잠든 ○○ 알" 표기는 화면에서)
  catalog_key   text not null references public.constellation_catalog (key),  -- 모양·색상 등 화면 에셋을 찾는 키 (이름이 바뀌어도 안 끊김)
  completed_at  timestamptz,
  piece_count   int  not null default 0 check (piece_count >= 0)  -- 지금까지 채운 조각 수
);

-- 진행 중인 별자리는 유저당 항상 1개 이하
create unique index constellations_one_in_progress
  on public.constellations (user_id) where completed_at is null;
create index constellations_user_idx on public.constellations (user_id);

create table public.jelly_pieces (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (id) on delete cascade,
  earned_at        timestamptz not null default now(),
  source           text not null check (source in ('ministep', 'todo', 'first', 'comeback')),
  constellation_id uuid references public.constellations (id),   -- NULL = 배정 대기(카탈로그 소진)
  local_date       date not null,                                 -- 적립한 순간의 유저 로컬 날짜 (일일 리셋 기준)
  seq              smallint not null default 1                    -- 같은 날 같은 종류 안에서의 순번 (todo는 1, 2)
);

-- "하루 1회" 규칙을 DB가 보장: 같은 (유저, 종류, 날짜, 순번)은 두 번 들어갈 수 없다
create unique index jelly_pieces_daily_once
  on public.jelly_pieces (user_id, source, local_date, seq)
  where source in ('ministep', 'todo');
create index jelly_pieces_user_idx on public.jelly_pieces (user_id);

alter table public.users                enable row level security;
alter table public.constellation_catalog enable row level security;
alter table public.constellations       enable row level security;
alter table public.jelly_pieces         enable row level security;

-- ───────────────────────── 내부 함수 (앱에서 직접 호출 불가) ─────────────────────────

-- 진행 중 별자리 보장: 이미 있으면 그 id, 없으면 "내가 가진 별자리 수 + 1"번 카탈로그로 새로 만든다.
-- 카탈로그에 다음 항목이 없으면 NULL (조각은 배정 대기로 쌓임).
create function public.jelly_ensure_current(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   uuid;
  v_name text;
  v_key  text;
begin
  select id into v_id
    from constellations
   where user_id = p_user and completed_at is null;
  if found then
    return v_id;
  end if;

  select name, key into v_name, v_key
    from constellation_catalog
   where sort_order = (select count(*) from constellations where user_id = p_user) + 1;
  if not found then
    return null;
  end if;

  insert into constellations (user_id, name, catalog_key) values (p_user, v_name, v_key)
  returning id into v_id;
  return v_id;
end;
$$;

-- 배정 대기 조각을 오래된 순으로 진행 중 별자리에 채운다. 가득 차면 완성 처리하고 다음 별자리로 넘어간다.
-- 마지막에는 항상 (가능하면) 진행 중 별자리가 1개 있도록 보장한다.
create function public.jelly_distribute(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cur   uuid;
  v_total int;
  v_piece uuid;
  v_count int;
begin
  loop
    v_cur := jelly_ensure_current(p_user);
    exit when v_cur is null;

    select id into v_piece
      from jelly_pieces
     where user_id = p_user and constellation_id is null
     order by earned_at, id
     limit 1;
    exit when not found;

    update jelly_pieces set constellation_id = v_cur where id = v_piece;

    update constellations set piece_count = piece_count + 1
     where id = v_cur
    returning piece_count into v_count;

    select cc.piece_total into v_total
      from constellations c
      join constellation_catalog cc on cc.key = c.catalog_key
     where c.id = v_cur;

    if v_count >= v_total then
      update constellations set completed_at = now() where id = v_cur;
    end if;
  end loop;

  perform jelly_ensure_current(p_user);
end;
$$;

-- ───────────────────────── 앱이 호출하는 함수 ─────────────────────────

-- 앱 진입 시 1회: 내 users 행과 첫 별자리를 보장한다 (last_seen_at은 건드리지 않음 — M3 복귀 보너스용)
create function public.ensure_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  insert into users (id) values (v_uid) on conflict (id) do nothing;
  perform jelly_ensure_current(v_uid);
end;
$$;

-- 조각 적립. p_source: 'ministep'(1조각) | 'todo'(2조각), p_local_date: 유저 로컬 날짜(자정 기준)
-- 반환: { earned, total_pieces, first_of_day }  (earned = 이번 호출로 실제 새로 받은 조각 수)
create function public.earn_jelly(p_source text, p_local_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_n         int;
  v_i         int;
  v_rows      int;
  v_earned    int := 0;
  v_first     boolean;
  v_utc_today date := (now() at time zone 'utc')::date;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_source not in ('ministep', 'todo') then
    raise exception 'invalid source: %', p_source;
  end if;
  -- 시간대 차이(UTC-12~+14)는 허용하되, 임의 날짜로 일일 상한을 우회하는 것은 막는다
  if p_local_date is null or abs(p_local_date - v_utc_today) > 1 then
    raise exception 'invalid local_date: %', p_local_date;
  end if;

  insert into users (id) values (v_uid) on conflict (id) do nothing;
  -- 같은 유저의 동시 요청을 직렬화 (별자리 배정 순서 보호)
  perform 1 from users where id = v_uid for update;

  v_n := case p_source when 'ministep' then 1 else 2 end;

  select not exists (
    select 1 from jelly_pieces
     where user_id = v_uid and local_date = p_local_date and source in ('ministep', 'todo')
  ) into v_first;

  for v_i in 1..v_n loop
    insert into jelly_pieces (user_id, source, local_date, seq)
    values (v_uid, p_source, p_local_date, v_i)
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    v_earned := v_earned + v_rows;
  end loop;

  perform jelly_distribute(v_uid);

  return jsonb_build_object(
    'earned', v_earned,
    'total_pieces', (select count(*) from jelly_pieces where user_id = v_uid),
    'first_of_day', v_first and v_earned > 0
  );
end;
$$;

-- 내부 함수는 잠그고, 앱 함수는 로그인(익명 포함)된 유저에게만 연다
revoke all on function public.jelly_ensure_current(uuid) from public;
revoke all on function public.jelly_distribute(uuid)     from public;
revoke all on function public.ensure_user()              from public;
revoke all on function public.earn_jelly(text, date)     from public;
grant execute on function public.ensure_user()            to authenticated;
grant execute on function public.earn_jelly(text, date)   to authenticated;

-- ───────────────────────── 조회 권한 (M2: 보관소 화면이 읽어야 함) ─────────────────────────
-- 유저는 "로그인 전"이 아니라 이미 익명 인증으로 로그인된 상태(auth.uid()가 항상 있음)라서,
-- 본인 행만 허용하는 정책을 지금 걸어도 막히지 않는다. 카탈로그는 개인 데이터가 아니라 누구나 읽을 수 있게 둔다.

grant select on public.constellation_catalog to anon, authenticated;
create policy constellation_catalog_read on public.constellation_catalog
  for select using (true);

grant select on public.users, public.constellations, public.jelly_pieces to authenticated;

create policy users_own_read on public.users
  for select using (auth.uid() = id);

create policy constellations_own_read on public.constellations
  for select using (auth.uid() = user_id);

create policy jelly_pieces_own_read on public.jelly_pieces
  for select using (auth.uid() = user_id);

-- ───────────────────────── 시드: 별자리 카탈로그 (Figma Make 시안의 생성 순서) ─────────────────────────
-- piece_total은 임시로 전부 9. 별자리별 조각 수가 확정되면 이 값만 바꾸면 된다.
-- 새 별자리는 sort_order를 이어서 INSERT 하면 된다.
insert into public.constellation_catalog (sort_order, key, name, caption, piece_total) values
  ( 1, 'blackcat',  '검은고양이자리', '밤을 지키는 아이',      9),
  ( 2, 'cheesecat', '치즈고양이자리', '노곤한 오후의 볕',      9),
  ( 3, 'hamster',   '햄스터자리',     '볼주머니 가득',         9),
  ( 4, 'capybara',  '카피바라자리',   '느긋한 온천지기',       9),
  ( 5, 'cub',       '작은곰자리',     '가장 밝게 빛나는',      9),
  ( 6, 'quokka',    '쿼카자리',       '세상에서 제일 밝은 미소', 9),
  ( 7, 'panda',     '판다자리',       '흑백의 균형',           9),
  ( 8, 'otter',     '수달자리',       '물살을 가르며',         9),
  ( 9, 'seal',      '물범자리',       '동그란 파도',           9),
  (10, 'raccoon',   '라쿤자리',       '달빛 도둑',             9),
  (11, 'rabbit',    '토끼자리',       '달로 가는 길',          9),
  (12, 'squirrel',  '다람쥐자리',     '도토리를 모으며',       9),
  (13, 'chick',     '병아리자리',     '갓 깨어난 봄',          9),
  (14, 'dino',      '공룡자리',       '먼 옛날의 발자국',      9),
  (15, 'sheep',     '양자리',         '포근한 구름 한 조각',   9),
  (16, 'dog',       '강아지자리',     null,                    9);

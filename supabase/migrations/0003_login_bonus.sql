-- V1.0 로그인 보너스: 카카오 등 실계정으로 처음 로그인하면 검은고양이자리를 무조건(즉시 완성) 지급 (사용자 지시, 2026-09-29)
--
-- 요점
--  * 검은고양이자리(catalog_key='blackcat')는 모든 유저의 첫 별자리라서, 진행 중이든(대부분) 이미 완성했든
--    딱 하나만 존재한다 — 그 행을 찾아 부족한 조각만큼 채워서 즉시 완성 처리한다.
--  * users.login_bonus_granted로 계정당 1회만 지급(멱등) — jelly_grant_bonus(first/comeback)와 동일 패턴.
--  * ensure_user()가 호출될 때마다, 이번 세션이 "익명이 아니면"(auth.jwt()의 is_anonymous 클레임) 자동으로 시도한다.
--    별도 화면·API 호출 없이 로그인 완료 후 다음 ensure_user() 호출(앱 진입 시 항상 호출됨)에서 자연히 지급된다.

alter table public.users add column if not exists login_bonus_granted boolean not null default false;

alter table public.jelly_pieces drop constraint if exists jelly_pieces_source_check;
alter table public.jelly_pieces add constraint jelly_pieces_source_check
  check (source in ('ministep', 'todo', 'first', 'comeback', 'login'));

-- 계정당 1회, 검은고양이자리를 부족한 조각만큼 채워 즉시 완성시킨다. 이미 완성돼 있으면 조각만 안 늘리고 granted만 true.
-- 반환: { granted: boolean, name?: text }
create function public.jelly_grant_login_bonus(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok    boolean;
  v_con   uuid;
  v_have  int;
  v_total int;
  v_name  text;
  v_i     int;
begin
  update users set login_bonus_granted = true
   where id = p_user and login_bonus_granted = false
  returning true into v_ok;

  if not coalesce(v_ok, false) then
    return jsonb_build_object('granted', false);
  end if;

  select id, piece_count into v_con, v_have
    from constellations
   where user_id = p_user and catalog_key = 'blackcat';

  if not found then
    insert into constellations (user_id, name, catalog_key)
    select p_user, cc.name, cc.key from constellation_catalog cc where cc.key = 'blackcat'
    returning id, piece_count into v_con, v_have;
  end if;

  select cc.piece_total, cc.name into v_total, v_name
    from constellation_catalog cc where cc.key = 'blackcat';

  if v_have < v_total then
    for v_i in 1..(v_total - v_have) loop
      insert into jelly_pieces (user_id, source, local_date, seq, constellation_id)
      values (p_user, 'login', (now() at time zone 'utc')::date, v_have + v_i, v_con);
    end loop;
    update constellations set piece_count = v_total, completed_at = now() where id = v_con;
  end if;

  return jsonb_build_object('granted', true, 'name', v_name);
end;
$$;
revoke all on function public.jelly_grant_login_bonus(uuid) from public;

-- ───────────────────────── ensure_user: 로그인 보너스 시도 + 결과 필드 추가 ─────────────────────────

drop function if exists public.ensure_user();

create function public.ensure_user()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_is_new       boolean;
  v_last_seen    timestamptz;
  v_gap_days     numeric;
  v_bonus        text := null;
  v_result       jsonb;
  v_completed    jsonb := '[]'::jsonb;
  v_days_away    int;
  v_login_result jsonb;
  v_is_anon      boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  insert into users (id) values (v_uid)
  on conflict (id) do nothing
  returning true into v_is_new;
  v_is_new := coalesce(v_is_new, false);

  select last_seen_at into v_last_seen from users where id = v_uid for update;

  if v_is_new then
    v_bonus := 'first';
    v_result := jelly_grant_bonus(v_uid, 'first');
    v_completed := v_result->'completed';
  else
    v_gap_days := extract(epoch from (now() - v_last_seen)) / 86400.0;
    if v_gap_days >= 7 then
      v_result := jelly_grant_bonus(v_uid, 'comeback');
      if (v_result->>'granted')::boolean then
        v_bonus := 'comeback';
        v_completed := v_result->'completed';
        v_days_away := floor(v_gap_days)::int;
      end if;
    end if;
  end if;

  -- 익명 세션엔 이 클레임이 true, 카카오 등 실로그인 세션엔 false(또는 없음) — coalesce로 익명 쪽만 걸러낸다
  v_is_anon := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  if not v_is_anon then
    v_login_result := jelly_grant_login_bonus(v_uid);
  end if;

  update users set last_seen_at = now() where id = v_uid;
  perform jelly_ensure_current(v_uid);

  return jsonb_build_object(
    'bonus_granted', v_bonus,
    'completed', v_completed,
    'days_away', v_days_away,
    'login_jelly_granted', coalesce((v_login_result->>'granted')::boolean, false),
    'login_jelly_name', v_login_result->>'name'
  );
end;
$$;
grant execute on function public.ensure_user() to authenticated;

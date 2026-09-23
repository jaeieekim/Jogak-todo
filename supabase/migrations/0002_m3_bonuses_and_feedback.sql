-- V1.0 M3: 보너스 지급 + 홈 화면 획득 피드백을 위한 서버 변경분 (0001에 이어서 적용)
-- PRD §4.2(보너스 지급 조건) · §4.3(획득 피드백) · §4.6(계정 및 로그인)
--
-- 0001은 이미 실제 DB에 적용된 상태라 그 파일은 더 이상 고치지 않는다. 이 파일만 SQL Editor에서 실행하면 된다.
--
-- 변경 요점
--  * jelly_distribute(): 이번 호출로 "새로 완성된" 별자리 목록을 반환하도록 확장(기존엔 반환값 없음).
--    반환 타입이 void→jsonb로 바뀌므로 CREATE OR REPLACE가 안 통해 DROP 후 다시 만든다.
--  * earn_jelly(): 반환값에 completed(이번 호출로 완성된 별자리) 추가. 반환 타입은 그대로(jsonb)라 OR REPLACE로 충분.
--  * jelly_grant_bonus(): 첫 사용/복귀 보너스(3조각)를 계정당 1회만, 멱등하게 지급하는 내부 함수. 신규.
--  * ensure_user(): 앱 진입마다 호출 — 신규 유저면 첫 사용 보너스, 복귀(7일 이상 공백) 유저면 복귀 보너스를 지급하고
--    last_seen_at을 갱신한다(0001에서는 의도적으로 안 건드렸던 부분). 반환 타입이 void→jsonb로 바뀜(DROP 후 재생성).
--  * 팝업 우선순위(완성 > 보너스 > 오늘 첫 획득)는 서버가 강제하지 않고, 클라이언트가 completed/bonus_granted/
--    first_of_day 신호를 받아 그 순서로 하나만 고른다 — 서버는 신호만 정확히 보고한다.

-- ───────────────────────── jelly_distribute: 완성된 별자리를 보고하도록 확장 ─────────────────────────

drop function if exists public.jelly_distribute(uuid);

create function public.jelly_distribute(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cur       uuid;
  v_total     int;
  v_piece     uuid;
  v_count     int;
  v_name      text;
  v_completed jsonb := '[]'::jsonb;
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
    returning piece_count, name into v_count, v_name;

    select cc.piece_total into v_total
      from constellations c
      join constellation_catalog cc on cc.key = c.catalog_key
     where c.id = v_cur;

    if v_count >= v_total then
      update constellations set completed_at = now() where id = v_cur;
      v_completed := v_completed || jsonb_build_object('id', v_cur, 'name', v_name);
    end if;
  end loop;

  perform jelly_ensure_current(p_user);
  return v_completed;
end;
$$;

-- ───────────────────────── earn_jelly: completed 필드 추가 ─────────────────────────

create or replace function public.earn_jelly(p_source text, p_local_date date)
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
  v_completed jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_source not in ('ministep', 'todo') then
    raise exception 'invalid source: %', p_source;
  end if;
  if p_local_date is null or abs(p_local_date - v_utc_today) > 1 then
    raise exception 'invalid local_date: %', p_local_date;
  end if;

  insert into users (id) values (v_uid) on conflict (id) do nothing;
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

  v_completed := jelly_distribute(v_uid);

  return jsonb_build_object(
    'earned', v_earned,
    'total_pieces', (select count(*) from jelly_pieces where user_id = v_uid),
    'first_of_day', v_first and v_earned > 0,
    'completed', v_completed
  );
end;
$$;

-- ───────────────────────── 보너스 지급 (내부) ─────────────────────────

-- p_source: 'first' | 'comeback'. 계정당 1회, users의 해당 플래그를 원자적으로(동시 요청에도 안전하게) 먼저 세운 뒤에만 지급한다.
-- 반환: { granted: boolean, completed: jsonb[] }
create function public.jelly_grant_bonus(p_user uuid, p_source text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flag_col text;
  v_granted  boolean;
  v_i        int;
begin
  if p_source not in ('first', 'comeback') then
    raise exception 'invalid bonus source: %', p_source;
  end if;
  v_flag_col := case p_source when 'first' then 'first_bonus_granted' else 'comeback_bonus_granted' end;

  if v_flag_col = 'first_bonus_granted' then
    update users set first_bonus_granted = true
     where id = p_user and first_bonus_granted = false
    returning true into v_granted;
  else
    update users set comeback_bonus_granted = true
     where id = p_user and comeback_bonus_granted = false
    returning true into v_granted;
  end if;

  if not coalesce(v_granted, false) then
    return jsonb_build_object('granted', false, 'completed', '[]'::jsonb);
  end if;

  for v_i in 1..3 loop
    insert into jelly_pieces (user_id, source, local_date, seq)
    values (p_user, p_source, (now() at time zone 'utc')::date, v_i);
  end loop;

  return jsonb_build_object('granted', true, 'completed', jelly_distribute(p_user));
end;
$$;
revoke all on function public.jelly_grant_bonus(uuid, text) from public;

-- ───────────────────────── ensure_user: 앱 진입 시 보너스 판정 + last_seen_at 갱신 ─────────────────────────
-- 반환: { bonus_granted: 'first' | 'comeback' | null, completed: jsonb[] }
-- 우선순위(완성 > 보너스)는 클라이언트가 이 응답의 completed를 먼저 보고, 있으면 완성 팝업만 띄우는 방식으로 처리한다.

drop function if exists public.ensure_user();

create function public.ensure_user()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_is_new     boolean;
  v_last_seen  timestamptz;
  v_gap_days   numeric;
  v_bonus      text := null;
  v_result     jsonb;
  v_completed  jsonb := '[]'::jsonb;
  v_days_away  int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  insert into users (id) values (v_uid)
  on conflict (id) do nothing
  returning true into v_is_new;
  v_is_new := coalesce(v_is_new, false);

  -- 동시에 여러 번(다른 탭 등) 호출돼도 이 유저 기준으로 한 번씩만 처리되도록 잠근다
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
        v_days_away := floor(v_gap_days)::int; -- Mixpanel comeback_bonus_granted의 days_away 프로퍼티용 (PRD §7)
      end if;
    end if;
  end if;

  update users set last_seen_at = now() where id = v_uid;
  perform jelly_ensure_current(v_uid); -- 보너스가 없었던 재방문자도 진행 중 별자리가 항상 있도록 보장

  return jsonb_build_object('bonus_granted', v_bonus, 'completed', v_completed, 'days_away', v_days_away);
end;
$$;
grant execute on function public.ensure_user() to authenticated;

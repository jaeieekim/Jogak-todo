-- V1.3 공유 보상(캐릭터 젤리 선물) — 0001~0005에 이어서 적용
--
-- 설계 요점
--  * 초대 링크는 유저당 고정 1개(users.invite_code, lazy 생성). 공유 버튼을 누를 때마다 새로 안 만든다.
--  * "신규 유저" 판정: 완성한 별자리 유무가 아니라 "카카오 계정을 방금 이 흐름에서 처음 연결했는지"로 본다
--    (이 앱은 익명으로도 별자리를 모을 수 있어서, 진행 상황 유무로는 신규/기존을 못 가른다 — 사용자 확인 완료).
--    auth.identities의 kakao identity가 최근 10분 내 생성됐는지로 판단한다.
--  * 자기 자신에게 보내 받는 것 방지: 수신자·공유자의 카카오 identity_data->>'provider_id'(카카오 고유 회원번호)를 비교.
--  * 캐릭터 지급은 jelly_grant_login_bonus(0003)와 같은 패턴을 catalog_key 파라미터로 일반화한 jelly_grant_character.
--    "아직 안 가진 것"은 완성(completed_at not null) 여부로만 판단 — 진행 중인 것과 같은 키가 뽑히면 그걸 즉시 완성시킨다.
--  * 16개를 다 가졌으면 캐릭터 대신 조각 9개(요청: 별자리 1개 분량)를 현재 진행 중 별자리에 지급.
--  * 공유자 보상은 "받는 사람이 claim한 즉시"가 아니라 "공유자가 다음에 앱 켜서 팝업 보고 받기 누를 때" 지급된다
--    (ensure_user가 referral_pending만 알려주고, 실제 지급은 claim_referral_reward()에서).

-- ───────────────────────── 스키마 ─────────────────────────

alter table public.users add column if not exists invite_code text unique;
alter table public.users add column if not exists invited_by_user_id uuid references public.users(id);
alter table public.users add column if not exists referral_claimed_by_user_id uuid references public.users(id);
alter table public.users add column if not exists referral_reward_granted boolean not null default false;

alter table public.jelly_pieces drop constraint if exists jelly_pieces_source_check;
alter table public.jelly_pieces add constraint jelly_pieces_source_check
  check (source in ('ministep', 'todo', 'first', 'comeback', 'login', 'gift'));

-- ───────────────────────── 내부 함수 ─────────────────────────

-- 유저당 고정 초대 코드를 돌려준다(없으면 생성). URL-safe, 충돌 시 재시도.
create or replace function public.get_or_create_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_code text;
  v_tries int := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select invite_code into v_code from users where id = v_uid;
  if v_code is not null then
    return v_code;
  end if;

  loop
    v_tries := v_tries + 1;
    -- pgcrypto(gen_random_bytes) 없이, 코어 함수만으로 충분히 무작위한 10자 코드 생성
    v_code := substr(md5(random()::text || clock_timestamp()::text || v_uid::text), 1, 10);
    begin
      update users set invite_code = v_code where id = v_uid and invite_code is null;
      exit;
    exception when unique_violation then
      if v_tries > 10 then
        raise exception 'could not allocate invite code';
      end if;
    end;
  end loop;

  select invite_code into v_code from users where id = v_uid;
  return v_code;
end;
$$;
revoke all on function public.get_or_create_invite_code() from public;
grant execute on function public.get_or_create_invite_code() to authenticated;

-- 아직 완성 안 한 캐릭터 중 하나를 무작위로 즉시 완성시킨다. 다 가졌으면 granted=false.
-- p_source는 jelly_pieces.source에 그대로 기록(이력 구분용).
--
-- 주의: 뽑힌 키가 지금 "진행 중"인 별자리(유저당 항상 최대 1개, completed_at is null)와 다를 수 있다.
-- 그 경우 새 행을 completed_at=null로 끼워넣으면 constellations_one_in_progress 유니크 제약과 충돌하므로,
-- 새로 만드는 행은 완성 상태(piece_count=total, completed_at=now())로 바로 insert한다 — "진행 중" 상태를
-- 거치지 않는다. 뽑힌 키가 마침 지금 진행 중인 바로 그 별자리면(가끔 발생) 그 자리를 채워 완성시킨다.
create function public.jelly_grant_character(p_user uuid, p_source text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key   text;
  v_name  text;
  v_total int;
  v_con   uuid;
  v_have  int;
  v_i     int;
begin
  select cc.key, cc.name, cc.piece_total into v_key, v_name, v_total
    from constellation_catalog cc
   where cc.key not in (
     select catalog_key from constellations where user_id = p_user and completed_at is not null
   )
   order by random()
   limit 1;

  if not found then
    return jsonb_build_object('granted', false, 'reason', 'all_owned');
  end if;

  select id, piece_count into v_con, v_have
    from constellations where user_id = p_user and catalog_key = v_key;

  if not found then
    insert into constellations (user_id, name, catalog_key, piece_count, completed_at)
    values (p_user, v_name, v_key, v_total, now())
    returning id into v_con;
    for v_i in 1..v_total loop
      insert into jelly_pieces (user_id, source, local_date, seq, constellation_id)
      values (p_user, p_source, (now() at time zone 'utc')::date, v_i, v_con);
    end loop;
  else
    if v_have < v_total then
      for v_i in 1..(v_total - v_have) loop
        insert into jelly_pieces (user_id, source, local_date, seq, constellation_id)
        values (p_user, p_source, (now() at time zone 'utc')::date, v_have + v_i, v_con);
      end loop;
    end if;
    update constellations set piece_count = v_total, completed_at = now() where id = v_con;
  end if;

  perform jelly_ensure_current(p_user); -- 방금 완성시킨 게 진행 중 별자리였다면, 다음 진행 중 별자리를 바로 보장
  return jsonb_build_object('granted', true, 'catalogKey', v_key, 'name', v_name);
end;
$$;
revoke all on function public.jelly_grant_character(uuid, text) from public;

-- 다 가졌을 때 대체로 조각 N개를 현재 진행 중 별자리에 지급(기존 jelly_grant_bonus와 같은 방식 재사용).
create function public.jelly_grant_pieces(p_user uuid, p_source text, p_count int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_i int;
begin
  for v_i in 1..p_count loop
    insert into jelly_pieces (user_id, source, local_date, seq)
    values (p_user, p_source, (now() at time zone 'utc')::date, v_i);
  end loop;
  perform jelly_distribute(p_user);
  return jsonb_build_object('granted', true, 'pieces', p_count);
end;
$$;
revoke all on function public.jelly_grant_pieces(uuid, text, int) from public;

-- 캐릭터가 다 떨어졌으면 조각 9개(별자리 1개 분량)로 대체 지급하는 공통 경로.
create function public.jelly_grant_character_or_pieces(p_user uuid, p_source text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  v_result := jelly_grant_character(p_user, p_source);
  if (v_result->>'granted')::boolean then
    return v_result;
  end if;
  return jelly_grant_pieces(p_user, p_source, 9);
end;
$$;
revoke all on function public.jelly_grant_character_or_pieces(uuid, text) from public;

-- 두 유저가 같은 카카오 계정인지(자기 자신에게 보내 받기 방지).
-- auth.identities의 전용 provider_id 컬럼(외부 제공자의 고유 회원번호, identity_data 안이 아니라
-- 테이블 자체 컬럼)으로 비교한다. identity_data 내부 키는 제공자마다/버전마다 달라질 수 있어 안정적이지 않다.
create function public.jelly_same_kakao_identity(p_a uuid, p_b uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
      from auth.identities ia
      join auth.identities ib
        on ia.provider = 'kakao' and ib.provider = 'kakao'
       and ia.provider_id = ib.provider_id
     where ia.user_id = p_a and ib.user_id = p_b
  );
$$;
revoke all on function public.jelly_same_kakao_identity(uuid, uuid) from public;

-- ───────────────────────── 앱이 호출하는 함수 ─────────────────────────

-- 받는 사람(신규 유저)이 초대 링크를 claim한다. 카카오 로그인 완료 직후 호출.
-- 반환: { status: 'granted'|'needs_login'|'invalid_code'|'self_referral'|'existing_user'|'already_claimed', ... }
create function public.claim_invite_gift(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_sharer    uuid;
  v_is_anon   boolean;
  v_fresh     boolean;
  v_ok        boolean;
  v_result    jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  v_is_anon := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  if v_is_anon then
    return jsonb_build_object('status', 'needs_login');
  end if;

  select id into v_sharer from users where invite_code = p_code;
  if not found then
    return jsonb_build_object('status', 'invalid_code');
  end if;
  if v_sharer = v_uid then
    return jsonb_build_object('status', 'self_referral');
  end if;

  if jelly_same_kakao_identity(v_uid, v_sharer) then
    return jsonb_build_object('status', 'self_referral');
  end if;

  -- "신규" = 이 흐름에서 방금(최근 10분 내) 카카오 계정을 처음 연결함. 그보다 오래됐으면 기존 유저.
  select exists (
    select 1 from auth.identities
     where user_id = v_uid and provider = 'kakao' and created_at > now() - interval '10 minutes'
  ) into v_fresh;
  if not v_fresh then
    return jsonb_build_object('status', 'existing_user');
  end if;

  update users set invited_by_user_id = v_sharer
   where id = v_uid and invited_by_user_id is null
  returning true into v_ok;
  if not coalesce(v_ok, false) then
    return jsonb_build_object('status', 'already_claimed');
  end if;

  -- 공유자 쪽 "선물 도착" 신호는 그 링크로 처음 들어온 사람 기준 1회만
  update users set referral_claimed_by_user_id = v_uid
   where id = v_sharer and referral_claimed_by_user_id is null;

  v_result := jelly_grant_character_or_pieces(v_uid, 'gift');
  return jsonb_build_object('status', 'granted') || v_result;
end;
$$;
revoke all on function public.claim_invite_gift(text) from public;
grant execute on function public.claim_invite_gift(text) to authenticated;

-- 공유자가 "선물 도착" 팝업을 보고 받기를 눌렀을 때 호출.
-- 반환: { status: 'granted'|'nothing_to_claim', ... }
create function public.claim_referral_reward()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_ok     boolean;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  update users set referral_reward_granted = true
   where id = v_uid and referral_claimed_by_user_id is not null and referral_reward_granted = false
  returning true into v_ok;

  if not coalesce(v_ok, false) then
    return jsonb_build_object('status', 'nothing_to_claim');
  end if;

  v_result := jelly_grant_character_or_pieces(v_uid, 'gift');
  return jsonb_build_object('status', 'granted') || v_result;
end;
$$;
revoke all on function public.claim_referral_reward() from public;
grant execute on function public.claim_referral_reward() to authenticated;

-- ───────────────────────── ensure_user: referral_pending 신호 추가 ─────────────────────────

drop function if exists public.ensure_user();

create function public.ensure_user()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid             uuid := auth.uid();
  v_is_new          boolean;
  v_last_seen       timestamptz;
  v_gap_days        numeric;
  v_bonus           text := null;
  v_result          jsonb;
  v_completed       jsonb := '[]'::jsonb;
  v_days_away       int;
  v_login_result    jsonb;
  v_is_anon         boolean;
  v_referral_pending boolean;
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

  v_is_anon := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  if not v_is_anon then
    v_login_result := jelly_grant_login_bonus(v_uid);
  end if;

  select (referral_claimed_by_user_id is not null and not referral_reward_granted)
    into v_referral_pending
    from users where id = v_uid;

  update users set last_seen_at = now() where id = v_uid;
  perform jelly_ensure_current(v_uid);

  return jsonb_build_object(
    'bonus_granted', v_bonus,
    'completed', v_completed,
    'days_away', v_days_away,
    'login_jelly_granted', coalesce((v_login_result->>'granted')::boolean, false),
    'login_jelly_name', v_login_result->>'name',
    'referral_pending', coalesce(v_referral_pending, false)
  );
end;
$$;
grant execute on function public.ensure_user() to authenticated;

-- ───────────────────────── 조회 권한 ─────────────────────────
-- 초대 링크 공유 시 내 invite_code를 URL에 넣어야 하므로 본인 행은 이미 users_own_read로 읽힌다(0001).
-- claim_invite_gift가 invite_code→유저를 찾는 건 security definer 함수 내부라 RLS와 무관.

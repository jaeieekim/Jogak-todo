-- V1.0 "시작 기념 3조각" 보너스를 "로그인 선물"로 재정의 (사용자 지시, 2026-09-29)
--
-- 문제: first_bonus_granted가 "앱을 처음 여는 익명 계정"마다 지급됐다. 로그아웃하면 다음 진입 때
-- 새 익명 계정이 생기고, 그 계정도 "처음"이라 또 지급돼서 — 로그아웃할 때마다 3조각을 또 받는 것처럼 보였다.
-- 수정: 익명 계정에는 더 이상 지급하지 않는다. 카카오 등 실계정으로 "처음 로그인"할 때만(계정당 1회,
-- first_bonus_granted 플래그는 그대로 재사용) 지급한다. 문구도 "로그인 선물"로 바꾼다(코드 쪽 JellyPopup.jsx).

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

  v_is_anon := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);

  -- "첫 실로그인" 보너스 — 익명 세션엔 더 이상 지급 안 함. 계정당 1회(first_bonus_granted)는 그대로.
  if not v_is_anon then
    v_result := jelly_grant_bonus(v_uid, 'first');
    if (v_result->>'granted')::boolean then
      v_bonus := 'first';
      v_completed := v_result->'completed';
    end if;
  end if;

  -- 복귀 보너스는 기존과 동일(익명 여부와 무관) — 단, 이번 호출에서 위 첫 로그인 보너스가 이미 잡혔으면 생략
  if v_bonus is null and not v_is_new then
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

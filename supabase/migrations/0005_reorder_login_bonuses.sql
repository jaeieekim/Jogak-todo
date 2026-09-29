-- V1.0 로그인 보너스 순서 수정 (사용자 지시, 2026-09-29)
--
-- 문제: "로그인 선물"(별조각 3개)이 "검은고양이자리 즉시완성" 보너스보다 먼저 실행돼서, 그 3개가
-- 새 별자리가 아니라 마침 진행 중이던 검은고양이자리를 마무리하는 데 묻혀버렸다(눈에 안 보임).
-- 수정: 검은고양이자리부터 통째로 먼저 완성시키고, 그다음 로그인 선물 3개를 분배한다 —
-- 그러면 이 3개는 항상 검은고양이자리 "다음" 별자리(치즈고양이자리)에 눈에 보이게 쌓인다.

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

  -- 순서 중요: 검은고양이자리부터 통째로 완성시킨 다음, 로그인 선물(3조각)을 분배한다
  -- (그래야 로그인 선물이 검은고양이자리 마무리에 묻히지 않고 다음 별자리에 쌓인다)
  if not v_is_anon then
    v_login_result := jelly_grant_login_bonus(v_uid);
  end if;

  if not v_is_anon then
    v_result := jelly_grant_bonus(v_uid, 'first');
    if (v_result->>'granted')::boolean then
      v_bonus := 'first';
      v_completed := v_result->'completed';
    end if;
  end if;

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

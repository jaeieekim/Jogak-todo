-- (이 파일은 애초에 jelly-cub.png 이미지가 없어서 'cub'을 뽑기 대상에서 잠깐 뺐던 패치였는데,
-- 이미지가 생겨서 바로 되돌림 — 원래 0006의 jelly_grant_character와 동일. create or replace라
-- 이 파일을 먼저 실행했든 안 했든 이번 버전을 실행하면 결과는 같다.)
create or replace function public.jelly_grant_character(p_user uuid, p_source text)
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

-- jelly-cub.png(작은곰자리 캐릭터 젤리) 이미지가 아직 없는데, 뽑기 함수는 전체 카탈로그에서
-- order by random()으로 뽑다 보니 'cub'도 뽑힐 수 있었음 — 뽑히면 헤딩/이름 텍스트는 정상 표시되는데
-- 캐릭터 그래픽(Image src="/vault/jelly-cub.png")만 깨져서 "캐릭터가 안 나온다"처럼 보이는 버그.
-- 클라이언트 쪽(JellyPopup.jsx JELLY_GALLERY)은 이미 'cub'을 빼뒀는데 서버 뽑기 함수만 안 맞춰져 있었음.
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
     and cc.key != 'cub' -- 전용 캐릭터 이미지가 아직 없어서 뽑기 대상에서 제외(이미지 생기면 이 줄만 지우면 됨)
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

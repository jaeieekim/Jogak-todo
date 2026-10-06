-- '양자리' → '작은양자리'로 이름 변경 (사용자 요청). 0001 시드 데이터를 이미 가진 기존 DB를 위한
-- 패치 — 0001 자체도 같이 고쳐뒀지만(새로 설치하는 경우 대비), 이미 데이터가 들어간 live DB는
-- insert가 아니라 update로 반영해야 한다.
update public.constellation_catalog
   set name = '작은양자리'
 where key = 'sheep';

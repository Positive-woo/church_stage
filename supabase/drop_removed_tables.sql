-- 기존 DB에서 워크플로우·팀 배정 테이블 제거 (이미 migration.sql을 실행한 경우)
-- Supabase Dashboard → SQL Editor에서 실행

ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS tasks;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS team_members;

DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;

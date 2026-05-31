-- Retreat Supplies Management App — Supabase schema
-- Supabase Dashboard → SQL Editor에 붙여넣고 Run

-- boxes must exist before items (foreign key)
CREATE TABLE IF NOT EXISTS boxes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '기타',
  location TEXT NOT NULL DEFAULT '',
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'unplaced',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '기타',
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  box_id TEXT REFERENCES boxes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stage_elements (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  x DOUBLE PRECISION NOT NULL DEFAULT 0,
  y DOUBLE PRECISION NOT NULL DEFAULT 0,
  width DOUBLE PRECISION NOT NULL DEFAULT 0,
  height DOUBLE PRECISION NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_box_id ON items(box_id);
CREATE INDEX IF NOT EXISTS idx_stage_elements_type ON stage_elements(type);

-- Row Level Security (anon key — 팀 공유 앱용 공개 읽기/쓰기)
ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boxes_all" ON boxes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "items_all" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "stage_elements_all" ON stage_elements FOR ALL USING (true) WITH CHECK (true);

-- Realtime (Dashboard → Database → Replication에서도 활성화 가능)
ALTER TABLE boxes REPLICA IDENTITY FULL;
ALTER TABLE items REPLICA IDENTITY FULL;
ALTER TABLE stage_elements REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE boxes;
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE stage_elements;

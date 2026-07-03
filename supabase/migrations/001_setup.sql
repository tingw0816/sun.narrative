-- ── 按讚表 ──
create table if not exists likes (
  id         bigint generated always as identity primary key,
  post_id    text        not null,
  ip         text        not null,
  created_at timestamptz not null default now(),
  unique (post_id, ip)
);

-- 僅允許匿名讀取（計數用），寫入由 Edge Function 以 service_role 執行
alter table likes enable row level security;

create policy "anon can read likes"
  on likes for select
  to anon
  using (true);

-- ── 搜尋紀錄表 ──
create table if not exists search_logs (
  id         bigint generated always as identity primary key,
  keyword    text        not null,
  created_at timestamptz not null default now()
);

alter table search_logs enable row level security;

-- 前端以 anon key 直接寫入
create policy "anon can insert search_logs"
  on search_logs for insert
  to anon
  with check (char_length(keyword) between 2 and 50);

-- 前端讀取熱門關鍵字
create policy "anon can read search_logs"
  on search_logs for select
  to anon
  using (true);

-- 建議：定期清除舊資料（可設 pg_cron）
-- delete from search_logs where created_at < now() - interval '90 days';

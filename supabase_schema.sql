-- Supabase Schema for Zigzup
-- Run this in the Supabase SQL Editor

-- 1. Workspaces
create table workspaces (
  id text primary key,
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Boards
create table boards (
  id text primary key default substring(gen_random_uuid()::text, 1, 8),
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Lists
create table lists (
  id text primary key default substring(gen_random_uuid()::text, 1, 8),
  board_id text not null references boards(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Cards
create table cards (
  id text primary key default substring(gen_random_uuid()::text, 1, 8),
  list_id text not null references lists(id) on delete cascade,
  title text not null,
  description text,
  priority text,
  assignee_id text,
  due_date text,
  position integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Members
create table members (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  email text not null,
  name text not null,
  role text not null default 'member',
  avatar text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (workspace_id, user_id)
);

-- 6. Invites
create table invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null references workspaces(id) on delete cascade,
  workspace_name text not null,
  invited_by text not null,
  invited_email text not null,
  role text not null default 'member',
  status text not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  is_read boolean not null default false,
  link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Pipeline Stages (Automations)
create table pipeline_stages (
  id text primary key default substring(gen_random_uuid()::text, 1, 8),
  board_id text not null references boards(id) on delete cascade,
  name text not null,
  description text,
  position integer not null default 0,
  trigger_list_id text references lists(id) on delete set null,
  action_type text not null,
  action_config jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Recordings (Demo Recorder)
create table recordings (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  duration numeric not null,
  size numeric not null,
  mime_type text not null,
  storage_path text not null,
  download_url text not null,
  thumbnail text,
  tags text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table workspaces enable row level security;
alter table boards enable row level security;
alter table lists enable row level security;
alter table cards enable row level security;
alter table members enable row level security;
alter table invites enable row level security;
alter table notifications enable row level security;
alter table pipeline_stages enable row level security;
alter table recordings enable row level security;

-- Disable RLS temporarily to allow rapid initial development/migration (Optional - fine tune later)
create policy "Allow all operations for authenticated users on workspaces" on workspaces for all to authenticated using (true);
create policy "Allow all operations for authenticated users on boards" on boards for all to authenticated using (true);
create policy "Allow all operations for authenticated users on lists" on lists for all to authenticated using (true);
create policy "Allow all operations for authenticated users on cards" on cards for all to authenticated using (true);
create policy "Allow all operations for authenticated users on members" on members for all to authenticated using (true);
create policy "Allow all operations for authenticated users on invites" on invites for all to authenticated using (true);
create policy "Allow all operations for authenticated users on notifications" on notifications for all to authenticated using (true);
create policy "Allow all operations for authenticated users on pipeline_stages" on pipeline_stages for all to authenticated using (true);
create policy "Allow all operations for authenticated users on recordings" on recordings for all to authenticated using (true);

-- Turn on Realtime for all tables
alter publication supabase_realtime add table workspaces, boards, lists, cards, members, invites, notifications, pipeline_stages, recordings;

-- Storage Bucket Setup (Recordings)
insert into storage.buckets (id, name, public) values ('recordings', 'recordings', true) on conflict do nothing;
create policy "Allow authenticated uploads" on storage.objects for insert to authenticated with check (bucket_id = 'recordings');
create policy "Allow public viewing" on storage.objects for select to public using (bucket_id = 'recordings');
create policy "Allow authenticated deletes" on storage.objects for delete to authenticated using (bucket_id = 'recordings');

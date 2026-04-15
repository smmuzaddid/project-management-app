-- ================================================
-- Project Management App — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------
-- PROFILES (extends Supabase auth.users)
-- ------------------------------------------------
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text not null unique,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Profiles: users can read all, update own
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'member')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------
-- PROJECTS
-- ------------------------------------------------
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  client_name text not null,
  location text,
  budget numeric,
  start_date date,
  due_date date,
  status text not null default 'active'
    check (status in ('active', 'on_hold', 'completed', 'archived')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  phase text not null default 'planning'
    check (phase in ('planning', 'tender', 'operation', 'completion', 'certificate')),
  planning_category text
    check (planning_category in ('assign_to_others', 'do_by_ourselves')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

-- ------------------------------------------------
-- PROJECT MEMBERS
-- ------------------------------------------------
create table public.project_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  access_role text not null default 'member'
    check (access_role in ('owner', 'member', 'viewer')),
  unique (project_id, user_id)
);

alter table public.project_members enable row level security;

-- Helper: is user admin?
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = user_id and role = 'admin'
  );
$$ language sql security definer stable;

-- Helper: is user member of project?
create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = p_user_id
  );
$$ language sql security definer stable;

-- Projects RLS
create policy "Admins see all projects"
  on public.projects for select
  using (public.is_admin(auth.uid()));

create policy "Members see their projects"
  on public.projects for select
  using (public.is_project_member(id, auth.uid()));

create policy "Admins can insert projects"
  on public.projects for insert
  with check (public.is_admin(auth.uid()));

create policy "Admins can update projects"
  on public.projects for update
  using (public.is_admin(auth.uid()));

create policy "Admins can delete projects"
  on public.projects for delete
  using (public.is_admin(auth.uid()));

-- Project members RLS
create policy "Admins see all project members"
  on public.project_members for select
  using (public.is_admin(auth.uid()));

create policy "Members see their own memberships"
  on public.project_members for select
  using (user_id = auth.uid());

create policy "Admins manage project members"
  on public.project_members for all
  using (public.is_admin(auth.uid()));

-- ------------------------------------------------
-- TASKS
-- ------------------------------------------------
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'waiting', 'done', 'blocked')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date date,
  assigned_to uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Admins see all tasks"
  on public.tasks for select
  using (public.is_admin(auth.uid()));

create policy "Members see tasks in their projects"
  on public.tasks for select
  using (public.is_project_member(project_id, auth.uid()));

create policy "Admins can insert tasks"
  on public.tasks for insert
  with check (public.is_admin(auth.uid()) or public.is_project_member(project_id, auth.uid()));

create policy "Admins can update any task"
  on public.tasks for update
  using (public.is_admin(auth.uid()));

create policy "Members can update assigned tasks"
  on public.tasks for update
  using (assigned_to = auth.uid() or public.is_project_member(project_id, auth.uid()));

create policy "Admins can delete tasks"
  on public.tasks for delete
  using (public.is_admin(auth.uid()));

-- ------------------------------------------------
-- FOLLOW-UPS
-- ------------------------------------------------
create table public.follow_ups (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  note text not null,
  next_follow_up_date date,
  responsible_user_id uuid references public.profiles(id),
  status text not null default 'open'
    check (status in ('open', 'resolved')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.follow_ups enable row level security;

create policy "Admins see all follow ups"
  on public.follow_ups for select
  using (public.is_admin(auth.uid()));

create policy "Members see follow ups in their projects"
  on public.follow_ups for select
  using (public.is_project_member(project_id, auth.uid()));

create policy "Authenticated users can insert follow ups"
  on public.follow_ups for insert
  with check (auth.role() = 'authenticated');

create policy "Admins can update follow ups"
  on public.follow_ups for update
  using (public.is_admin(auth.uid()) or responsible_user_id = auth.uid());

create policy "Admins can delete follow ups"
  on public.follow_ups for delete
  using (public.is_admin(auth.uid()));

-- ------------------------------------------------
-- REMINDERS
-- ------------------------------------------------
create table public.reminders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  remind_at timestamptz not null,
  message text not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.reminders enable row level security;

create policy "Users see own reminders"
  on public.reminders for select
  using (user_id = auth.uid());

create policy "Admins see all reminders"
  on public.reminders for select
  using (public.is_admin(auth.uid()));

create policy "Users manage own reminders"
  on public.reminders for all
  using (user_id = auth.uid());

-- ------------------------------------------------
-- ACTIVITY LOGS
-- ------------------------------------------------
create table public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id),
  project_id uuid references public.projects(id) on delete cascade,
  action text not null,
  details text,
  created_at timestamptz not null default now()
);

alter table public.activity_logs enable row level security;

create policy "Admins see all activity logs"
  on public.activity_logs for select
  using (public.is_admin(auth.uid()));

create policy "Members see logs for their projects"
  on public.activity_logs for select
  using (public.is_project_member(project_id, auth.uid()));

create policy "Authenticated users can insert logs"
  on public.activity_logs for insert
  with check (auth.role() = 'authenticated');

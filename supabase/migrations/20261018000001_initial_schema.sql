-- Studio M512 — initial schema
-- Every row belongs to an owner (auth.users). RLS: an owner sees and edits only their own rows.
-- Client / crew access through share links is added later via security-definer RPCs.

-- ───────────── Enums ─────────────
create type public.project_type as enum ('feature', 'short', 'commercial', 'documentary', 'corporate', 'music_video', 'series', 'other');
create type public.project_stage as enum ('development', 'pre_production', 'production', 'post_production', 'delivered', 'archived');
create type public.task_status as enum ('todo', 'in_progress', 'done');
create type public.script_kind as enum ('screenplay', 'av');
create type public.int_ext as enum ('int', 'ext', 'int_ext');
create type public.day_night as enum ('day', 'night', 'dawn', 'dusk', 'continuous');
create type public.element_category as enum ('cast', 'extras', 'props', 'wardrobe', 'makeup', 'vehicles', 'animals', 'sfx', 'vfx', 'sound', 'set_dressing', 'location', 'other');
create type public.recipient_status as enum ('pending', 'sent', 'opened', 'confirmed');
create type public.share_permission as enum ('view', 'comment', 'approve');
create type public.contact_kind as enum ('crew', 'cast', 'client', 'vendor', 'location', 'other');

-- ───────────── Helpers ─────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────── Profiles ─────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  company_name text default 'Studio M512',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── Core tables ─────────────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  type public.project_type not null default 'short',
  stage public.project_stage not null default 'development',
  client_name text,
  cover_color text default '#2B3240',
  start_date date,
  delivery_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.contact_kind not null default 'crew',
  full_name text not null,
  role text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  title text not null,
  status public.task_status not null default 'todo',
  assignee_contact_id uuid references public.contacts (id) on delete set null,
  due_date date,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  kind public.script_kind not null default 'screenplay',
  language text not null default 'ar' check (language in ('ar', 'en')),
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.script_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  script_id uuid not null references public.scripts (id) on delete cascade,
  version_number integer not null,
  revision_color text not null default 'white',
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (script_id, version_number)
);

alter table public.scripts
  add constraint scripts_current_version_fk
  foreign key (current_version_id) references public.script_versions (id) on delete set null;

create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  script_id uuid not null references public.scripts (id) on delete cascade,
  scene_number text not null,
  int_ext public.int_ext not null default 'int',
  location_name text,
  day_night public.day_night not null default 'day',
  synopsis text,
  page_eighths integer not null default 0 check (page_eighths >= 0),
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.elements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  category public.element_category not null,
  name text not null,
  cast_number integer,
  contact_id uuid references public.contacts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, category, name)
);

create table public.scene_elements (
  scene_id uuid not null references public.scenes (id) on delete cascade,
  element_id uuid not null references public.elements (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (scene_id, element_id)
);

create table public.shots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  scene_id uuid not null references public.scenes (id) on delete cascade,
  shot_number text not null,
  size text,
  angle text,
  movement text,
  lens text,
  duration_seconds integer,
  description text,
  image_path text,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lookbook_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  category text,
  image_path text not null,
  note text,
  position double precision not null default 0,
  created_at timestamptz not null default now()
);

create table public.shoot_days (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  day_number integer not null,
  shoot_date date,
  location_contact_id uuid references public.contacts (id) on delete set null,
  general_call time,
  wrap_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shoot_day_scenes (
  shoot_day_id uuid not null references public.shoot_days (id) on delete cascade,
  scene_id uuid not null references public.scenes (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position double precision not null default 0,
  primary key (shoot_day_id, scene_id)
);

create table public.call_sheets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  shoot_day_id uuid not null unique references public.shoot_days (id) on delete cascade,
  general_notes text,
  weather text,
  nearest_hospital text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.call_sheet_recipients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  call_sheet_id uuid not null references public.call_sheets (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  call_time time,
  personal_note text,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  status public.recipient_status not null default 'pending',
  opened_at timestamptz,
  confirmed_at timestamptz,
  unique (call_sheet_id, contact_id)
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  resource_type text not null check (resource_type in ('script', 'storyboard', 'lookbook', 'shot_list', 'call_sheet')),
  resource_id uuid not null,
  permission public.share_permission not null default 'view',
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_opened_at timestamptz,
  open_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- ───────────── Indexes (foreign keys + owner) ─────────────
create index on public.projects (owner_id);
create index on public.contacts (owner_id);
create index on public.tasks (owner_id);
create index on public.tasks (project_id);
create index on public.tasks (assignee_contact_id);
create index on public.scripts (owner_id);
create index on public.scripts (project_id);
create index on public.scripts (current_version_id);
create index on public.script_versions (owner_id);
create index on public.scenes (owner_id);
create index on public.scenes (script_id);
create index on public.elements (owner_id);
create index on public.elements (contact_id);
create index on public.scene_elements (owner_id);
create index on public.scene_elements (element_id);
create index on public.shots (owner_id);
create index on public.shots (scene_id);
create index on public.lookbook_items (owner_id);
create index on public.lookbook_items (project_id);
create index on public.shoot_days (owner_id);
create index on public.shoot_days (project_id);
create index on public.shoot_days (location_contact_id);
create index on public.shoot_day_scenes (owner_id);
create index on public.shoot_day_scenes (scene_id);
create index on public.call_sheets (owner_id);
create index on public.call_sheet_recipients (owner_id);
create index on public.call_sheet_recipients (contact_id);
create index on public.share_links (owner_id);
create index on public.share_links (project_id);

-- ───────────── updated_at triggers ─────────────
create trigger set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.contacts for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.scripts for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.scenes for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.elements for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.shots for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.shoot_days for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.call_sheets for each row execute function public.set_updated_at();

-- ───────────── Row Level Security ─────────────
alter table public.profiles enable row level security;
create policy "profiles: own row" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

do $$
declare
  t text;
begin
  foreach t in array array[
    'projects', 'contacts', 'tasks', 'scripts', 'script_versions', 'scenes', 'elements',
    'scene_elements', 'shots', 'lookbook_items', 'shoot_days', 'shoot_day_scenes',
    'call_sheets', 'call_sheet_recipients', 'share_links'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%s: owner only" on public.%I for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))',
      t, t
    );
  end loop;
end;
$$;

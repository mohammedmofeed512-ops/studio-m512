-- Team work: invite people to a project with a permission level per tool.
-- Levels: 0 = no access, 1 = view, 2 = edit. The project owner always has 2 everywhere.
-- Areas: script, breakdown, shots, schedule, call_sheets, lookbook, tasks, team.
-- From here on, owner_id on project content means "created by"; access follows the project.

-- ───────────── tables ─────────────
create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'custom',
  permissions jsonb not null default '{}'::jsonb,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index on public.project_members (user_id);
create index on public.project_members (invited_by);

create table public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  email text not null check (length(email) between 3 and 320),
  role text not null default 'custom',
  permissions jsonb not null default '{}'::jsonb,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by uuid default auth.uid() references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.project_invitations (project_id);
create index on public.project_invitations (invited_by);
create index on public.project_invitations (accepted_by);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid default auth.uid() references auth.users (id) on delete set null,
  action text not null,
  target_id uuid,
  summary text,
  created_at timestamptz not null default now()
);
create index on public.activity_log (project_id, created_at desc);
create index on public.activity_log (user_id);

create table public.script_presence (
  script_id uuid not null references public.scripts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  seen_at timestamptz not null default now(),
  primary key (script_id, user_id)
);
create index on public.script_presence (user_id);

-- Who last wrote a version's text, for save-conflict warnings.
alter table public.script_versions
  add column content_updated_at timestamptz not null default now(),
  add column content_updated_by uuid references auth.users (id) on delete set null;
create index on public.script_versions (content_updated_by);

create trigger set_updated_at before update on public.project_members for each row execute function public.set_updated_at();

-- A member leaving the platform must not delete what they made in someone else's project.
do $$
declare
  t text;
begin
  foreach t in array array[
    'scripts', 'script_versions', 'scenes', 'elements', 'scene_elements', 'shots', 'lookbook_items',
    'shoot_days', 'shoot_day_scenes', 'call_sheets', 'call_sheet_recipients'
  ]
  loop
    execute format('alter table public.%I alter column owner_id drop not null', t);
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_owner_id_fkey');
    execute format('alter table public.%I add constraint %I foreign key (owner_id) references auth.users (id) on delete set null', t, t || '_owner_id_fkey');
  end loop;
end;
$$;

-- ───────────── permission helpers (not exposed through the API) ─────────────
create schema if not exists authz;
revoke all on schema authz from public, anon;
grant usage on schema authz to authenticated;

create or replace function authz.level(p_project uuid, p_area text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_project is null or (select auth.uid()) is null then 0
    when exists (select 1 from public.projects p where p.id = p_project and p.owner_id = (select auth.uid())) then 2
    else coalesce((
      select case when (m.permissions ->> p_area) ~ '^[0-2]$' then (m.permissions ->> p_area)::integer else 0 end
      from public.project_members m
      where m.project_id = p_project and m.user_id = (select auth.uid())
    ), 0)
  end;
$$;

create or replace function authz.level_any(p_project uuid, p_areas text[])
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(authz.level(p_project, a)), 0) from unnest(p_areas) a;
$$;

create or replace function authz.is_member(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.projects p where p.id = p_project and p.owner_id = (select auth.uid()))
      or exists (select 1 from public.project_members m where m.project_id = p_project and m.user_id = (select auth.uid()));
$$;

create or replace function authz.script_project(p_script uuid)
returns uuid language sql stable security definer set search_path = ''
as $$ select project_id from public.scripts where id = p_script; $$;

create or replace function authz.scene_project(p_scene uuid)
returns uuid language sql stable security definer set search_path = ''
as $$ select s.project_id from public.scenes c join public.scripts s on s.id = c.script_id where c.id = p_scene; $$;

create or replace function authz.element_project(p_element uuid)
returns uuid language sql stable security definer set search_path = ''
as $$ select project_id from public.elements where id = p_element; $$;

create or replace function authz.day_project(p_day uuid)
returns uuid language sql stable security definer set search_path = ''
as $$ select project_id from public.shoot_days where id = p_day; $$;

create or replace function authz.sheet_project(p_sheet uuid)
returns uuid language sql stable security definer set search_path = ''
as $$ select d.project_id from public.call_sheets c join public.shoot_days d on d.id = c.shoot_day_id where c.id = p_sheet; $$;

-- True when the caller shares at least one project with another user (to show their name).
create or replace function authz.shares_project(p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  with mine as (
    select id as project_id from public.projects where owner_id = (select auth.uid())
    union select project_id from public.project_members where user_id = (select auth.uid())
  )
  select exists (select 1 from public.projects p join mine on mine.project_id = p.id where p.owner_id = p_user)
      or exists (select 1 from public.project_members m join mine on mine.project_id = m.project_id where m.user_id = p_user);
$$;

-- Contacts a member may see: the whole book of a project owner they schedule or send call sheets for,
-- otherwise only contacts used in projects they can view.
create or replace function authz.can_see_contact(p_contact uuid, p_owner uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
      select 1 from public.projects p
      where p.owner_id = p_owner and authz.level_any(p.id, array['schedule', 'call_sheets']) = 2)
    or exists (
      select 1 from public.call_sheet_recipients r
      join public.call_sheets c on c.id = r.call_sheet_id
      join public.shoot_days d on d.id = c.shoot_day_id
      where r.contact_id = p_contact and authz.level(d.project_id, 'call_sheets') >= 1)
    or exists (
      select 1 from public.shoot_days d
      where d.location_contact_id = p_contact and authz.level_any(d.project_id, array['schedule', 'call_sheets']) >= 1)
    or exists (
      select 1 from public.elements e
      where e.contact_id = p_contact and authz.level_any(e.project_id, array['breakdown', 'call_sheets']) >= 1);
$$;

-- Media files: "<uploader id>/<project id>/..." — project members may read files of that project.
create or replace function authz.can_read_media(p_name text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case
    when (storage.foldername(p_name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then authz.level_any(((storage.foldername(p_name))[2])::uuid, array['shots', 'lookbook']) >= 1
    else false
  end;
$$;

revoke all on all functions in schema authz from public, anon;
grant execute on all functions in schema authz to authenticated;

-- ───────────── policies ─────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'projects', 'tasks', 'scripts', 'script_versions', 'scenes', 'elements', 'scene_elements', 'shots',
    'lookbook_items', 'shoot_days', 'shoot_day_scenes', 'call_sheets', 'call_sheet_recipients'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || ': owner only', t);
  end loop;
end;
$$;

-- projects: members can read; only the owner edits details or deletes.
create policy "projects: members read" on public.projects for select to authenticated
  using (owner_id = (select auth.uid()) or authz.is_member(id));
create policy "projects: owner inserts" on public.projects for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "projects: owner updates" on public.projects for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "projects: owner deletes" on public.projects for delete to authenticated
  using (owner_id = (select auth.uid()));

-- tasks: personal tasks stay private; project tasks follow the "tasks" permission.
create policy "tasks: read" on public.tasks for select to authenticated
  using (case when project_id is null then owner_id = (select auth.uid()) else authz.level(project_id, 'tasks') >= 1 end);
create policy "tasks: insert" on public.tasks for insert to authenticated
  with check (case when project_id is null then owner_id = (select auth.uid()) else authz.level(project_id, 'tasks') = 2 end);
create policy "tasks: update" on public.tasks for update to authenticated
  using (case when project_id is null then owner_id = (select auth.uid()) else authz.level(project_id, 'tasks') = 2 end)
  with check (case when project_id is null then owner_id = (select auth.uid()) else authz.level(project_id, 'tasks') = 2 end);
create policy "tasks: delete" on public.tasks for delete to authenticated
  using (case when project_id is null then owner_id = (select auth.uid()) else authz.level(project_id, 'tasks') = 2 end);

-- scripts: listed for anyone working on the project; written by script editors.
create policy "scripts: read" on public.scripts for select to authenticated
  using (authz.level_any(project_id, array['script', 'breakdown', 'shots', 'schedule', 'call_sheets']) >= 1);
create policy "scripts: insert" on public.scripts for insert to authenticated
  with check (authz.level(project_id, 'script') = 2);
create policy "scripts: update" on public.scripts for update to authenticated
  using (authz.level(project_id, 'script') = 2) with check (authz.level(project_id, 'script') = 2);
create policy "scripts: delete" on public.scripts for delete to authenticated
  using (authz.level(project_id, 'script') = 2);

-- script text: readable where the text is shown (script, breakdown, shots).
create policy "script_versions: read" on public.script_versions for select to authenticated
  using (authz.level_any(authz.script_project(script_id), array['script', 'breakdown', 'shots']) >= 1);
create policy "script_versions: write" on public.script_versions for all to authenticated
  using (authz.level(authz.script_project(script_id), 'script') = 2)
  with check (authz.level(authz.script_project(script_id), 'script') = 2);

create policy "scenes: read" on public.scenes for select to authenticated
  using (authz.level_any(authz.script_project(script_id), array['script', 'breakdown', 'shots', 'schedule', 'call_sheets']) >= 1);
create policy "scenes: write" on public.scenes for all to authenticated
  using (authz.level(authz.script_project(script_id), 'script') = 2)
  with check (authz.level(authz.script_project(script_id), 'script') = 2);

create policy "script_presence: read" on public.script_presence for select to authenticated
  using (authz.level(authz.script_project(script_id), 'script') >= 1);
create policy "script_presence: own row" on public.script_presence for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and authz.level(authz.script_project(script_id), 'script') >= 1);

-- breakdown elements: call sheets may link an actor to a character.
create policy "elements: read" on public.elements for select to authenticated
  using (authz.level_any(project_id, array['breakdown', 'shots', 'schedule', 'call_sheets']) >= 1);
create policy "elements: insert" on public.elements for insert to authenticated
  with check (authz.level(project_id, 'breakdown') = 2);
create policy "elements: update" on public.elements for update to authenticated
  using (authz.level_any(project_id, array['breakdown', 'call_sheets']) = 2)
  with check (authz.level_any(project_id, array['breakdown', 'call_sheets']) = 2);
create policy "elements: delete" on public.elements for delete to authenticated
  using (authz.level(project_id, 'breakdown') = 2);

create policy "scene_elements: read" on public.scene_elements for select to authenticated
  using (authz.level_any(authz.scene_project(scene_id), array['breakdown', 'shots', 'schedule', 'call_sheets']) >= 1);
create policy "scene_elements: write" on public.scene_elements for all to authenticated
  using (authz.level(authz.scene_project(scene_id), 'breakdown') = 2)
  with check (authz.level(authz.scene_project(scene_id), 'breakdown') = 2);

create policy "shots: read" on public.shots for select to authenticated
  using (authz.level(authz.scene_project(scene_id), 'shots') >= 1);
create policy "shots: write" on public.shots for all to authenticated
  using (authz.level(authz.scene_project(scene_id), 'shots') = 2)
  with check (authz.level(authz.scene_project(scene_id), 'shots') = 2);

create policy "lookbook_items: read" on public.lookbook_items for select to authenticated
  using (authz.level(project_id, 'lookbook') >= 1);
create policy "lookbook_items: write" on public.lookbook_items for all to authenticated
  using (authz.level(project_id, 'lookbook') = 2)
  with check (authz.level(project_id, 'lookbook') = 2);

-- shoot days: the call sheet editor may change a day's date, times and location.
create policy "shoot_days: read" on public.shoot_days for select to authenticated
  using (authz.level_any(project_id, array['schedule', 'call_sheets']) >= 1);
create policy "shoot_days: insert" on public.shoot_days for insert to authenticated
  with check (authz.level(project_id, 'schedule') = 2);
create policy "shoot_days: update" on public.shoot_days for update to authenticated
  using (authz.level_any(project_id, array['schedule', 'call_sheets']) = 2)
  with check (authz.level_any(project_id, array['schedule', 'call_sheets']) = 2);
create policy "shoot_days: delete" on public.shoot_days for delete to authenticated
  using (authz.level(project_id, 'schedule') = 2);

create policy "shoot_day_scenes: read" on public.shoot_day_scenes for select to authenticated
  using (authz.level_any(authz.day_project(shoot_day_id), array['schedule', 'call_sheets']) >= 1);
create policy "shoot_day_scenes: write" on public.shoot_day_scenes for all to authenticated
  using (authz.level(authz.day_project(shoot_day_id), 'schedule') = 2)
  with check (authz.level(authz.day_project(shoot_day_id), 'schedule') = 2);

create policy "call_sheets: read" on public.call_sheets for select to authenticated
  using (authz.level(authz.day_project(shoot_day_id), 'call_sheets') >= 1);
create policy "call_sheets: write" on public.call_sheets for all to authenticated
  using (authz.level(authz.day_project(shoot_day_id), 'call_sheets') = 2)
  with check (authz.level(authz.day_project(shoot_day_id), 'call_sheets') = 2);

create policy "call_sheet_recipients: read" on public.call_sheet_recipients for select to authenticated
  using (authz.level(authz.sheet_project(call_sheet_id), 'call_sheets') >= 1);
create policy "call_sheet_recipients: write" on public.call_sheet_recipients for all to authenticated
  using (authz.level(authz.sheet_project(call_sheet_id), 'call_sheets') = 2)
  with check (authz.level(authz.sheet_project(call_sheet_id), 'call_sheets') = 2);

-- contacts: everyone keeps their own book; members also see the contacts their work needs.
create policy "contacts: members read" on public.contacts for select to authenticated
  using (authz.can_see_contact(id, owner_id));

-- profiles: names of people you share a project with.
create policy "profiles: teammates read" on public.profiles for select to authenticated
  using (authz.shares_project(id));

-- team
alter table public.project_members enable row level security;
create policy "project_members: read" on public.project_members for select to authenticated
  using (authz.is_member(project_id));
create policy "project_members: managers write" on public.project_members for insert to authenticated
  with check (authz.level(project_id, 'team') = 2);
create policy "project_members: managers update" on public.project_members for update to authenticated
  using (authz.level(project_id, 'team') = 2) with check (authz.level(project_id, 'team') = 2);
create policy "project_members: managers remove or self leaves" on public.project_members for delete to authenticated
  using (authz.level(project_id, 'team') = 2 or user_id = (select auth.uid()));

alter table public.project_invitations enable row level security;
create policy "project_invitations: managers" on public.project_invitations for all to authenticated
  using (authz.level(project_id, 'team') = 2)
  with check (authz.level(project_id, 'team') = 2);

alter table public.script_presence enable row level security;

alter table public.activity_log enable row level security;
create policy "activity_log: members read" on public.activity_log for select to authenticated
  using (authz.is_member(project_id));
create policy "activity_log: members write own" on public.activity_log for insert to authenticated
  with check (user_id = (select auth.uid()) and authz.is_member(project_id));

-- storage: teammates can read a project's images.
create policy "media: project members read" on storage.objects for select to authenticated
  using (bucket_id = 'media' and authz.can_read_media(name));

-- ───────────── every shoot day gets its call sheet ─────────────
create or replace function public.create_call_sheet_for_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.call_sheets (shoot_day_id, owner_id) values (new.id, new.owner_id) on conflict (shoot_day_id) do nothing;
  return new;
end;
$$;
revoke execute on function public.create_call_sheet_for_day() from public, anon, authenticated;
create trigger create_call_sheet after insert on public.shoot_days for each row execute function public.create_call_sheet_for_day();

insert into public.call_sheets (shoot_day_id, owner_id)
select d.id, d.owner_id from public.shoot_days d
where not exists (select 1 from public.call_sheets c where c.shoot_day_id = d.id);

-- ───────────── call sheet functions follow team permissions ─────────────
create or replace function public.call_sheet_for_day(p_day uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if authz.level(authz.day_project(p_day), 'call_sheets') < 1 then
    return null;
  end if;
  return private.call_sheet_json(p_day);
end;
$$;

-- The company name comes from the project owner, whoever created the day.
create or replace function private.call_sheet_json(p_day uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with d as (select * from public.shoot_days where id = p_day),
  sc as (
    select s.*, sds.position as sched_pos
    from public.shoot_day_scenes sds join public.scenes s on s.id = sds.scene_id
    where sds.shoot_day_id = p_day
  ),
  cs as (select * from public.call_sheets where shoot_day_id = p_day),
  castel as (
    select distinct e.id, e.name, e.cast_number, e.contact_id
    from public.scene_elements se join public.elements e on e.id = se.element_id
    where se.scene_id in (select id from sc) and e.category = 'cast'
  )
  select jsonb_build_object(
    'project', (select p.name from public.projects p join d on d.project_id = p.id),
    'company', (select coalesce(pr.company_name, '') from public.profiles pr join public.projects p on p.owner_id = pr.id join d on d.project_id = p.id),
    'day', (select jsonb_build_object(
        'number', d.day_number,
        'total', (select count(*) from public.shoot_days x where x.project_id = d.project_id),
        'date', d.shoot_date,
        'general_call', to_char(d.general_call, 'HH24:MI'),
        'wrap_time', to_char(d.wrap_time, 'HH24:MI')) from d),
    'location', (select jsonb_build_object('name', c.full_name, 'address', c.address)
                 from public.contacts c join d on d.location_contact_id = c.id),
    'sheet', coalesce((select jsonb_build_object('weather', cs.weather, 'nearest_hospital', cs.nearest_hospital, 'general_notes', cs.general_notes) from cs), '{}'::jsonb),
    'scenes', coalesce((select jsonb_agg(jsonb_build_object(
        'scene_number', sc.scene_number, 'int_ext', sc.int_ext, 'location_name', sc.location_name,
        'day_night', sc.day_night, 'page_eighths', sc.page_eighths, 'synopsis', sc.synopsis,
        'cast', coalesce((select jsonb_agg(e.cast_number order by e.cast_number)
                          from public.scene_elements se join public.elements e on e.id = se.element_id
                          where se.scene_id = sc.id and e.category = 'cast' and e.cast_number is not null), '[]'::jsonb)
      ) order by sc.sched_pos) from sc), '[]'::jsonb),
    'cast', coalesce((select jsonb_agg(jsonb_build_object(
        'number', ce.cast_number, 'character', ce.name, 'actor', c.full_name,
        'call_time', (select to_char(r.call_time, 'HH24:MI') from public.call_sheet_recipients r join cs on cs.id = r.call_sheet_id where r.contact_id = ce.contact_id)
      ) order by ce.cast_number nulls last, ce.name)
      from castel ce left join public.contacts c on c.id = ce.contact_id), '[]'::jsonb),
    'people', coalesce((select jsonb_agg(jsonb_build_object(
        'name', c.full_name, 'role', c.role, 'kind', c.kind, 'call_time', to_char(r.call_time, 'HH24:MI')
      ) order by r.call_time nulls last, c.full_name)
      from public.call_sheet_recipients r join cs on cs.id = r.call_sheet_id join public.contacts c on c.id = r.contact_id), '[]'::jsonb)
  )
  where exists (select 1 from d);
$$;
revoke execute on function private.call_sheet_json(uuid) from public, anon, authenticated;

-- ───────────── invitations ─────────────
-- What an invitation link shows before the person signs in.
create or replace function public.invitation_preview(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{48}$' then
    return null;
  end if;
  select i.email, i.role, i.permissions, i.expires_at, i.accepted_at, p.name as project,
         coalesce(nullif(pr.full_name, ''), pr.company_name, '') as inviter
  into r
  from public.project_invitations i
  join public.projects p on p.id = i.project_id
  left join public.profiles pr on pr.id = i.invited_by
  where i.token = p_token;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'project', r.project, 'inviter', r.inviter, 'email', r.email, 'role', r.role, 'permissions', r.permissions,
    'expired', r.expires_at < now(), 'accepted', r.accepted_at is not null);
end;
$$;

-- Joins the project when the signed-in account's email matches the invitation.
create or replace function public.accept_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.project_invitations;
  me uuid := (select auth.uid());
  my_email text;
begin
  if me is null then
    return jsonb_build_object('ok', false, 'error', 'signin');
  end if;
  select * into inv from public.project_invitations where token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if inv.accepted_at is not null then
    -- Opening an accepted link again is fine while still a member; after removal it is spent.
    if inv.accepted_by = me and exists (select 1 from public.project_members m where m.project_id = inv.project_id and m.user_id = me) then
      return jsonb_build_object('ok', true, 'project_id', inv.project_id);
    end if;
    return jsonb_build_object('ok', false, 'error', 'used');
  end if;
  if inv.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  select email into my_email from auth.users where id = me;
  if lower(my_email) <> lower(inv.email) then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;
  if exists (select 1 from public.projects where id = inv.project_id and owner_id = me) then
    return jsonb_build_object('ok', true, 'project_id', inv.project_id);
  end if;
  insert into public.project_members (project_id, user_id, role, permissions, invited_by)
  values (inv.project_id, me, inv.role, inv.permissions, inv.invited_by)
  on conflict (project_id, user_id) do update set role = excluded.role, permissions = excluded.permissions;
  update public.project_invitations set accepted_at = now(), accepted_by = me where id = inv.id;
  insert into public.activity_log (project_id, user_id, action, summary) values (inv.project_id, me, 'member_joined', null);
  return jsonb_build_object('ok', true, 'project_id', inv.project_id);
end;
$$;

revoke execute on function public.invitation_preview(text) from public;
revoke execute on function public.accept_invitation(text) from public, anon;
grant execute on function public.invitation_preview(text) to anon, authenticated;
grant execute on function public.accept_invitation(text) to authenticated;

-- Membership plans, per-account limits and the platform admin panel.
-- Accounts live in their own table (not profiles) so users can never change their own plan or role.

create table public.plans (
  id text primary key check (id ~ '^[a-z0-9_]{2,32}$'),
  name_ar text not null,
  name_en text not null,
  max_projects integer check (max_projects >= 0),            -- null = unlimited
  max_members_per_project integer check (max_members_per_project >= 0),
  storage_mb integer check (storage_mb >= 0),
  features jsonb not null default '{}'::jsonb,               -- {"call_sheets": true, "claude": false}
  position integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index plans_one_default on public.plans (is_default) where is_default;
create trigger set_updated_at before update on public.plans for each row execute function public.set_updated_at();

insert into public.plans (id, name_ar, name_en, max_projects, max_members_per_project, storage_mb, features, position, is_default) values
  ('free', 'مجانية', 'Free', 2, 2, 200, '{"call_sheets": false, "claude": false}', 0, true),
  ('pro', 'محترف', 'Pro', 20, 10, 5120, '{"call_sheets": true, "claude": true}', 1, false),
  ('studio', 'استوديو', 'Studio', null, null, 51200, '{"call_sheets": true, "claude": true}', 2, false);

create table public.accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan_id text not null default 'free' references public.plans (id) on update cascade,
  plan_expires_at timestamptz,
  role text not null default 'user' check (role in ('user', 'support', 'admin')),
  suspended boolean not null default false,
  extra_projects integer not null default 0 check (extra_projects >= 0),
  extra_members integer not null default 0 check (extra_members >= 0),
  extra_storage_mb integer not null default 0 check (extra_storage_mb >= 0),
  feature_overrides jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.accounts (plan_id);
create trigger set_updated_at before update on public.accounts for each row execute function public.set_updated_at();

-- Every new person starts on the default plan.
create or replace function public.create_account_for_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.accounts (user_id, plan_id)
  values (new.id, coalesce((select id from public.plans where is_default limit 1), 'free'))
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke execute on function public.create_account_for_profile() from public, anon, authenticated;
create trigger create_account after insert on public.profiles for each row execute function public.create_account_for_profile();

insert into public.accounts (user_id) select id from public.profiles on conflict do nothing;
-- The platform owner.
update public.accounts set role = 'admin', plan_id = 'studio'
where user_id = (select id from auth.users where lower(email) = 'mohammedmofeed512@gmail.com');

-- ───────────── helpers ─────────────
create or replace function authz.account_role()
returns text language sql stable security definer set search_path = ''
as $$ select coalesce((select role from public.accounts where user_id = (select auth.uid()) and not suspended), 'user'); $$;

create or replace function authz.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select authz.account_role() = 'admin'; $$;

create or replace function authz.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select authz.account_role() in ('admin', 'support'); $$;

create or replace function authz.is_suspended(p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce((select suspended from public.accounts where user_id = p_user), false); $$;

-- The plan that applies to a user right now (an expired plan falls back to the default one).
create or replace function authz.limits(p_user uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  with a as (select * from public.accounts where user_id = p_user),
  p as (
    select pl.* from public.plans pl
    where pl.id = coalesce(
      (select case when a.plan_expires_at is null or a.plan_expires_at > now() then a.plan_id end from a),
      (select id from public.plans where is_default limit 1))
  )
  select jsonb_build_object(
    'plan', (select id from p),
    'max_projects', (select case when p.max_projects is null then null else p.max_projects + coalesce((select extra_projects from a), 0) end from p),
    'max_members', (select case when p.max_members_per_project is null then null else p.max_members_per_project + coalesce((select extra_members from a), 0) end from p),
    'storage_mb', (select case when p.storage_mb is null then null else p.storage_mb + coalesce((select extra_storage_mb from a), 0) end from p),
    'features', coalesce((select features from p), '{}'::jsonb) || coalesce((select feature_overrides from a), '{}'::jsonb)
  );
$$;

create or replace function authz.storage_used_bytes(p_user uuid)
returns bigint language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(nullif(o.metadata ->> 'size', '')::bigint), 0)
  from storage.objects o
  where o.bucket_id = 'media' and (storage.foldername(o.name))[1] = p_user::text;
$$;

create or replace function authz.storage_ok()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (authz.limits((select auth.uid())) ->> 'storage_mb') is null
      or authz.storage_used_bytes((select auth.uid())) < ((authz.limits((select auth.uid())) ->> 'storage_mb')::bigint * 1024 * 1024);
$$;

revoke all on all functions in schema authz from public, anon;
grant execute on all functions in schema authz to authenticated;

-- Suspended accounts lose access to every project.
create or replace function authz.level(p_project uuid, p_area text)
returns integer language sql stable security definer set search_path = ''
as $$
  select case
    when p_project is null or (select auth.uid()) is null or authz.is_suspended((select auth.uid())) then 0
    when exists (select 1 from public.projects p where p.id = p_project and p.owner_id = (select auth.uid())) then 2
    else coalesce((
      select case when (m.permissions ->> p_area) ~ '^[0-2]$' then (m.permissions ->> p_area)::integer else 0 end
      from public.project_members m
      where m.project_id = p_project and m.user_id = (select auth.uid())
    ), 0)
  end;
$$;

create or replace function authz.is_member(p_project uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select not authz.is_suspended((select auth.uid())) and (
    exists (select 1 from public.projects p where p.id = p_project and p.owner_id = (select auth.uid()))
    or exists (select 1 from public.project_members m where m.project_id = p_project and m.user_id = (select auth.uid())));
$$;

-- ───────────── limits, enforced in the database ─────────────
create or replace function public.enforce_project_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  lim integer := (authz.limits(new.owner_id) ->> 'max_projects')::integer;
begin
  if authz.is_suspended(new.owner_id) then
    raise exception 'account_suspended' using errcode = 'P0001';
  end if;
  if lim is not null and (select count(*) from public.projects where owner_id = new.owner_id and stage <> 'archived') >= lim then
    raise exception 'plan_limit:projects' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger enforce_project_limit before insert on public.projects for each row execute function public.enforce_project_limit();

-- Unarchiving counts too.
create or replace function public.enforce_project_unarchive_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  lim integer := (authz.limits(new.owner_id) ->> 'max_projects')::integer;
begin
  if old.stage = 'archived' and new.stage <> 'archived' and lim is not null
     and (select count(*) from public.projects where owner_id = new.owner_id and stage <> 'archived' and id <> new.id) >= lim then
    raise exception 'plan_limit:projects' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger enforce_project_unarchive_limit before update of stage on public.projects for each row execute function public.enforce_project_unarchive_limit();

-- Members and pending invitations count against the project owner's plan.
create or replace function public.team_seats_used(p_project uuid)
returns integer language sql stable security definer set search_path = ''
as $$
  select (select count(*) from public.project_members where project_id = p_project)::integer
       + (select count(*) from public.project_invitations where project_id = p_project and accepted_at is null and expires_at > now())::integer;
$$;
revoke execute on function public.team_seats_used(uuid) from public, anon, authenticated;

create or replace function public.enforce_member_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  owner uuid := (select owner_id from public.projects where id = new.project_id);
  lim integer := (authz.limits(owner) ->> 'max_members')::integer;
begin
  if tg_table_name = 'project_members' then
    -- Accepting an invitation frees its own pending seat first.
    if lim is not null and (select count(*) from public.project_members where project_id = new.project_id) >= lim then
      raise exception 'plan_limit:members' using errcode = 'P0001';
    end if;
  elsif lim is not null and public.team_seats_used(new.project_id) >= lim then
    raise exception 'plan_limit:members' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger enforce_member_limit before insert on public.project_members for each row execute function public.enforce_member_limit();
create trigger enforce_invitation_limit before insert on public.project_invitations for each row execute function public.enforce_member_limit();

-- Sending call sheets is a plan feature (of the project owner).
create or replace function public.enforce_call_sheet_feature()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  owner uuid := (
    select p.owner_id from public.call_sheets c
    join public.shoot_days d on d.id = c.shoot_day_id
    join public.projects p on p.id = d.project_id
    where c.id = new.call_sheet_id);
begin
  if coalesce((authz.limits(owner) -> 'features' ->> 'call_sheets')::boolean, false) = false then
    raise exception 'plan_feature:call_sheets' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger enforce_call_sheet_feature before insert on public.call_sheet_recipients for each row execute function public.enforce_call_sheet_feature();

revoke execute on function public.enforce_project_limit() from public, anon, authenticated;
revoke execute on function public.enforce_project_unarchive_limit() from public, anon, authenticated;
revoke execute on function public.enforce_member_limit() from public, anon, authenticated;
revoke execute on function public.enforce_call_sheet_feature() from public, anon, authenticated;

-- Uploads stop when the uploader's storage allowance is used up (a restrictive rule on top of the others).
create policy "media: within storage allowance" on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'media' or authz.storage_ok());

-- Suspended accounts see nothing of their own either (other tables already go through authz.level).
do $$
declare
  t text;
begin
  foreach t in array array['projects', 'tasks', 'contacts', 'share_links'] loop
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using (not authz.is_suspended((select auth.uid()))) with check (not authz.is_suspended((select auth.uid())))',
      t || ': not suspended', t);
  end loop;
end;
$$;

-- ───────────── row level security ─────────────
alter table public.plans enable row level security;
create policy "plans: everyone reads" on public.plans for select to authenticated using (true);
create policy "plans: admins write" on public.plans for all to authenticated
  using (authz.is_admin()) with check (authz.is_admin());

alter table public.accounts enable row level security;
create policy "accounts: own row or staff" on public.accounts for select to authenticated
  using (user_id = (select auth.uid()) or authz.is_staff());
-- Changes go through admin_update_account only.

-- ───────────── functions for the app ─────────────
-- The signed-in user's plan, limits and usage.
create or replace function public.my_plan()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select authz.limits((select auth.uid())) || jsonb_build_object(
    'projects_used', (select count(*) from public.projects where owner_id = (select auth.uid()) and stage <> 'archived'),
    'storage_used_bytes', authz.storage_used_bytes((select auth.uid())),
    'expires_at', (select plan_expires_at from public.accounts where user_id = (select auth.uid())),
    'role', authz.account_role(),
    'suspended', authz.is_suspended((select auth.uid())));
$$;
revoke execute on function public.my_plan() from public, anon;
grant execute on function public.my_plan() to authenticated;

-- Every account with usage, for the admin panel.
create or replace function public.admin_accounts()
returns table (
  user_id uuid, email text, full_name text, company_name text, plan_id text, plan_expires_at timestamptz,
  role text, suspended boolean, extra_projects integer, extra_members integer, extra_storage_mb integer,
  notes text, projects bigint, storage_bytes bigint, created_at timestamptz, last_sign_in_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select a.user_id, u.email::text, pr.full_name, pr.company_name, a.plan_id, a.plan_expires_at, a.role, a.suspended,
         a.extra_projects, a.extra_members, a.extra_storage_mb, a.notes,
         (select count(*) from public.projects p where p.owner_id = a.user_id),
         authz.storage_used_bytes(a.user_id),
         u.created_at, u.last_sign_in_at
  from public.accounts a
  join auth.users u on u.id = a.user_id
  left join public.profiles pr on pr.id = a.user_id
  order by u.created_at desc;
end;
$$;
revoke execute on function public.admin_accounts() from public, anon;
grant execute on function public.admin_accounts() to authenticated;

create or replace function public.admin_update_account(
  p_user uuid, p_plan text, p_expires timestamptz, p_role text, p_suspended boolean,
  p_extra_projects integer, p_extra_members integer, p_extra_storage_mb integer, p_notes text
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_user = (select auth.uid()) and (p_role <> 'admin' or p_suspended) then
    raise exception 'cannot_demote_self' using errcode = 'P0001';
  end if;
  update public.accounts set
    plan_id = p_plan, plan_expires_at = p_expires, role = p_role, suspended = p_suspended,
    extra_projects = greatest(0, coalesce(p_extra_projects, 0)), extra_members = greatest(0, coalesce(p_extra_members, 0)),
    extra_storage_mb = greatest(0, coalesce(p_extra_storage_mb, 0)), notes = nullif(left(p_notes, 2000), '')
  where user_id = p_user;
end;
$$;
revoke execute on function public.admin_update_account(uuid, text, timestamptz, text, boolean, integer, integer, integer, text) from public, anon;
grant execute on function public.admin_update_account(uuid, text, timestamptz, text, boolean, integer, integer, integer, text) to authenticated;

create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from public.accounts),
    'new_users_30d', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'active_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'suspended', (select count(*) from public.accounts where suspended),
    'projects', (select count(*) from public.projects),
    'scripts', (select count(*) from public.scripts),
    'storage_bytes', (select coalesce(sum(nullif(metadata ->> 'size', '')::bigint), 0) from storage.objects where bucket_id = 'media'),
    'by_plan', (select coalesce(jsonb_object_agg(plan_id, n), '{}'::jsonb) from (select plan_id, count(*) as n from public.accounts group by plan_id) x)
  );
end;
$$;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- In-app notifications (the bell in the top bar). Only database functions create them.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  data jsonb not null default '{}'::jsonb,
  link text check (link is null or link ~ '^/[A-Za-z0-9/_\-?=&]*$'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
create policy "notifications: own read" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications: own mark read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: own delete" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- Tell the person when their upgrade request is decided.
create or replace function public.notify_upgrade_decision()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if old.status = 'pending' and new.status in ('approved', 'rejected') then
    insert into public.notifications (user_id, kind, data, link)
    values (
      new.user_id,
      'upgrade_' || new.status,
      jsonb_build_object(
        'plan_ar', (select name_ar from public.plans where id = new.plan_id),
        'plan_en', (select name_en from public.plans where id = new.plan_id),
        'expires_at', (select plan_expires_at from public.accounts where user_id = new.user_id)),
      '/settings');
  end if;
  return new;
end;
$$;
revoke execute on function public.notify_upgrade_decision() from public, anon, authenticated;
-- Runs after admin_handle_upgrade has updated the account, so the expiry date is the new one.
create trigger notify_upgrade_decision after update of status on public.upgrade_requests
  for each row execute function public.notify_upgrade_decision();

-- Tell the inviter when someone joins their project.
create or replace function public.notify_member_joined()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.invited_by is not null and new.invited_by <> new.user_id then
    insert into public.notifications (user_id, kind, data, link)
    values (
      new.invited_by,
      'member_joined',
      jsonb_build_object(
        'name', coalesce((select nullif(full_name, '') from public.profiles where id = new.user_id), ''),
        'project', (select name from public.projects where id = new.project_id)),
      '/projects/' || new.project_id || '/team');
  end if;
  return new;
end;
$$;
revoke execute on function public.notify_member_joined() from public, anon, authenticated;
create trigger notify_member_joined after insert on public.project_members
  for each row execute function public.notify_member_joined();

-- Update the account before the request, so the notification carries the new expiry date.
create or replace function public.admin_handle_upgrade(p_request uuid, p_approve boolean, p_months integer)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  req public.upgrade_requests;
begin
  if not authz.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into req from public.upgrade_requests where id = p_request and status = 'pending' for update;
  if not found then
    return;
  end if;
  if p_approve then
    update public.accounts
    set plan_id = req.plan_id,
        plan_expires_at = case when coalesce(p_months, 0) > 0 then now() + make_interval(months => least(p_months, 120)) else null end
    where user_id = req.user_id;
  end if;
  update public.upgrade_requests
  set status = case when p_approve then 'approved' else 'rejected' end, handled_at = now(), handled_by = (select auth.uid())
  where id = req.id;
end;
$$;
revoke execute on function public.admin_handle_upgrade(uuid, boolean, integer) from public, anon;
grant execute on function public.admin_handle_upgrade(uuid, boolean, integer) to authenticated;

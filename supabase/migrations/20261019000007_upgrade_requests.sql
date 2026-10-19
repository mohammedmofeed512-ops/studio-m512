-- Users ask for a plan upgrade from "My plan"; admins approve or reject it in the admin panel.
create table public.upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id text not null references public.plans (id) on update cascade on delete cascade,
  message text check (length(message) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid references auth.users (id) on delete set null
);
create index on public.upgrade_requests (user_id);
create index on public.upgrade_requests (plan_id);
create index on public.upgrade_requests (handled_by);
create index on public.upgrade_requests (status, created_at desc);
-- One open request per person.
create unique index upgrade_requests_one_pending on public.upgrade_requests (user_id) where status = 'pending';

alter table public.upgrade_requests enable row level security;
create policy "upgrade_requests: own or staff read" on public.upgrade_requests for select to authenticated
  using (user_id = (select auth.uid()) or authz.is_staff());
create policy "upgrade_requests: ask for yourself" on public.upgrade_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and handled_at is null and handled_by is null
              and not authz.is_suspended((select auth.uid())));
create policy "upgrade_requests: withdraw own pending" on public.upgrade_requests for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'pending');

-- Approve (moves the account to the requested plan, optionally for a number of months) or reject.
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
  update public.upgrade_requests
  set status = case when p_approve then 'approved' else 'rejected' end, handled_at = now(), handled_by = (select auth.uid())
  where id = req.id;
  if p_approve then
    update public.accounts
    set plan_id = req.plan_id,
        plan_expires_at = case when coalesce(p_months, 0) > 0 then now() + make_interval(months => least(p_months, 120)) else null end
    where user_id = req.user_id;
  end if;
end;
$$;
revoke execute on function public.admin_handle_upgrade(uuid, boolean, integer) from public, anon;
grant execute on function public.admin_handle_upgrade(uuid, boolean, integer) to authenticated;

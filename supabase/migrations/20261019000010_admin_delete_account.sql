-- Admins can delete an account so its owner can sign up again with the same email.
-- Deleting removes the person's own projects, contacts, plan and requests. Work they did inside
-- other people's projects stays there: content keeps no owner (owner_id set null), and their
-- tasks and share links move to the project's owner.

-- Media files the account leaves behind: its folders for projects that leave with it.
-- Files it uploaded to projects that stay are kept, because those projects still show them.
create or replace function public.admin_account_media(p_user uuid)
returns setof text
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select o.name from storage.objects o
  where o.bucket_id = 'media'
    and (storage.foldername(o.name))[1] = p_user::text
    and not exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(o.name))[2] and p.owner_id <> p_user
    );
end;
$$;
revoke execute on function public.admin_account_media(uuid) from public, anon;
grant execute on function public.admin_account_media(uuid) to authenticated;

create or replace function public.admin_delete_account(p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'cannot_delete_self' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.accounts where user_id = p_user and role = 'admin') then
    raise exception 'cannot_delete_admin' using errcode = 'P0001';
  end if;
  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  update public.tasks t set owner_id = p.owner_id
  from public.projects p
  where t.project_id = p.id and t.owner_id = p_user and p.owner_id <> p_user;

  update public.share_links s set owner_id = p.owner_id
  from public.projects p
  where s.project_id = p.id and s.owner_id = p_user and p.owner_id <> p_user;

  delete from auth.users where id = p_user;
end;
$$;
revoke execute on function public.admin_delete_account(uuid) from public, anon;
grant execute on function public.admin_delete_account(uuid) to authenticated;

-- Lets the admin panel remove the deleted account's files through the Storage API.
create policy "media: admins delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and authz.is_admin());

-- Phase 4: atomic stripboard saves, call sheet data for the owner, and personal
-- call sheet links that crew open without an account.

-- Saves the whole stripboard in one transaction (runs with the caller's RLS).
create or replace function public.save_stripboard(p_project uuid, p_layout jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  day_ids uuid[];
begin
  select coalesce(array_agg(d.id), '{}') into day_ids
  from public.shoot_days d
  where d.project_id = p_project
    and d.id in (select (x ->> 'id')::uuid from jsonb_array_elements(p_layout) x);

  delete from public.shoot_day_scenes where shoot_day_id = any (day_ids);

  insert into public.shoot_day_scenes (shoot_day_id, scene_id, position)
  select distinct on (s.scene_id) s.day_id, s.scene_id, s.pos
  from (
    select (x ->> 'id')::uuid as day_id, (sid #>> '{}')::uuid as scene_id, (o.ord + d.ord * 10000)::double precision as pos
    from jsonb_array_elements(p_layout) with ordinality d(x, ord)
    cross join lateral jsonb_array_elements(x -> 'sceneIds') with ordinality o(sid, ord)
  ) s
  where s.day_id = any (day_ids)
  order by s.scene_id, s.pos;
end;
$$;

revoke execute on function public.save_stripboard(uuid, jsonb) from public, anon;
grant execute on function public.save_stripboard(uuid, jsonb) to authenticated;

-- Internal builder, not exposed through the API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

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
    'company', (select coalesce(pr.company_name, '') from public.profiles pr join d on d.owner_id = pr.id),
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

-- The owner's call sheet for a shoot day.
create or replace function public.call_sheet_for_day(p_day uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.shoot_days where id = p_day and owner_id = (select auth.uid())) then
    return null;
  end if;
  return private.call_sheet_json(p_day);
end;
$$;

revoke execute on function public.call_sheet_for_day(uuid) from public, anon;
grant execute on function public.call_sheet_for_day(uuid) to authenticated;

-- A recipient's personal call sheet, opened from their link (no account needed).
create or replace function public.call_sheet_view(p_token text)
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
  select rc.status, rc.call_time, c.full_name, cs.shoot_day_id into r
  from public.call_sheet_recipients rc
  join public.call_sheets cs on cs.id = rc.call_sheet_id
  join public.contacts c on c.id = rc.contact_id
  where rc.token = p_token;
  if not found then
    return null;
  end if;
  return private.call_sheet_json(r.shoot_day_id)
    || jsonb_build_object('recipient', jsonb_build_object('name', r.full_name, 'call_time', to_char(r.call_time, 'HH24:MI'), 'status', r.status));
end;
$$;

create or replace function public.call_sheet_opened(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.call_sheet_recipients
  set status = case when status in ('pending', 'sent') then 'opened'::public.recipient_status else status end,
      opened_at = coalesce(opened_at, now())
  where token = p_token;
$$;

create or replace function public.call_sheet_confirm(p_token text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with u as (
    update public.call_sheet_recipients
    set status = 'confirmed', confirmed_at = now(), opened_at = coalesce(opened_at, now())
    where token = p_token
    returning 1
  )
  select exists (select 1 from u);
$$;

revoke execute on function public.call_sheet_view(text) from public;
revoke execute on function public.call_sheet_opened(text) from public;
revoke execute on function public.call_sheet_confirm(text) from public;
grant execute on function public.call_sheet_view(text) to anon, authenticated;
grant execute on function public.call_sheet_opened(text) to anon, authenticated;
grant execute on function public.call_sheet_confirm(text) to anon, authenticated;

create index if not exists shoot_day_scenes_day_idx on public.shoot_day_scenes (shoot_day_id, position);

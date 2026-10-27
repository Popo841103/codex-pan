-- Calendar v2: additive migration. Run after setup.sql in the SQL Editor.
begin;
alter table public.cohub_events add column if not exists ends_at timestamptz;
alter table public.cohub_events add column if not exists category text;
alter table public.cohub_events add column if not exists cover_url text;
alter table public.cohub_events add column if not exists title_en text;
alter table public.cohub_events add column if not exists title_zh text;
alter table public.cohub_events add column if not exists description_en text;
alter table public.cohub_events add column if not exists description_zh text;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='cohub_event_end_valid') then
 alter table public.cohub_events add constraint cohub_event_end_valid check(ends_at is null or ends_at>starts_at);
 end if;
 if not exists(select 1 from pg_constraint where conname='cohub_event_category_valid') then
 alter table public.cohub_events add constraint cohub_event_category_valid check(category is null or category in ('ai-meetup','ai-agents','language-exchange','nomads','web3','women-yoga','coffee','beer-pour','city-walk','travel-diving'));
 end if;
end $$;
create table if not exists public.cohub_admins(user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists public.cohub_admin_audit(
 id uuid primary key default gen_random_uuid(), actor uuid not null, action text not null,
 event_id uuid, subject_user_id uuid, created_at timestamptz not null default now()
);
alter table public.cohub_admins enable row level security;
alter table public.cohub_admin_audit enable row level security;
revoke all on public.cohub_admins,public.cohub_admin_audit from anon,authenticated;
grant all on public.cohub_admins,public.cohub_admin_audit to service_role;
create or replace function public.cohub_is_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select public.cohub_verified_member() and exists(select 1 from public.cohub_admins where user_id=auth.uid());
$$;
revoke all on function public.cohub_is_admin() from public;
grant execute on function public.cohub_is_admin() to authenticated;
-- Administrative data only leaves the database after authoritative role checks.
create or replace function public.cohub_admin_events() returns setof public.cohub_events
language plpgsql security definer set search_path='' as $$ begin
 if not public.cohub_is_admin() then raise exception 'Administrator required'; end if;
 return query select * from public.cohub_events order by starts_at desc;
end $$;
create or replace function public.cohub_admin_save(target_event uuid, patch jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare oldrow public.cohub_events; updated public.cohub_events;
begin
 if not public.cohub_is_admin() then raise exception 'Administrator required'; end if;
 select * into oldrow from public.cohub_events where id=target_event for update;
 if not found then raise exception 'Event unavailable'; end if;
 if patch - array['title','description','starts_at','ends_at','location','language','capacity','fee_details','status','category','cover_url','title_en','title_zh','description_en','description_zh'] <> '{}'::jsonb then raise exception 'Unsupported field'; end if;
 updated=jsonb_populate_record(oldrow,patch);
 if updated.status='approved' and updated.ends_at is null then raise exception 'End time required'; end if;
 if updated.capacity<(select count(*) from public.cohub_registrations where event_id=target_event and status='confirmed') then raise exception 'Capacity below confirmed participants'; end if;
 if updated.cover_url is not null and updated.cover_url !~ '^assets/coffee/cohub-event-[a-z0-9-]+-v2.webp$' then raise exception 'Use an existing topic cover'; end if;
 update public.cohub_events set title=updated.title,description=updated.description,starts_at=updated.starts_at,ends_at=updated.ends_at,location=updated.location,language=updated.language,capacity=updated.capacity,fee_details=updated.fee_details,status=updated.status,category=updated.category,cover_url=updated.cover_url,title_en=updated.title_en,title_zh=updated.title_zh,description_en=updated.description_en,description_zh=updated.description_zh where id=target_event;
 insert into public.cohub_admin_audit(actor,action,event_id) values(auth.uid(),'event:'||updated.status,target_event);
end $$;
create or replace function public.cohub_admin_registrations(target_event uuid)
returns table(user_id uuid,email text,status text)
language plpgsql security definer set search_path='' as $$ begin
 if not public.cohub_is_admin() then raise exception 'Administrator required'; end if;
 return query select r.user_id,u.email::text,r.status from public.cohub_registrations r join auth.users u on u.id=r.user_id where r.event_id=target_event order by r.created_at;
end $$;
create or replace function public.cohub_admin_registration(target_event uuid,target_user uuid,new_status text) returns void
language plpgsql security definer set search_path='' as $$ begin
 if not public.cohub_is_admin() then raise exception 'Administrator required'; end if;
 if new_status not in ('confirmed','rejected','cancelled') then raise exception 'Invalid status'; end if;
 perform 1 from public.cohub_events where id=target_event for update;
 update public.cohub_registrations set status=new_status where event_id=target_event and user_id=target_user;
 if not found then raise exception 'Registration unavailable'; end if;
 insert into public.cohub_admin_audit(actor,action,event_id,subject_user_id) values(auth.uid(),'registration:'||new_status,target_event,target_user);
end $$;
revoke all on function public.cohub_admin_events(),public.cohub_admin_save(uuid,jsonb),public.cohub_admin_registrations(uuid),public.cohub_admin_registration(uuid,uuid,text) from public;
grant execute on function public.cohub_admin_events(),public.cohub_admin_save(uuid,jsonb),public.cohub_admin_registrations(uuid),public.cohub_admin_registration(uuid,uuid,text) to authenticated;
commit;
-- Assign the FIRST administrator separately using a verified member's UUID:
-- insert into public.cohub_admins(user_id) values ('VERIFIED-MEMBER-UUID') on conflict do nothing;
-- Never grant admin roles from a browser or store a service_role key in the website.

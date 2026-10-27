-- CO-HUB community membership, version 1. Run once in Supabase SQL Editor.
-- Additive and safe to rerun: does not delete existing member/event data.
begin;
create table if not exists public.cohub_events (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 160),
 description text not null check(length(trim(description)) between 1 and 5000),
 starts_at timestamptz not null,
 location text not null check(length(trim(location)) between 1 and 300),
 language text not null check(length(trim(language)) between 1 and 100),
 capacity integer not null check(capacity between 1 and 1000),
 fee_details text not null default 'To be confirmed' check(length(fee_details)<=300),
 status text not null default 'pending' check(status in ('draft','pending','approved','rejected','cancelled')),
 created_at timestamptz not null default now()
);
create table if not exists public.cohub_registrations (
 event_id uuid not null references public.cohub_events(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'requested' check(status in ('requested','confirmed','cancelled','rejected')),
 created_at timestamptz not null default now(), primary key(event_id,user_id)
);
create table if not exists public.cohub_follows (
 event_id uuid not null references public.cohub_events(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(event_id,user_id)
);
create table if not exists public.cohub_cohosts (
 event_id uuid not null references public.cohub_events(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'invited' check(status in ('invited','accepted','declined')),
 created_at timestamptz not null default now(),primary key(event_id,user_id)
);
create index if not exists cohub_events_owner_idx on public.cohub_events(owner_id);
create index if not exists cohub_events_status_date_idx on public.cohub_events(status,starts_at);
create index if not exists cohub_registrations_user_idx on public.cohub_registrations(user_id);
create index if not exists cohub_follows_user_idx on public.cohub_follows(user_id);
create index if not exists cohub_cohosts_user_idx on public.cohub_cohosts(user_id);

-- Never trust a browser-supplied email, user ID or "verified" flag.
create or replace function public.cohub_verified_member() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null);
$$;
revoke all on function public.cohub_verified_member() from public;
grant execute on function public.cohub_verified_member() to anon,authenticated;

create or replace function public.cohub_is_cohost(target_event uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.cohub_verified_member() and exists(select 1 from public.cohub_cohosts c
 where c.event_id=target_event and c.user_id=auth.uid() and c.status='accepted');
$$;
revoke all on function public.cohub_is_cohost(uuid) from public;
grant execute on function public.cohub_is_cohost(uuid) to anon,authenticated;

alter table public.cohub_events enable row level security;
alter table public.cohub_registrations enable row level security;
alter table public.cohub_follows enable row level security;
alter table public.cohub_cohosts enable row level security;
revoke all on public.cohub_events,public.cohub_registrations,public.cohub_follows,public.cohub_cohosts from anon,authenticated;
grant select on public.cohub_events to anon,authenticated;
grant insert on public.cohub_events to authenticated;
grant select on public.cohub_registrations,public.cohub_follows,public.cohub_cohosts to authenticated;
grant insert,delete on public.cohub_follows to authenticated;
grant all on public.cohub_events,public.cohub_registrations,public.cohub_follows,public.cohub_cohosts to service_role;

drop policy if exists cohub_events_read on public.cohub_events;
create policy cohub_events_read on public.cohub_events for select to anon,authenticated
using(status='approved' or (owner_id=auth.uid() and public.cohub_verified_member())
 or public.cohub_is_cohost(id));
drop policy if exists cohub_events_submit on public.cohub_events;
create policy cohub_events_submit on public.cohub_events for insert to authenticated
with check(owner_id=auth.uid() and public.cohub_verified_member() and status='pending' and starts_at>now());
drop policy if exists cohub_registrations_read on public.cohub_registrations;
create policy cohub_registrations_read on public.cohub_registrations for select to authenticated
using(user_id=auth.uid() and public.cohub_verified_member());
drop policy if exists cohub_follows_own on public.cohub_follows;
create policy cohub_follows_own on public.cohub_follows for select to authenticated
using(user_id=auth.uid() and public.cohub_verified_member());
drop policy if exists cohub_follows_add on public.cohub_follows;
create policy cohub_follows_add on public.cohub_follows for insert to authenticated
with check(user_id=auth.uid() and public.cohub_verified_member() and exists(select 1 from public.cohub_events e where e.id=event_id and e.status='approved'));
drop policy if exists cohub_follows_remove on public.cohub_follows;
create policy cohub_follows_remove on public.cohub_follows for delete to authenticated
using(user_id=auth.uid() and public.cohub_verified_member());
drop policy if exists cohub_cohosts_read on public.cohub_cohosts;
create policy cohub_cohosts_read on public.cohub_cohosts for select to authenticated
using(user_id=auth.uid() and public.cohub_verified_member());

-- Registration is a request, not an automatically confirmed or paid reservation.
create or replace function public.cohub_request_join(target_event uuid) returns void
language plpgsql security definer set search_path='' as $$
declare event_row public.cohub_events;
begin
 if not public.cohub_verified_member() then raise exception 'Verified email required'; end if;
 select * into event_row from public.cohub_events where id=target_event for update;
 if not found or event_row.status<>'approved' or event_row.starts_at<=now() then raise exception 'Event unavailable'; end if;
 if event_row.owner_id=auth.uid() then raise exception 'You already host this event'; end if;
 insert into public.cohub_registrations(event_id,user_id) values(target_event,auth.uid())
 on conflict(event_id,user_id) do update set status='requested' where cohub_registrations.status in ('cancelled','rejected');
end; $$;
revoke all on function public.cohub_request_join(uuid) from public;
grant execute on function public.cohub_request_join(uuid) to authenticated;

-- Invitations are issued by the team; recipients can only accept or decline their own.
create or replace function public.cohub_answer_invitation(target_event uuid,accept_invite boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.cohub_verified_member() then raise exception 'Verified email required'; end if;
 update public.cohub_cohosts set status=case when accept_invite then 'accepted' else 'declined' end
 where event_id=target_event and user_id=auth.uid() and status='invited';
 if not found then raise exception 'Invitation unavailable'; end if;
end; $$;
revoke all on function public.cohub_answer_invitation(uuid,boolean) from public;
grant execute on function public.cohub_answer_invitation(uuid,boolean) to authenticated;

-- Confirmations (by the team) are serialized, so capacity cannot be exceeded.
create or replace function public.cohub_check_capacity() returns trigger
language plpgsql security definer set search_path='' as $$
declare event_row public.cohub_events; seats integer;
begin
 if new.status='confirmed' then
  select * into event_row from public.cohub_events where id=new.event_id for update;
  if event_row.status<>'approved' or event_row.starts_at<=now() then raise exception 'Event unavailable'; end if;
  select count(*) into seats from public.cohub_registrations where event_id=new.event_id and status='confirmed' and user_id<>new.user_id;
  if seats>=event_row.capacity then raise exception 'Event is full'; end if;
 end if;
 return new;
end; $$;
revoke all on function public.cohub_check_capacity() from public;
drop trigger if exists cohub_registration_capacity on public.cohub_registrations;
create trigger cohub_registration_capacity before insert or update on public.cohub_registrations
for each row execute function public.cohub_check_capacity();
commit;

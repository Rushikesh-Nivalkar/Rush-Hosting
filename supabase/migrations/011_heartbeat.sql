create table if not exists heartbeat (
  id      integer primary key default 1,
  last_at timestamptz not null default now(),
  constraint heartbeat_single_row check (id = 1)
);

insert into heartbeat (id, last_at)
values (1, now())
on conflict (id) do nothing;

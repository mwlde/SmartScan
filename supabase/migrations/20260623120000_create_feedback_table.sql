-- Feedback collected from the Results screen after each classification.
-- user_id is nullable because auth/login is not implemented yet.

create table if not exists feedback (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  user_id         uuid references auth.users(id) on delete set null,  -- nullable: no auth yet
  predicted_label text not null,
  confidence      real not null,
  was_correct     boolean not null,
  correct_label   text                                                  -- null when was_correct = true
);

alter table feedback enable row level security;

create policy "anyone can insert feedback"
  on feedback for insert
  with check (true);

create policy "anyone can read feedback"
  on feedback for select
  using (true);

-- Feedback collected from the Results screen after each classification.
-- user_id is nullable: guest submissions have no associated account (intentional).
-- RLS insert/select policies use `true` for the same reason — no user_id scoping needed.

create table if not exists feedback (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  user_id         uuid references auth.users(id) on delete set null,
  predicted_label text not null check (predicted_label in ('handwritten', 'invoice', 'form', 'printed_page')),
  confidence      real not null,
  was_correct     boolean not null,
  correct_label   text check (correct_label in ('handwritten', 'invoice', 'form', 'printed_page'))  -- null when was_correct = true
);

alter table feedback enable row level security;

create policy "anyone can insert feedback"
  on feedback for insert
  with check (true);

create policy "anyone can read feedback"
  on feedback for select
  using (true);

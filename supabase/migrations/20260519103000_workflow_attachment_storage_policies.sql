insert into storage.buckets (id, name, public)
values ('workflow-attachments', 'workflow-attachments', false)
on conflict (id) do update set public = false;

drop policy if exists "admins manage workflow attachment objects" on storage.objects;
create policy "admins manage workflow attachment objects" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'workflow-attachments'
    and exists (
      select 1 from public.users
      where id = auth.uid()
        and role = 'admin'
    )
  )
  with check (
    bucket_id = 'workflow-attachments'
    and exists (
      select 1 from public.users
      where id = auth.uid()
        and role = 'admin'
    )
  );

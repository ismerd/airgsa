alter table public.workflow_attachments
  drop constraint if exists workflow_attachments_storage_check;

update public.workflow_attachments
set storage = 'file'
where storage <> 'file';

alter table public.workflow_attachments
  add constraint workflow_attachments_storage_check
  check (storage in ('file'));

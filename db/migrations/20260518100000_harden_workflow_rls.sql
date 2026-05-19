create extension if not exists "pgcrypto";

alter table public.live_tenders enable row level security;
alter table public.live_applications enable row level security;
alter table public.live_partner_contracts enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_routes enable row level security;
alter table public.mandate_quotes enable row level security;
alter table public.mandate_bookings enable row level security;
alter table public.control_actions enable row level security;
alter table public.control_action_comments enable row level security;
alter table public.monthly_contract_reports enable row level security;
alter table public.mandate_audit_events enable row level security;
alter table public.platform_campaigns enable row level security;
alter table public.capacity_alerts enable row level security;
alter table public.news_posts enable row level security;
alter table public.linkedin_sources enable row level security;

drop policy if exists "authenticated read live tenders" on public.live_tenders;
create policy "authenticated read live tenders" on public.live_tenders
  for select to authenticated
  using (
    status = 'open'
    or data->>'status' = 'open'
    or exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or data->>'airlineCompanyId' = company_id::text
          or lower(data->>'airlineEmail') = lower(email)
        )
    )
  );

drop policy if exists "airlines manage own live tenders" on public.live_tenders;
create policy "airlines manage own live tenders" on public.live_tenders
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'airline'
            and (
              data->>'airlineCompanyId' = company_id::text
              or lower(data->>'airlineEmail') = lower(email)
            )
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'airline'
            and (
              data->>'airlineCompanyId' = company_id::text
              or lower(data->>'airlineEmail') = lower(email)
            )
          )
        )
    )
  );

drop policy if exists "authenticated read live applications" on public.live_applications;
create policy "authenticated read live applications" on public.live_applications
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or data->>'gsaCompanyId' = company_id::text
          or lower(data->>'email') = lower(email)
          or exists (
            select 1 from public.live_tenders
            where public.live_tenders.id = public.live_applications.tender_id
              and (
                public.live_tenders.data->>'airlineCompanyId' = public.users.company_id::text
                or lower(public.live_tenders.data->>'airlineEmail') = lower(public.users.email)
              )
          )
        )
    )
  );

drop policy if exists "company manage visible live applications" on public.live_applications;
create policy "company manage visible live applications" on public.live_applications
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or data->>'gsaCompanyId' = company_id::text
          or lower(data->>'email') = lower(email)
          or exists (
            select 1 from public.live_tenders
            where public.live_tenders.id = public.live_applications.tender_id
              and (
                public.live_tenders.data->>'airlineCompanyId' = public.users.company_id::text
                or lower(public.live_tenders.data->>'airlineEmail') = lower(public.users.email)
              )
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or data->>'gsaCompanyId' = company_id::text
          or lower(data->>'email') = lower(email)
          or exists (
            select 1 from public.live_tenders
            where public.live_tenders.id = public.live_applications.tender_id
              and (
                public.live_tenders.data->>'airlineCompanyId' = public.users.company_id::text
                or lower(public.live_tenders.data->>'airlineEmail') = lower(public.users.email)
              )
          )
        )
    )
  );

drop policy if exists "authenticated read live contracts" on public.live_partner_contracts;
create policy "authenticated read live contracts" on public.live_partner_contracts
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or data->>'airlineCompanyId' = company_id::text
          or data->>'gsaCompanyId' = company_id::text
          or lower(data->>'airlineEmail') = lower(email)
          or lower(data->>'email') = lower(email)
        )
    )
  );

drop policy if exists "airlines manage own live contracts" on public.live_partner_contracts;
create policy "airlines manage own live contracts" on public.live_partner_contracts
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'airline'
            and (
              data->>'airlineCompanyId' = company_id::text
              or lower(data->>'airlineEmail') = lower(email)
            )
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (
            role = 'airline'
            and (
              data->>'airlineCompanyId' = company_id::text
              or lower(data->>'airlineEmail') = lower(email)
            )
          )
        )
    )
  );

drop policy if exists "company read contracts" on public.contracts;
create policy "company read contracts" on public.contracts
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );

drop policy if exists "airlines manage own contracts" on public.contracts;
create policy "airlines manage own contracts" on public.contracts
  for all to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (role = 'airline' and public.contracts.airline_company_id = public.users.company_id)
        )
    )
  )
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or (role = 'airline' and public.contracts.airline_company_id = public.users.company_id)
        )
    )
  );

drop policy if exists "company read contract routes" on public.contract_routes;
create policy "company read contract routes" on public.contract_routes
  for select to authenticated
  using (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.contract_routes.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );

drop policy if exists "airlines manage own contract routes" on public.contract_routes;
create policy "airlines manage own contract routes" on public.contract_routes
  for all to authenticated
  using (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.contract_routes.contract_id
        and (
          public.users.role = 'admin'
          or (public.users.role = 'airline' and public.contracts.airline_company_id = public.users.company_id)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.contract_routes.contract_id
        and (
          public.users.role = 'admin'
          or (public.users.role = 'airline' and public.contracts.airline_company_id = public.users.company_id)
        )
    )
  );

drop policy if exists "company read mandate quotes" on public.mandate_quotes;
create policy "company read mandate quotes" on public.mandate_quotes
  for select to authenticated
  using (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.mandate_quotes.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );

drop policy if exists "contract parties manage mandate quotes" on public.mandate_quotes;
create policy "contract parties manage mandate quotes" on public.mandate_quotes
  for all to authenticated
  using (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.mandate_quotes.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  )
  with check (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.mandate_quotes.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );

drop policy if exists "company read mandate bookings" on public.mandate_bookings;
create policy "company read mandate bookings" on public.mandate_bookings
  for select to authenticated
  using (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.mandate_bookings.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );

drop policy if exists "contract parties manage mandate bookings" on public.mandate_bookings;
create policy "contract parties manage mandate bookings" on public.mandate_bookings
  for all to authenticated
  using (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.mandate_bookings.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  )
  with check (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.mandate_bookings.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );

drop policy if exists "company read control actions" on public.control_actions;
create policy "company read control actions" on public.control_actions
  for select to authenticated
  using (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.control_actions.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );

drop policy if exists "contract parties manage control actions" on public.control_actions;
create policy "contract parties manage control actions" on public.control_actions
  for all to authenticated
  using (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.control_actions.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  )
  with check (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.control_actions.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );

drop policy if exists "company read control action comments" on public.control_action_comments;
create policy "company read control action comments" on public.control_action_comments
  for select to authenticated
  using (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.control_action_comments.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );

drop policy if exists "contract parties manage control action comments" on public.control_action_comments;
create policy "contract parties manage control action comments" on public.control_action_comments
  for all to authenticated
  using (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.control_action_comments.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  )
  with check (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.control_action_comments.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );

drop policy if exists "company read monthly contract reports" on public.monthly_contract_reports;
create policy "company read monthly contract reports" on public.monthly_contract_reports
  for select to authenticated
  using (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.monthly_contract_reports.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );

drop policy if exists "contract parties manage monthly contract reports" on public.monthly_contract_reports;
create policy "contract parties manage monthly contract reports" on public.monthly_contract_reports
  for all to authenticated
  using (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.monthly_contract_reports.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  )
  with check (
    exists (
      select 1
      from public.contracts
      join public.users on public.users.id = auth.uid()
      where public.contracts.id = public.monthly_contract_reports.contract_id
        and (
          public.users.role = 'admin'
          or public.contracts.airline_company_id = public.users.company_id
          or public.contracts.gsa_company_id = public.users.company_id
        )
    )
  );

drop policy if exists "company read mandate audit events" on public.mandate_audit_events;
create policy "company read mandate audit events" on public.mandate_audit_events
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or lower(public.mandate_audit_events.actor_email) = lower(email)
          or exists (
            select 1 from public.contracts
            where public.contracts.id = public.mandate_audit_events.contract_id
              and (
                public.contracts.airline_company_id = public.users.company_id
                or public.contracts.gsa_company_id = public.users.company_id
              )
          )
        )
    )
  );

drop policy if exists "contract parties create mandate audit events" on public.mandate_audit_events;
create policy "contract parties create mandate audit events" on public.mandate_audit_events
  for insert to authenticated
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or lower(public.mandate_audit_events.actor_email) = lower(email)
          or exists (
            select 1 from public.contracts
            where public.contracts.id = public.mandate_audit_events.contract_id
              and (
                public.contracts.airline_company_id = public.users.company_id
                or public.contracts.gsa_company_id = public.users.company_id
              )
          )
        )
    )
  );

drop policy if exists "company read platform campaigns" on public.platform_campaigns;
create policy "company read platform campaigns" on public.platform_campaigns
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.platform_campaigns.author_company_id = public.users.company_id::text
          or (
            role = 'gsa'
            and author_role = 'airline'
            and status = 'published'
            and (
              coalesce(public.platform_campaigns.data->'targetCompanyIds', '[]'::jsonb) = '[]'::jsonb
              or coalesce(public.platform_campaigns.data->'targetCompanyIds', '[]'::jsonb) ? public.users.company_id::text
            )
          )
        )
    )
  );

drop policy if exists "company read capacity alerts" on public.capacity_alerts;
create policy "company read capacity alerts" on public.capacity_alerts
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
        and (
          role = 'admin'
          or public.capacity_alerts.airline_company_id = public.users.company_id::text
          or (
            role = 'gsa'
            and status = 'active'
            and (
              public.capacity_alerts.target_gsa_company_id = public.users.company_id::text
              or public.capacity_alerts.data->'routes' @> jsonb_build_array(jsonb_build_object('gsaCompanyId', public.users.company_id::text))
            )
          )
        )
    )
  );

drop policy if exists "admins manage news" on public.news_posts;
create policy "admins manage news" on public.news_posts
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

drop policy if exists "admins manage linkedin sources" on public.linkedin_sources;
create policy "admins manage linkedin sources" on public.linkedin_sources
  for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

insert into storage.buckets (id, name, public)
values ('workflow-attachments', 'workflow-attachments', false)
on conflict (id) do nothing;

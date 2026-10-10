-- Arogya Pharma AI — Supabase Database Migration (Vite + React + TypeScript)
-- Migration Version: 20261010000000_init_arogya_pharma_schema.sql

-- Stage 1: Extensions & Base Tables
create extension if not exists "pgcrypto" with schema public;

create table if not exists public.batches (
  id text primary key,
  drug_name text not null,
  product_sku text,
  manufacturer_name text,
  manufacturer_lot_number text,
  dosage_form text not null,
  strength text not null,
  batch_size_units integer not null check (batch_size_units >= 0),
  received_quantity integer check (received_quantity >= 0),
  manufacturing_date date not null,
  expiry_date date not null check (expiry_date >= manufacturing_date),
  storage_condition text not null,
  current_warehouse text not null,
  status text not null default 'under_review' check (status in ('in_transit', 'released', 'quarantined', 'recalled', 'under_review')),
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  active_ingredients text not null,
  barcode_value text,
  qr_code_url text,
  registered_at timestamptz default pg_catalog.now(),
  notes text,
  estimated_monthly_sales_rate integer check (estimated_monthly_sales_rate >= 0),
  supplier_return_deadline date,
  supplier_return_policy_days integer check (supplier_return_policy_days >= 0),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create table if not exists public.approval_requests (
  id text primary key,
  batch_id text not null references public.batches (id) on delete restrict,
  title text not null,
  request_type text not null check (request_type in ('Quarantine Order', 'Recall Authorization', 'Release Override', 'Disposal Order')),
  submitted_by text not null,
  submitted_at timestamptz not null default pg_catalog.now(),
  urgency text not null check (urgency in ('critical', 'high', 'medium', 'low')),
  summary text not null,
  regulatory_reference text,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  decision_notes text,
  decided_at timestamptz,
  decided_by text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create table if not exists public.approval_audit_log (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.approval_requests (id) on delete restrict,
  batch_id text not null references public.batches (id) on delete restrict,
  request_type text not null,
  decision text not null check (decision in ('approved', 'rejected')),
  decision_notes text not null,
  decided_by text not null,
  decided_by_uid uuid not null,
  decided_at timestamptz not null default pg_catalog.now(),
  previous_batch_status text,
  new_batch_status text,
  canonical_payload text not null,
  payload_sha256 text not null,
  created_at timestamptz not null default pg_catalog.now()
);

-- Stage 2: Indexes & Triggers
create unique index if not exists idx_unique_pending_approval 
  on public.approval_requests (batch_id, request_type) 
  where status = 'pending';

create index if not exists idx_batches_status on public.batches (status);
create index if not exists idx_batches_expiry on public.batches (expiry_date);
create index if not exists idx_approval_requests_batch_id on public.approval_requests (batch_id);

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'tr_batches_updated_at' and tgrelid = 'public.batches'::regclass) then
    create trigger tr_batches_updated_at
      before update on public.batches
      for each row execute function public.handle_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'tr_approval_requests_updated_at' and tgrelid = 'public.approval_requests'::regclass) then
    create trigger tr_approval_requests_updated_at
      before update on public.approval_requests
      for each row execute function public.handle_updated_at();
  end if;
end $$;

-- Stage 3: Grants & Column-Level RLS Policies
do $$
begin
  drop policy if exists "Authenticated users can select batches" on public.batches;
  drop policy if exists "QA Lead and Warehouse Head can insert batches" on public.batches;
  drop policy if exists "QA Lead and Warehouse Head can update batches" on public.batches;
  drop policy if exists "Warehouse Head can update operational batch details" on public.batches;
  drop policy if exists "Authenticated users can select approval_requests" on public.approval_requests;
  drop policy if exists "QA Lead can submit approval_requests" on public.approval_requests;
  drop policy if exists "Authenticated users can select audit_log" on public.approval_audit_log;
end $$;

revoke all on public.batches from public, anon, authenticated;
revoke all on public.approval_requests from public, anon, authenticated;
revoke all on public.approval_audit_log from public, anon, authenticated;

grant usage on schema public to authenticated;

-- Batches: SELECT on table; INSERT on non-status cols; UPDATE on non-status cols ONLY
grant select on public.batches to authenticated;
grant insert (id, drug_name, product_sku, manufacturer_name, manufacturer_lot_number, dosage_form, strength, batch_size_units, received_quantity, manufacturing_date, expiry_date, storage_condition, current_warehouse, active_ingredients, barcode_value, qr_code_url, notes, estimated_monthly_sales_rate, supplier_return_deadline, supplier_return_policy_days)
  on public.batches to authenticated;
grant update (current_warehouse, storage_condition, notes, risk_score) 
  on public.batches to authenticated;

-- Approval Requests: SELECT & INSERT on table; NO UPDATE/DELETE for clients

grant select on public.approval_requests to authenticated;

grant insert (
  id,
  batch_id,
  title,
  request_type,
  submitted_by,
  urgency,
  summary,
  regulatory_reference
)
on public.approval_requests to authenticated;


-- Audit Log: SELECT on table; NO INSERT/UPDATE/DELETE for clients
grant select on public.approval_audit_log to authenticated;

alter table public.batches enable row level security;
alter table public.approval_requests enable row level security;
alter table public.approval_audit_log enable row level security;

create policy "Authenticated users can select batches" 
  on public.batches for select to authenticated using (true);

create policy "Warehouse Head can insert batches" 
  on public.batches for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('qa_lead', 'warehouse_manager'));

create policy "Warehouse Head can update operational batch details" 
  on public.batches for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'app_role') in ('qa_lead', 'warehouse_manager'));

create policy "Authenticated users can select approval_requests" 
  on public.approval_requests for select to authenticated using (true);


create policy "QA Lead can submit pending approval_requests"
  on public.approval_requests
  for insert
  to authenticated
  with check (
    status = 'pending'
    and decision_notes is null
    and decided_at is null
    and decided_by is null
    and (auth.jwt() -> 'app_metadata' ->> 'app_role')
      in ('qa_lead', 'regulatory_officer')
  );

create policy "Authenticated users can select audit_log" 
  on public.approval_audit_log for select to authenticated using (true);

-- Stage 4: Hardened SECURITY DEFINER RPC Function
create or replace function public.submit_approval_decision(
  p_request_id text,
  p_decision text,
  p_decision_notes text
)
returns public.approval_requests
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_caller_uid uuid;
  v_caller_email text;
  v_caller_name text;
  v_decided_by text;
  v_caller_role text;
  v_decided_at timestamptz;
  v_req public.approval_requests%rowtype;
  v_batch public.batches%rowtype;
  v_old_status text;
  v_new_status text;
  v_canonical_payload text;
  v_hash text;
begin
  -- 1. Validate authenticated caller
  v_caller_uid := auth.uid();
  if v_caller_uid is null then
    raise exception 'Unauthenticated: Valid Supabase JWT authentication required.'
      using errcode = '28000';
  end if;

  -- 2. Derive approver identity from JWT claims
  v_caller_email := pg_catalog.coalesce(auth.jwt() ->> 'email', '');
  v_caller_name := pg_catalog.coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', v_caller_email, v_caller_uid::text);
  v_decided_by := v_caller_name || ' (' || v_caller_email || ')';

  -- 3. Verify user authorization role
  v_caller_role := pg_catalog.coalesce(auth.jwt() -> 'app_metadata' ->> 'app_role', '');
  if v_caller_role not in ('qa_lead', 'regulatory_officer') then
    raise exception 'Unauthorized: User role "%" is not authorized to sign off approval requests.', v_caller_role
      using errcode = '42501';
  end if;

  -- 4. Validate decision parameter
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision "%": Must be "approved" or "rejected".', p_decision
      using errcode = '22023';
  end if;

  -- 5. Lock approval request row
  select * into v_req
  from public.approval_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Approval request "%" not found.', p_request_id
      using errcode = 'P0002';
  end if;

  if v_req.status != 'pending' then
    raise exception 'Approval request "%" has already been decided (Current Status: %).', p_request_id, v_req.status
      using errcode = '55000';
  end if;

  -- 6. Lock and validate batch existence
  select * into v_batch
  from public.batches
  where id = v_req.batch_id
  for update;

  if not found then
    raise exception 'Associated batch "%" for request "%" not found in inventory.', v_req.batch_id, p_request_id
      using errcode = 'P0002';
  end if;

  v_old_status := v_batch.status;
  v_new_status := v_old_status;
  v_decided_at := pg_catalog.now();

  -- 7. Explicit State Transition Allowlist Matrix
  if p_decision = 'approved' then
    if v_req.request_type = 'Quarantine Order' then
      if v_old_status in ('under_review', 'in_transit', 'released') then
        v_new_status := 'quarantined';
      else
        raise exception 'Invalid State Transition: Quarantine Order not permitted for batch % in status %.', v_req.batch_id, v_old_status
          using errcode = '55000';
      end if;

    elsif v_req.request_type = 'Recall Authorization' then
      if v_old_status in ('quarantined', 'under_review', 'in_transit', 'released') then
        v_new_status := 'recalled';
      else
        raise exception 'Invalid State Transition: Recall Authorization not permitted for batch % in status %.', v_req.batch_id, v_old_status
          using errcode = '55000';
      end if;

    elsif v_req.request_type = 'Release Override' then
      if v_old_status = 'recalled' then
        raise exception 'Security Block: Batch % is RECALLED. Recalled batches cannot be released via Release Override. Formal regulatory re-inspection required.', v_req.batch_id
          using errcode = '55000';
      elsif v_old_status in ('under_review', 'quarantined', 'released') then
        v_new_status := 'released';
      else
        raise exception 'Invalid State Transition: Release Override not permitted for batch % in status %.', v_req.batch_id, v_old_status
          using errcode = '55000';
      end if;

    elsif v_req.request_type = 'Disposal Order' then
      if v_old_status in ('quarantined', 'under_review') then
        v_new_status := 'quarantined'; -- Dock hold status
      else
        raise exception 'Invalid State Transition: Disposal Order not permitted for batch % in status %.', v_req.batch_id, v_old_status
          using errcode = '55000';
      end if;
    else
      raise exception 'Invalid Request Type: %', v_req.request_type
        using errcode = '55000';
    end if;

    -- Apply batch status update if status changed
    if v_new_status != v_old_status then
      update public.batches
      set status = v_new_status,
          updated_at = v_decided_at
      where id = v_req.batch_id;
    end if;
  end if;

  -- 8. Update approval request record
  update public.approval_requests
  set status = p_decision,
      decision_notes = p_decision_notes,
      decided_by = v_decided_by,
      decided_at = v_decided_at,
      updated_at = v_decided_at
  where id = p_request_id
  returning * into v_req;

  -- 9. Canonical Audit Event Hash
  v_canonical_payload := pg_catalog.json_build_object(
    'request_id', p_request_id,
    'batch_id', v_req.batch_id,
    'request_type', v_req.request_type,
    'decision', p_decision,
    'decision_notes', p_decision_notes,
    'decided_by_uid', v_caller_uid,
    'decided_by', v_decided_by,
    'decided_at', v_decided_at,
    'previous_batch_status', v_old_status,
    'new_batch_status', v_new_status
  )::text;

  v_hash := pg_catalog.encode(public.digest(v_canonical_payload, 'sha256'), 'hex');

  -- 10. Append to immutable audit log
  insert into public.approval_audit_log (
    request_id,
    batch_id,
    request_type,
    decision,
    decision_notes,
    decided_by,
    decided_by_uid,
    decided_at,
    previous_batch_status,
    new_batch_status,
    canonical_payload,
    payload_sha256
  ) values (
    p_request_id,
    v_req.batch_id,
    v_req.request_type,
    p_decision,
    p_decision_notes,
    v_decided_by,
    v_caller_uid,
    v_decided_at,
    v_old_status,
    v_new_status,
    v_canonical_payload,
    v_hash
  );

  return v_req;
end;
$$;

alter function public.submit_approval_decision(text, text, text) owner to postgres;
revoke all on function public.submit_approval_decision(text, text, text) from public, anon;
grant execute on function public.submit_approval_decision(text, text, text) to authenticated;

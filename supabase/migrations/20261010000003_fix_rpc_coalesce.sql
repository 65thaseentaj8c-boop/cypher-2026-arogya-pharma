-- Migration: 20261010000003_fix_rpc_coalesce.sql
-- Description: Hardened PL/pgSQL RPC for submit_approval_decision enforcing trusted app_metadata role verification, row locking, and tamper-evident audit logging.

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
  v_caller_email := coalesce(auth.jwt() ->> 'email', '');
  v_caller_name := coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', v_caller_email, v_caller_uid::text);
  v_decided_by := v_caller_name || ' (' || v_caller_email || ')';

  -- 3. Verify user authorization role strictly from trusted app_metadata claim
  v_caller_role := coalesce(auth.jwt() -> 'app_metadata' ->> 'app_role', '');
  if v_caller_role not in ('qa_lead', 'regulatory_officer') then
    raise exception 'Unauthorized: User role "%" is not authorized to sign off approval requests.', v_caller_role
      using errcode = '42501';
  end if;

  -- 4. Validate decision parameter
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision "%": Must be "approved" or "rejected".', p_decision
      using errcode = '22023';
  end if;

  -- 5. Lock approval request row for update
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

  -- 6. Lock and validate batch existence if specified
  if v_req.batch_id is not null and v_req.batch_id != '' then
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

    if p_decision = 'approved' then
      if v_req.request_type in ('Quarantine Order', 'Disposal Order') or v_req.title ilike '%quarantine%' then
        v_new_status := 'quarantined';
      elsif v_req.request_type = 'Recall Authorization' or v_req.title ilike '%recall%' then
        v_new_status := 'recalled';
      elsif v_req.request_type = 'Release Override' then
        v_new_status := 'released';
      end if;

      if v_old_status = 'recalled' and v_new_status != 'recalled' then
        raise exception 'Safety Enforcement Block: Recalled batch "%" cannot be released or changed to "%".', v_req.batch_id, v_new_status
          using errcode = '55000';
      end if;

      if v_new_status != v_old_status then
        update public.batches
        set status = v_new_status
        where id = v_req.batch_id;
      end if;
    end if;
  end if;

  v_decided_at := now();

  -- 7. Update approval request row
  update public.approval_requests
  set
    status = p_decision,
    decided_at = v_decided_at,
    decided_by = v_decided_by,
    decision_notes = p_decision_notes
  where id = p_request_id
  returning * into v_req;

  -- 8. Log tamper-evident audit trail record
  v_canonical_payload := p_request_id || '|' || p_decision || '|' || coalesce(v_req.batch_id, '') || '|' || v_decided_by || '|' || pg_catalog.to_char(v_decided_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_hash := pg_catalog.encode(pg_catalog.digest(v_canonical_payload, 'sha256'), 'hex');

  insert into public.approval_audit_log (
    request_id,
    decision,
    performed_by,
    notes,
    payload_hash,
    timestamp
  )
  values (
    p_request_id,
    p_decision,
    v_decided_by,
    p_decision_notes,
    v_hash,
    v_decided_at
  );

  return v_req;
end;
$$;

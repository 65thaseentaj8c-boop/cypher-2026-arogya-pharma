-- Arogya Pharma AI — Supabase Database Migration (Vite + React + TypeScript)
-- Migration Version: 20261010000001_approval_requests_delete_policy.sql

-- 1. Grant DELETE privilege on public.approval_requests to authenticated role ONLY
grant delete on public.approval_requests to authenticated;

-- 2. Create RLS Policy for DELETE on public.approval_requests
-- Restricts deletion strictly to pending requests and authorized roles (qa_lead, regulatory_officer).
-- Decided requests ('approved', 'rejected') cannot be deleted by clients, preserving immutable audit history.
do $$
begin
  drop policy if exists "QA Lead and Regulatory Officer can delete pending approval_requests" on public.approval_requests;
end $$;

create policy "QA Lead and Regulatory Officer can delete pending approval_requests"
  on public.approval_requests
  for delete
  to authenticated
  using (
    status = 'pending'
    and (auth.jwt() -> 'app_metadata' ->> 'app_role') in ('qa_lead', 'regulatory_officer')
  );

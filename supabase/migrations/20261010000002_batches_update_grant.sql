-- Migration: 20261010000002_batches_update_grant.sql
-- Description: Grant column-level UPDATE privileges on public.batches for correction fields (batch_size_units, manufacturer_lot_number)

grant update (current_warehouse, storage_condition, notes, risk_score, batch_size_units, manufacturer_lot_number)
  on public.batches to authenticated;

import { describe, it, expect } from 'vitest';
import {
  mapDatabaseBatchToBatchItem,
  mapBatchItemToDatabaseBatch,
  mapBatchItemToDatabaseBatchForInsert,
  mapDatabaseApprovalToApprovalRequest,
  mapApprovalRequestToDatabaseApproval,
  type DatabaseBatch,
  type DatabaseApprovalRequest,
} from '../pharmacyService';
import { isSupabaseConfigured, getSupabaseClient } from '../../lib/supabase';
import type { BatchItem, ApprovalRequest } from '../../types';

describe('Supabase Integration — Mapping & Configuration Unit Tests', () => {
  it('correctly checks isSupabaseConfigured flag', () => {
    // Should be boolean
    expect(typeof isSupabaseConfigured).toBe('boolean');
  });

  it('throws a clean configuration error when getSupabaseClient is called without valid config', () => {
    if (!isSupabaseConfigured) {
      expect(() => getSupabaseClient()).toThrow(/Supabase Configuration Error/);
    } else {
      expect(() => getSupabaseClient()).not.toThrow();
    }
  });

  it('maps DatabaseBatch to BatchItem with full fidelity', () => {
    const dbBatch: DatabaseBatch = {
      id: 'B2299',
      drug_name: 'Amoxicillin Trihydrate IP',
      product_sku: 'SKU-AMX-500',
      manufacturer_name: 'Arogya Formulation Works',
      manufacturer_lot_number: 'LOT-AMX-2026-001',
      dosage_form: 'Oral Capsule (500mg)',
      strength: '500 mg',
      batch_size_units: 50000,
      received_quantity: 50000,
      manufacturing_date: '2026-08-01',
      expiry_date: '2028-08-01',
      storage_condition: 'Store below 25°C in a dry place',
      current_warehouse: 'Central Pharma Hub Bhiwandi (WH-01)',
      status: 'released',
      risk_score: 5,
      active_ingredients: 'Amoxicillin Trihydrate IP 500mg',
      barcode_value: '8909876543210',
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?data=B2299',
      registered_at: '2026-08-02 10:00 IST',
      notes: 'Initial QC cleared',
      estimated_monthly_sales_rate: 8000,
      supplier_return_deadline: '2028-06-01',
      supplier_return_policy_days: 60,
    };

    const item = mapDatabaseBatchToBatchItem(dbBatch);

    expect(item.id).toBe('B2299');
    expect(item.drugName).toBe('Amoxicillin Trihydrate IP');
    expect(item.productSku).toBe('SKU-AMX-500');
    expect(item.manufacturerName).toBe('Arogya Formulation Works');
    expect(item.manufacturerLotNumber).toBe('LOT-AMX-2026-001');
    expect(item.dosageForm).toBe('Oral Capsule (500mg)');
    expect(item.strength).toBe('500 mg');
    expect(item.batchSizeUnits).toBe(50000);
    expect(item.receivedQuantity).toBe(50000);
    expect(item.status).toBe('released');
    expect(item.riskScore).toBe(5);
    expect(item.activeIngredients).toBe('Amoxicillin Trihydrate IP 500mg');
    expect(item.barcodeValue).toBe('8909876543210');
    expect(item.notes).toBe('Initial QC cleared');
    expect(item.estimatedMonthlySalesRate).toBe(8000);
    expect(item.supplierReturnDeadline).toBe('2028-06-01');
    expect(item.supplierReturnPolicyDays).toBe(60);
  });

  it('maps BatchItem to DatabaseBatch with full fidelity', () => {
    const item: BatchItem = {
      id: 'B2300',
      drugName: 'Cefixime Oral Suspension',
      productSku: 'SKU-CFX-100',
      manufacturerName: 'Arogya Formulation Works',
      manufacturerLotNumber: 'LOT-CFX-2026-002',
      dosageForm: 'Oral Suspension',
      strength: '100 mg / 5ml',
      batchSizeUnits: 20000,
      receivedQuantity: 20000,
      manufacturingDate: '2026-09-01',
      expiryDate: '2027-09-01',
      storageCondition: 'Cool dry place',
      currentWarehouse: 'Wholesale Depot 2',
      status: 'under_review',
      riskScore: 15,
      activeIngredients: 'Cefixime Trihydrate USP',
      barcodeValue: '8901122334455',
      registeredAt: '2026-09-02 12:00 IST',
      notes: 'Sampled for HPLC assay',
      estimatedMonthlySalesRate: 3000,
      supplierReturnDeadline: '2027-07-01',
      supplierReturnPolicyDays: 45,
    };

    const dbBatch = mapBatchItemToDatabaseBatch(item);

    expect(dbBatch.id).toBe('B2300');
    expect(dbBatch.drug_name).toBe('Cefixime Oral Suspension');
    expect(dbBatch.product_sku).toBe('SKU-CFX-100');
    expect(dbBatch.manufacturer_name).toBe('Arogya Formulation Works');
    expect(dbBatch.manufacturer_lot_number).toBe('LOT-CFX-2026-002');
    expect(dbBatch.dosage_form).toBe('Oral Suspension');
    expect(dbBatch.strength).toBe('100 mg / 5ml');
    expect(dbBatch.batch_size_units).toBe(20000);
    expect(dbBatch.received_quantity).toBe(20000);
    expect(dbBatch.status).toBe('under_review');
    expect(dbBatch.risk_score).toBe(15);
    expect(dbBatch.active_ingredients).toBe('Cefixime Trihydrate USP');
    expect(dbBatch.barcode_value).toBe('8901122334455');
    expect(dbBatch.notes).toBe('Sampled for HPLC assay');
    expect(dbBatch.estimated_monthly_sales_rate).toBe(3000);
    expect(dbBatch.supplier_return_deadline).toBe('2027-07-01');
    expect(dbBatch.supplier_return_policy_days).toBe(45);
  });

  it('maps BatchItem to DatabaseBatchForInsert strictly excluding status, risk_score, and registered_at', () => {
    const item: BatchItem = {
      id: 'DEMO-B2401',
      drugName: 'Paracetamol Infusion IP',
      productSku: 'SKU-PCM-1000IV',
      manufacturerName: 'Arogya Formulation Works',
      manufacturerLotNumber: 'LOT-PCM-2026-999',
      dosageForm: 'Intravenous Infusion (100ml)',
      strength: '10 mg/ml',
      batchSizeUnits: 10000,
      receivedQuantity: 10000,
      manufacturingDate: '2026-09-01',
      expiryDate: '2028-09-01',
      storageCondition: 'Controlled Room Temp',
      currentWarehouse: 'Bhiwandi Park WH-04',
      status: 'under_review',
      riskScore: 10,
      activeIngredients: 'Paracetamol IP',
      barcodeValue: '8901234567890',
      registeredAt: '2026-10-10 08:00 IST',
      notes: 'Initial test batch',
    };

    const insertPayload = mapBatchItemToDatabaseBatchForInsert(item);

    expect(insertPayload.id).toBe('DEMO-B2401');
    expect(insertPayload.drug_name).toBe('Paracetamol Infusion IP');
    expect(insertPayload.product_sku).toBe('SKU-PCM-1000IV');
    expect(insertPayload.manufacturer_name).toBe('Arogya Formulation Works');
    expect(insertPayload.manufacturer_lot_number).toBe('LOT-PCM-2026-999');
    expect(insertPayload.dosage_form).toBe('Intravenous Infusion (100ml)');
    expect(insertPayload.strength).toBe('10 mg/ml');
    expect(insertPayload.batch_size_units).toBe(10000);
    expect(insertPayload.received_quantity).toBe(10000);
    expect(insertPayload.manufacturing_date).toBe('2026-09-01');
    expect(insertPayload.expiry_date).toBe('2028-09-01');
    expect(insertPayload.storage_condition).toBe('Controlled Room Temp');
    expect(insertPayload.current_warehouse).toBe('Bhiwandi Park WH-04');
    expect(insertPayload.active_ingredients).toBe('Paracetamol IP');
    expect(insertPayload.barcode_value).toBe('8901234567890');
    expect(insertPayload.notes).toBe('Initial test batch');

    // MUST omit status, risk_score, registered_at to respect column-level GRANT INSERT permissions for authenticated users
    expect(insertPayload.status).toBeUndefined();
    expect(insertPayload.risk_score).toBeUndefined();
    expect(insertPayload.registered_at).toBeUndefined();
  });

  it('maps DatabaseApprovalRequest to ApprovalRequest with full fidelity', () => {
    const dbApproval: DatabaseApprovalRequest = {
      id: 'APP-105',
      batch_id: 'B2231',
      title: 'Quarantine Order — Batch B2231 Thermal Excursion',
      request_type: 'Quarantine Order',
      submitted_by: 'Risk Analysis Engine (Auto-Trigger)',
      submitted_at: '2026-10-09 14:00 IST',
      urgency: 'critical',
      summary: 'Temperature excursion detected above 25°C',
      regulatory_reference: 'CDSCO Schedule M Section 8.4',
      status: 'pending',
      decision_notes: null,
      decided_at: null,
      decided_by: null,
    };

    const req = mapDatabaseApprovalToApprovalRequest(dbApproval);

    expect(req.id).toBe('APP-105');
    expect(req.batchId).toBe('B2231');
    expect(req.title).toBe('Quarantine Order — Batch B2231 Thermal Excursion');
    expect(req.requestType).toBe('Quarantine Order');
    expect(req.submittedBy).toBe('Risk Analysis Engine (Auto-Trigger)');
    expect(req.submittedAt).toBe('2026-10-09 14:00 IST');
    expect(req.urgency).toBe('critical');
    expect(req.summary).toBe('Temperature excursion detected above 25°C');
    expect(req.regulatoryReference).toBe('CDSCO Schedule M Section 8.4');
    expect(req.status).toBe('pending');
    expect(req.decisionNotes).toBeUndefined();
    expect(req.decidedAt).toBeUndefined();
    expect(req.decidedBy).toBeUndefined();
  });

  it('maps ApprovalRequest to DatabaseApprovalRequest with full fidelity', () => {
    const req: ApprovalRequest = {
      id: 'APP-106',
      batchId: 'B2240',
      title: 'Class II Recall Authorization',
      requestType: 'Recall Authorization',
      submittedBy: 'Dr. V. K. Sharma',
      submittedAt: '2026-10-09 15:30 IST',
      urgency: 'high',
      summary: 'Potency assay below specification threshold',
      regulatoryReference: 'FDA Guidance 21 CFR 7.40',
      status: 'approved',
      decisionNotes: 'Recall approved by Senior QA Panel',
      decidedAt: '2026-10-09 16:00 IST',
      decidedBy: 'Thaseen Taj (QA Lead Officer)',
    };

    const dbApproval = mapApprovalRequestToDatabaseApproval(req);

    expect(dbApproval.id).toBe('APP-106');
    expect(dbApproval.batch_id).toBe('B2240');
    expect(dbApproval.title).toBe('Class II Recall Authorization');
    expect(dbApproval.request_type).toBe('Recall Authorization');
    expect(dbApproval.submitted_by).toBe('Dr. V. K. Sharma');
    expect(dbApproval.submitted_at).toBe('2026-10-09 15:30 IST');
    expect(dbApproval.urgency).toBe('high');
    expect(dbApproval.summary).toBe('Potency assay below specification threshold');
    expect(dbApproval.regulatory_reference).toBe('FDA Guidance 21 CFR 7.40');
    expect(dbApproval.status).toBe('approved');
    expect(dbApproval.decision_notes).toBe('Recall approved by Senior QA Panel');
    expect(dbApproval.decided_at).toBe('2026-10-09 16:00 IST');
    expect(dbApproval.decided_by).toBe('Thaseen Taj (QA Lead Officer)');
  });
});

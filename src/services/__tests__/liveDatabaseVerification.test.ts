import { describe, it, expect } from 'vitest';
import {
  pharmacyService,
  mapBatchItemToDatabaseBatchForInsert,
  mapDatabaseBatchToBatchItem,
} from '../pharmacyService';
import type { RegisterBatchInput, BatchItem } from '../../types';

describe('Batch Registration Failure Diagnosis & Fix Tests', () => {
  const validPayload: RegisterBatchInput = {
    batchId: 'DEMO-B2401',
    productName: 'Paracetamol Infusion IP',
    productSku: 'SKU-PCM-1000IV',
    manufacturerName: 'Arogya Formulation Works (Ahmedabad)',
    manufacturerLotNumber: 'LOT-DEMO-2026-B2401',
    dosageForm: 'Intravenous Infusion (100ml)',
    strength: '10 mg/ml (1000mg)',
    manufacturingDate: '2026-09-01',
    expiryDate: '2028-09-01',
    quantityReceived: 10000,
    currentWarehouse: 'Arogya Regional Logistics Park Bhiwandi (WH-04)',
    storageCondition: 'Controlled Room Temp (15°C to 25°C - Demo assumption)',
    activeIngredients: 'Paracetamol IP (High-purity crystalline)',
    barcodeValue: '8901234567890',
    notes: 'Test payload for DEMO-B2401 verification',
  };

  it('1. mapBatchItemToDatabaseBatchForInsert excludes status, risk_score, and registered_at to preserve column-level GRANT INSERT restrictions', () => {
    const inputItem: BatchItem = {
      id: 'DEMO-B2401',
      drugName: 'Paracetamol Infusion IP',
      productSku: 'SKU-PCM-1000IV',
      manufacturerName: 'Arogya Formulation Works',
      manufacturerLotNumber: 'LOT-DEMO-2026-B2401',
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

    const insertPayload = mapBatchItemToDatabaseBatchForInsert(inputItem);

    // Verify allowed fields exist
    expect(insertPayload.id).toBe('DEMO-B2401');
    expect(insertPayload.drug_name).toBe('Paracetamol Infusion IP');
    expect(insertPayload.batch_size_units).toBe(10000);
    expect(insertPayload.current_warehouse).toBe('Bhiwandi Park WH-04');

    // Verify restricted columns are NOT in the insert object
    expect('status' in insertPayload).toBe(false);
    expect('risk_score' in insertPayload).toBe(false);
    expect('registered_at' in insertPayload).toBe(false);
    expect('created_at' in insertPayload).toBe(false);
    expect('updated_at' in insertPayload).toBe(false);
  });

  it('2. registerBatch successfully registers a valid batch and returns under_review status', async () => {
    pharmacyService.resetInventoryToDefault();
    const result = await pharmacyService.registerBatch(validPayload);

    expect(result.id).toBe('DEMO-B2401');
    expect(result.status).toBe('under_review');
    expect(result.drugName).toBe('Paracetamol Infusion IP');
    expect(result.batchSizeUnits).toBe(10000);
  });

  it('3. registerBatch rejects invalid input (validation failure) before database invocation', async () => {
    const invalidPayload: RegisterBatchInput = {
      ...validPayload,
      batchId: '', // invalid empty ID
      quantityReceived: -50, // invalid negative quantity
    };

    await expect(pharmacyService.registerBatch(invalidPayload)).rejects.toThrow();
  });

  it('4. registerBatch rejects duplicate batch ID (DEMO-B2401) on second registration attempt', async () => {
    pharmacyService.resetInventoryToDefault();
    await pharmacyService.registerBatch(validPayload);

    await expect(pharmacyService.registerBatch(validPayload)).rejects.toThrow(
      /already exists in inventory/
    );
  });

  it('5. mapDatabaseBatchToBatchItem correctly parses database response row with DB defaults', () => {
    const dbRow = {
      id: 'DEMO-B2401',
      drug_name: 'Paracetamol Infusion IP',
      product_sku: 'SKU-PCM-1000IV',
      manufacturer_name: 'Arogya Formulation Works',
      manufacturer_lot_number: 'LOT-DEMO-2026-B2401',
      dosage_form: 'Intravenous Infusion (100ml)',
      strength: '10 mg/ml',
      batch_size_units: 10000,
      received_quantity: 10000,
      manufacturing_date: '2026-09-01',
      expiry_date: '2028-09-01',
      storage_condition: 'Controlled Room Temp',
      current_warehouse: 'Bhiwandi Park WH-04',
      status: 'under_review' as const,
      risk_score: 0,
      active_ingredients: 'Paracetamol IP',
      barcode_value: '8901234567890',
      qr_code_url: null,
      registered_at: '2026-10-10 08:00:00+00',
      notes: 'Inserted via RLS compliant payload',
      estimated_monthly_sales_rate: null,
      supplier_return_deadline: null,
      supplier_return_policy_days: null,
    };

    const item = mapDatabaseBatchToBatchItem(dbRow);
    expect(item.id).toBe('DEMO-B2401');
    expect(item.status).toBe('under_review');
    expect(item.riskScore).toBe(0);
    expect(item.registeredAt).toBe('2026-10-10 08:00:00+00');
  });
});

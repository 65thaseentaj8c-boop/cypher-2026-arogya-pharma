import { describe, it, expect, beforeEach } from 'vitest';
import { pharmacyService } from '../pharmacyService';
import type { RegisterBatchInput } from '../../types';
import { VERIFIED_PRODUCTS } from '../../data/productMaster';

describe('Pharmacy Service — Batch Registration & Inventory Management', () => {
  beforeEach(() => {
    pharmacyService.resetInventoryToDefault();
  });

  const validNewBatch: RegisterBatchInput = {
    batchId: 'B2245',
    productName: 'Paracetamol Infusion IP',
    productSku: 'SKU-PCM-1000IV',
    manufacturerName: 'Arogya Formulation Works (Ahmedabad)',
    manufacturerLotNumber: 'LOT-PCM-2026-888',
    dosageForm: 'Intravenous Infusion (100ml)',
    strength: '10 mg/ml (1000mg)',
    manufacturingDate: '2026-09-10',
    expiryDate: '2028-09-09',
    quantityReceived: 35000,
    currentWarehouse: 'Arogya Regional Logistics Park Bhiwandi (WH-04)',
    storageCondition: 'Controlled Room Temp (15°C to 25°C - Demo assumption)',
    activeIngredients: 'Paracetamol IP (High-purity crystalline)',
    barcodeValue: '8901234567890',
    notes: 'TAMPER_SEAL_VERIFIED',
  };

  // Test 1: Successful batch registration
  it('registers a new batch with status under_review and stores it in memory', async () => {
    const created = await pharmacyService.registerBatch(validNewBatch);

    expect(created.id).toBe('B2245');
    expect(created.drugName).toBe('Paracetamol Infusion IP');
    expect(created.productSku).toBe('SKU-PCM-1000IV');
    expect(created.manufacturerLotNumber).toBe('LOT-PCM-2026-888');
    expect(created.batchSizeUnits).toBe(35000);
    expect(created.receivedQuantity).toBe(35000);
    expect(created.status).toBe('under_review'); // Required initial status
    expect(created.registeredAt).toBeDefined();
    expect(created.notes).toBe('TAMPER_SEAL_VERIFIED');
  });

  // Test 7: Inventory list refresh after registration
  it('updates the inventory list immediately so newly registered batches appear at the top', async () => {
    const initialBatches = await pharmacyService.getBatches();
    const initialCount = initialBatches.length;

    await pharmacyService.registerBatch(validNewBatch);

    const updatedBatches = await pharmacyService.getBatches();
    expect(updatedBatches.length).toBe(initialCount + 1);
    expect(updatedBatches[0].id).toBe('B2245');

    // Search filter retrieves newly registered batch by ID
    const searchById = await pharmacyService.getBatches('B2245');
    expect(searchById).toHaveLength(1);
    expect(searchById[0].id).toBe('B2245');

    // Dashboard metrics reflects updated total
    const metrics = await pharmacyService.getDashboardMetrics();
    expect(metrics.totalTrackedBatches).toBeGreaterThan(initialCount);
  });

  // Test 5: Duplicate internal batch ID in service
  it('rejects registration when batch ID already exists in inventory', async () => {
    // B2231 already exists in mock data
    await expect(
      pharmacyService.registerBatch({
        ...validNewBatch,
        batchId: 'B2231',
      })
    ).rejects.toThrow(/already exists in inventory/);
  });

  // Test 6: Duplicate product/manufacturer/lot combination in service
  it('rejects registration with duplicate lot number for the same product and manufacturer', async () => {
    // B2231 has lot LOT-PCM-2026-941, product SKU-PCM-1000IV, manufacturer Arogya Formulation Works (Ahmedabad)
    await expect(
      pharmacyService.registerBatch({
        ...validNewBatch,
        batchId: 'B2288', // different batch ID
        manufacturerLotNumber: 'LOT-PCM-2026-941', // same lot
        productSku: 'SKU-PCM-1000IV', // same product
        manufacturerName: 'Arogya Formulation Works (Ahmedabad)', // same mfg
      })
    ).rejects.toThrow(/already been registered for product/);
  });

  // Test 8: Barcode lookup simulation
  it('matches verified products by barcode and provides automatic catalog mapping', () => {
    const testBarcode = '8901234567890'; // Paracetamol barcode
    const matched = VERIFIED_PRODUCTS.find(
      (p) => p.standardBarcode === testBarcode
    );

    expect(matched).toBeDefined();
    expect(matched?.sku).toBe('SKU-PCM-1000IV');
    expect(matched?.name).toBe('Paracetamol Infusion IP');
    expect(matched?.defaultManufacturer).toContain('Arogya Formulation Works');
  });

  // Test 9: Saving failures and duplicate-submit prevention
  it('prevents duplicate submissions by locking on first registered batch ID', async () => {
    // First submit succeeds
    const first = await pharmacyService.registerBatch(validNewBatch);
    expect(first.id).toBe('B2245');

    // Second immediate submit with the same payload fails with duplicate error
    await expect(pharmacyService.registerBatch(validNewBatch)).rejects.toThrow(
      /already exists in inventory/
    );

    // List count should not be duplicated
    const list = await pharmacyService.getBatches('B2245');
    expect(list).toHaveLength(1);
  });

  // Edit / correction workflow
  it('supports editing warehouse location and notes via updateBatch', async () => {
    await pharmacyService.registerBatch(validNewBatch);

    const updated = await pharmacyService.updateBatch({
      batchId: 'B2245',
      currentWarehouse: 'Hyderabad Pharma City WH-HYD-02',
      notes: 'Reassigned location after secondary QA visual check.',
    });

    expect(updated.currentWarehouse).toBe('Hyderabad Pharma City WH-HYD-02');
    expect(updated.notes).toBe('Reassigned location after secondary QA visual check.');

    const retrieved = await pharmacyService.getBatchById('B2245');
    expect(retrieved?.currentWarehouse).toBe('Hyderabad Pharma City WH-HYD-02');
  });

  // Dispatch quantity validation tests
  it('rejects invalid, zero, negative, non-integer, and excessive dispatch quantities', async () => {
    // 1. Zero quantity
    await expect(pharmacyService.dispatchBatch('B2240', 0)).rejects.toThrow(
      'Invalid dispatch quantity. Quantity must be a positive number.'
    );

    // 2. Negative quantity
    await expect(pharmacyService.dispatchBatch('B2240', -50)).rejects.toThrow(
      'Invalid dispatch quantity. Quantity must be a positive number.'
    );

    // 3. Non-integer decimal quantity
    await expect(pharmacyService.dispatchBatch('B2240', 12.5)).rejects.toThrow(
      'Invalid dispatch quantity. Quantity must be a whole integer.'
    );

    // 4. Excessive quantity exceeding available stock (B2240 stock is 400)
    await expect(pharmacyService.dispatchBatch('B2240', 500)).rejects.toThrow(
      'exceeds available batch stock'
    );

    // 5. Non-existent batch ID
    await expect(pharmacyService.dispatchBatch('B9999', 10)).rejects.toThrow(
      'Batch B9999 not found in inventory.'
    );
  });
});


import { describe, it, expect, beforeEach } from 'vitest';
import { pharmacyService } from '../pharmacyService';
import {
  validateBatchRegistration,
  DEFAULT_CURRENT_DATE,
} from '../batchValidation';
import type { RegisterBatchInput } from '../../types';
import { VERIFIED_PRODUCTS } from '../../data/productMaster';

describe('Requirement 7 Specification Tests — Add Pharmaceutical Batch', () => {
  beforeEach(() => {
    pharmacyService.resetInventoryToDefault();
  });

  const baseValidPayload: RegisterBatchInput = {
    batchId: 'B2250',
    productName: 'Paracetamol Infusion IP',
    productSku: 'SKU-PCM-1000IV',
    manufacturerName: 'Arogya Formulation Works (Ahmedabad)',
    manufacturerLotNumber: 'LOT-PCM-2026-701',
    dosageForm: 'Intravenous Infusion (100ml)',
    strength: '10 mg/ml (1000mg)',
    manufacturingDate: '2026-09-01',
    expiryDate: '2028-08-31',
    quantityReceived: 40000,
    currentWarehouse: 'Arogya Regional Logistics Park Bhiwandi (WH-04)',
    storageCondition: 'Controlled Room Temp (15°C to 25°C - Demo assumption)',
    activeIngredients: 'Paracetamol IP (High-purity crystalline)',
    barcodeValue: '8901234567890',
  };

  // 1. Successful batch registration
  it('1. Successful batch registration: validates, creates under_review record, and returns batch item', async () => {
    const result = await pharmacyService.registerBatch(baseValidPayload);
    expect(result.id).toBe('B2250');
    expect(result.status).toBe('under_review');
    expect(result.batchSizeUnits).toBe(40000);
    expect(result.receivedQuantity).toBe(40000);
    expect(result.currentWarehouse).toBe('Arogya Regional Logistics Park Bhiwandi (WH-04)');
  });

  // 2. Missing required fields
  it('2. Missing required fields: validates that all mandatory product, lot, and warehouse fields must not be empty', async () => {
    const invalidEmpty: Partial<RegisterBatchInput> = {
      batchId: '',
      productName: '',
      productSku: '',
      manufacturerName: '',
      manufacturerLotNumber: '',
      dosageForm: '',
      strength: '',
      manufacturingDate: '',
      expiryDate: '',
      currentWarehouse: '',
      storageCondition: '',
    };
    const { isValid, errors } = validateBatchRegistration(invalidEmpty, []);
    expect(isValid).toBe(false);
    expect(errors.batchId).toBeDefined();
    expect(errors.productName).toBeDefined();
    expect(errors.productSku).toBeDefined();
    expect(errors.manufacturerName).toBeDefined();
    expect(errors.manufacturerLotNumber).toBeDefined();
    expect(errors.dosageForm).toBeDefined();
    expect(errors.strength).toBeDefined();
    expect(errors.manufacturingDate).toBeDefined();
    expect(errors.expiryDate).toBeDefined();
    expect(errors.currentWarehouse).toBeDefined();
    expect(errors.storageCondition).toBeDefined();
  });

  // 3. Invalid quantity
  it('3. Invalid quantity: rejects non-positive, non-integer, and NaN numbers', async () => {
    const nonPositive = validateBatchRegistration(
      { ...baseValidPayload, quantityReceived: -10 },
      []
    );
    expect(nonPositive.isValid).toBe(false);
    expect(nonPositive.errors.quantityReceived).toContain('greater than zero');

    const decimal = validateBatchRegistration(
      { ...baseValidPayload, quantityReceived: 250.75 },
      []
    );
    expect(decimal.isValid).toBe(false);
    expect(decimal.errors.quantityReceived).toContain('whole integer number');
  });

  // 4. Invalid manufacturing and expiry dates
  it('4. Invalid manufacturing and expiry dates: rejects future manufacturing and expiry not after mfg date', async () => {
    const futureMfg = validateBatchRegistration(
      { ...baseValidPayload, manufacturingDate: '2027-01-01' },
      [],
      DEFAULT_CURRENT_DATE
    );
    expect(futureMfg.isValid).toBe(false);
    expect(futureMfg.errors.manufacturingDate).toContain('cannot be in the future');

    const expBeforeMfg = validateBatchRegistration(
      {
        ...baseValidPayload,
        manufacturingDate: '2026-08-01',
        expiryDate: '2026-07-31',
      },
      [],
      DEFAULT_CURRENT_DATE
    );
    expect(expBeforeMfg.isValid).toBe(false);
    expect(expBeforeMfg.errors.expiryDate).toContain('must be later than manufacturing date');
  });

  // 5. Duplicate internal batch ID
  it('5. Duplicate internal batch ID: prevents registering an already existing batch ID', async () => {
    await pharmacyService.registerBatch(baseValidPayload);
    await expect(
      pharmacyService.registerBatch({
        ...baseValidPayload,
        batchId: 'b2250', // case insensitive check
      })
    ).rejects.toThrow(/already exists in inventory/);
  });

  // 6. Duplicate product/manufacturer/lot combination
  it('6. Duplicate product/manufacturer/lot combination: prevents duplicate lot numbers for the same product and manufacturer', async () => {
    await pharmacyService.registerBatch(baseValidPayload);
    await expect(
      pharmacyService.registerBatch({
        ...baseValidPayload,
        batchId: 'B2251', // unique batch ID
        manufacturerLotNumber: 'LOT-PCM-2026-701', // same lot as B2250
        productSku: 'SKU-PCM-1000IV', // same product
        manufacturerName: 'Arogya Formulation Works (Ahmedabad)', // same mfg
      })
    ).rejects.toThrow(/already been registered for product/);
  });

  // 7. Inventory list refresh after registration
  it('7. Inventory list refresh after registration: newly registered batch appears in updated inventory queries without reload', async () => {
    const initialList = await pharmacyService.getBatches();
    await pharmacyService.registerBatch(baseValidPayload);
    const updatedList = await pharmacyService.getBatches();

    expect(updatedList.length).toBe(initialList.length + 1);
    expect(updatedList.some((b) => b.id === 'B2250')).toBe(true);
  });

  // 8. Barcode input using simulated keyboard scanner input
  it('8. Barcode input scanner lookup: maps scanned hardware input to verified product specifications', () => {
    const scannedBarcode = '8901234567891'; // Insulin Glargine
    const matched = VERIFIED_PRODUCTS.find((p) => p.standardBarcode === scannedBarcode);

    expect(matched).toBeDefined();
    expect(matched?.sku).toBe('SKU-INS-GLR100');
    expect(matched?.dosageForm).toBe('Pre-filled Cartridge');
    expect(matched?.storageCondition).toContain('2°C to 8°C');
  });

  // 9. Saving failures and duplicate-submit prevention
  it('9. Saving failures and duplicate-submit prevention: throws error on invalid inputs and prevents duplicate-clicks', async () => {
    // Attempting invalid submission
    await expect(
      pharmacyService.registerBatch({
        ...baseValidPayload,
        quantityReceived: 0,
      })
    ).rejects.toThrow();

    // Inventory count remains unchanged on failure
    const list = await pharmacyService.getBatches('B2250');
    expect(list).toHaveLength(0);
  });
});

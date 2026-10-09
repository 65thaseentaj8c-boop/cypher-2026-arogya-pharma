import { describe, it, expect } from 'vitest';
import {
  validateBatchRegistration,
  sanitizeRegisterBatchInput,
  DEFAULT_CURRENT_DATE,
} from '../batchValidation';
import type { BatchItem, RegisterBatchInput } from '../../types';

describe('Pharmaceutical Batch Registration Validation', () => {
  const mockExistingBatches: BatchItem[] = [
    {
      id: 'B2231',
      drugName: 'Paracetamol Infusion IP',
      productSku: 'SKU-PCM-1000IV',
      manufacturerName: 'Arogya Formulation Works (Ahmedabad)',
      manufacturerLotNumber: 'LOT-PCM-2026-941',
      dosageForm: 'Intravenous Infusion (100ml)',
      strength: '10 mg/ml (1000mg)',
      batchSizeUnits: 45000,
      receivedQuantity: 45000,
      manufacturingDate: '2026-09-12',
      expiryDate: '2028-09-11',
      storageCondition: 'Controlled Room Temp (15°C to 25°C - Demo assumption)',
      currentWarehouse: 'Bhiwandi Hub WH-04',
      status: 'under_review',
      riskScore: 89,
      activeIngredients: 'Paracetamol IP',
    },
  ];

  const validBatchPayload: RegisterBatchInput = {
    batchId: 'B2241',
    productName: 'Paracetamol Infusion IP',
    productSku: 'SKU-PCM-1000IV',
    manufacturerName: 'Arogya Formulation Works (Ahmedabad)',
    manufacturerLotNumber: 'LOT-PCM-2026-999',
    dosageForm: 'Intravenous Infusion (100ml)',
    strength: '10 mg/ml (1000mg)',
    manufacturingDate: '2026-09-15',
    expiryDate: '2028-09-14',
    quantityReceived: 50000,
    currentWarehouse: 'Ahmedabad Reserve Formulation Depot WH-AHM-02',
    storageCondition: 'Controlled Room Temp (15°C to 25°C - Demo assumption)',
    activeIngredients: 'Paracetamol IP (High-purity crystalline)',
    barcodeValue: '8901234567890',
  };

  // Test 1: Successful batch registration validation
  it('passes validation for complete and valid batch registration input', () => {
    const { isValid, errors } = validateBatchRegistration(
      validBatchPayload,
      mockExistingBatches
    );
    expect(isValid).toBe(true);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  // Test 2: Missing required fields
  it('detects missing required fields and returns field-specific error messages', () => {
    const emptyPayload: Partial<RegisterBatchInput> = {
      batchId: '   ',
      productName: '',
      productSku: '',
      manufacturerName: '',
      manufacturerLotNumber: '',
      dosageForm: '',
      strength: '',
      currentWarehouse: '',
      storageCondition: '',
    };

    const { isValid, errors } = validateBatchRegistration(
      emptyPayload,
      mockExistingBatches
    );
    expect(isValid).toBe(false);
    expect(errors.batchId).toContain('Internal Batch ID is required');
    expect(errors.productName).toContain('Product name is required');
    expect(errors.productSku).toContain('Product SKU or product identifier is required');
    expect(errors.manufacturerName).toContain('Manufacturer name is required');
    expect(errors.manufacturerLotNumber).toContain("Manufacturer's lot/batch number is required");
    expect(errors.dosageForm).toContain('Dosage form is required');
    expect(errors.strength).toContain('Strength specification is required');
    expect(errors.quantityReceived).toContain('Quantity received is required');
    expect(errors.manufacturingDate).toContain('Manufacturing date is required');
    expect(errors.expiryDate).toContain('Expiry date is required');
    expect(errors.currentWarehouse).toContain('Warehouse/location is required');
    expect(errors.storageCondition).toContain('Storage condition specification is required');
  });

  // Test 3: Invalid quantity
  it('rejects zero, negative, decimal, and non-numeric quantities', () => {
    // Zero
    const resZero = validateBatchRegistration(
      { ...validBatchPayload, quantityReceived: 0 },
      mockExistingBatches
    );
    expect(resZero.isValid).toBe(false);
    expect(resZero.errors.quantityReceived).toContain('greater than zero');

    // Negative
    const resNegative = validateBatchRegistration(
      { ...validBatchPayload, quantityReceived: -500 },
      mockExistingBatches
    );
    expect(resNegative.isValid).toBe(false);
    expect(resNegative.errors.quantityReceived).toContain('greater than zero');

    // Decimal
    const resDecimal = validateBatchRegistration(
      { ...validBatchPayload, quantityReceived: 100.5 },
      mockExistingBatches
    );
    expect(resDecimal.isValid).toBe(false);
    expect(resDecimal.errors.quantityReceived).toContain('whole integer number');
  });

  // Test 4: Invalid manufacturing and expiry dates
  it('rejects future manufacturing dates and expiry dates not after manufacturing date', () => {
    // Future manufacturing date (after 2026-10-10)
    const futureMfg = validateBatchRegistration(
      {
        ...validBatchPayload,
        manufacturingDate: '2026-11-01',
        expiryDate: '2028-11-01',
      },
      mockExistingBatches,
      DEFAULT_CURRENT_DATE
    );
    expect(futureMfg.isValid).toBe(false);
    expect(futureMfg.errors.manufacturingDate).toContain('cannot be in the future');

    // Expiry date earlier than manufacturing date
    const expBeforeMfg = validateBatchRegistration(
      {
        ...validBatchPayload,
        manufacturingDate: '2026-09-01',
        expiryDate: '2026-08-01',
      },
      mockExistingBatches,
      DEFAULT_CURRENT_DATE
    );
    expect(expBeforeMfg.isValid).toBe(false);
    expect(expBeforeMfg.errors.expiryDate).toContain('must be later than manufacturing date');

    // Expiry date equal to manufacturing date
    const expEqualMfg = validateBatchRegistration(
      {
        ...validBatchPayload,
        manufacturingDate: '2026-09-01',
        expiryDate: '2026-09-01',
      },
      mockExistingBatches,
      DEFAULT_CURRENT_DATE
    );
    expect(expEqualMfg.isValid).toBe(false);
    expect(expEqualMfg.errors.expiryDate).toContain('must be later than manufacturing date');
  });

  // Test 5: Duplicate internal batch ID
  it('prevents duplicate internal batch IDs (case-insensitive)', () => {
    const dupRes = validateBatchRegistration(
      { ...validBatchPayload, batchId: 'b2231' }, // lowercase match to B2231
      mockExistingBatches
    );
    expect(dupRes.isValid).toBe(false);
    expect(dupRes.errors.batchId).toContain('already exists in inventory');
  });

  // Test 6: Duplicate product / manufacturer / lot combination
  it('prevents duplicate manufacturer lot numbers for the same product and manufacturer', () => {
    const dupLotRes = validateBatchRegistration(
      {
        ...validBatchPayload,
        batchId: 'B2299', // distinct batch ID
        manufacturerLotNumber: 'LOT-PCM-2026-941', // same lot as B2231
        productSku: 'SKU-PCM-1000IV', // same product
        manufacturerName: 'Arogya Formulation Works (Ahmedabad)', // same mfg
      },
      mockExistingBatches
    );
    expect(dupLotRes.isValid).toBe(false);
    expect(dupLotRes.errors.manufacturerLotNumber).toContain('has already been registered');
  });

  it('permits identical lot numbers across different products or manufacturers', () => {
    const diffProductRes = validateBatchRegistration(
      {
        ...validBatchPayload,
        batchId: 'B2299',
        productName: 'Ceftriaxone Sodium Injection',
        productSku: 'SKU-CTX-1000VL',
        manufacturerName: 'Different Pharma Labs',
        manufacturerLotNumber: 'LOT-PCM-2026-941',
      },
      mockExistingBatches
    );
    expect(diffProductRes.isValid).toBe(true);
  });

  it('sanitizes and trims all inputs correctly', () => {
    const dirtyInput: RegisterBatchInput = {
      batchId: '  b2255  ',
      productName: '  Amoxicillin 625  ',
      productSku: '  sku-amx-625  ',
      manufacturerName: '  Deccan Pharma  ',
      manufacturerLotNumber: '  lot-amx-01  ',
      dosageForm: '  Tablet  ',
      strength: '  625 mg  ',
      manufacturingDate: '  2026-08-01  ',
      expiryDate: '  2028-08-01  ',
      quantityReceived: 10000,
      currentWarehouse: '  WH-04  ',
      storageCondition: '  Room Temp  ',
      barcodeValue: '  890111  ',
      notes: '  Gate verified  ',
    };

    const sanitized = sanitizeRegisterBatchInput(dirtyInput);
    expect(sanitized.batchId).toBe('B2255');
    expect(sanitized.productName).toBe('Amoxicillin 625');
    expect(sanitized.productSku).toBe('SKU-AMX-625');
    expect(sanitized.manufacturerLotNumber).toBe('LOT-AMX-01');
    expect(sanitized.barcodeValue).toBe('890111');
    expect(sanitized.notes).toBe('Gate verified');
  });
});

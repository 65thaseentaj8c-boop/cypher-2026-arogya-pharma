import { describe, it, expect } from 'vitest';
import { riskEngine } from '../riskEngine';
import { MOCK_BATCHES, MOCK_ALERTS } from '../../data/mockData';
import { pharmacyService } from '../pharmacyService';
import type { BatchItem } from '../../types';

describe('Risk Engine — Deterministic Rule-Based Checks', () => {
  it('should detect batches expiring before sale (Check A)', () => {
    const results = riskEngine.checkExpiringBeforeSale(MOCK_BATCHES, 90);
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    const expAlert = results.find(r => r.batchId === 'B2224');
    expect(expAlert).toBeDefined();
    expect(expAlert?.ruleId).toBe('RULE-EXP-BEFORE-SALE');
  });

  it('should detect closing supplier return windows (Check B)', () => {
    const results = riskEngine.checkSupplierReturnWindow(MOCK_BATCHES);
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    const supAlert = results.find(r => r.batchId === 'B2229' || r.batchId === 'B2224');
    expect(supAlert).toBeDefined();
    expect(supAlert?.ruleId).toBe('RULE-SUPPLIER-RETURN-WINDOW');
  });

  it('should detect temperature excursion breaches (Check C)', () => {
    const results = riskEngine.checkTemperatureBreaches(MOCK_BATCHES, MOCK_ALERTS);
    expect(results.length).toBeGreaterThan(0);
    const b2231TempAlert = results.find(r => r.batchId === 'B2231');
    expect(b2231TempAlert).toBeDefined();
    expect(b2231TempAlert?.ruleId).toBe('RULE-TEMP-EXCURSION');
  });

  it('should trace recalled batch B2231 customer exposure (Check D)', () => {
    const results = riskEngine.checkRecallCustomerExposure(MOCK_BATCHES);
    const b2231Recall = results.find(r => r.batchId === 'B2231');
    expect(b2231Recall).toBeDefined();
    expect(b2231Recall?.affectedUnits).toBe(820);
    expect(b2231Recall?.severity).toBe('critical');
  });

  it('should identify critical medicine shortages and demand deficit (Check E)', () => {
    const shortages = riskEngine.checkCriticalMedicineShortages(MOCK_BATCHES);
    expect(shortages.length).toBeGreaterThan(0);

    const pcmShortage = shortages.find(s => s.sku === 'SKU-PCM-1000IV');
    expect(pcmShortage).toBeDefined();
    expect(pcmShortage?.isShortage).toBe(true);
    expect(pcmShortage?.deficitUnits).toBe(540); // 940 demand - 400 available
  });

  it('should evaluate FEFO compliance without false positives (Check F)', () => {
    const fefoViolations = riskEngine.checkFEFOViolations(MOCK_BATCHES);
    expect(Array.isArray(fefoViolations)).toBe(true);
    const fefoAlert = fefoViolations.find(r => r.batchId === 'B2232');
    expect(fefoAlert).toBeDefined();
    expect(fefoAlert?.ruleId).toBe('RULE-FEFO-VIOLATION');
  });

  // --- Requirement A: Expiry-Before-Sale detailed cases ---
  describe('Requirement A: Expiry-Before-Sale Rule', () => {
    it('should calculate projected unsold surplus when estimated sales velocity is provided', () => {
      const testBatches: BatchItem[] = [
        {
          id: 'TEST-EXP-01',
          drugName: 'Test Antibiotic Injection',
          productSku: 'SKU-TEST-01',
          batchSizeUnits: 10000,
          expiryDate: '2026-11-09', // 30 days from 2026-10-10
          status: 'released',
          storageCondition: 'Room Temp',
          currentWarehouse: 'Central Depot',
          riskScore: 10,
          activeIngredients: 'Test API',
          dosageForm: 'Injection',
          strength: '500mg',
          manufacturingDate: '2025-11-09',
          estimatedMonthlySalesRate: 1000, // Expected sales: 1000 units in 30 days. Unsold surplus: 9000
        },
      ];

      const results = riskEngine.checkExpiringBeforeSale(testBatches, 90);
      expect(results.length).toBe(1);
      expect(results[0].batchId).toBe('TEST-EXP-01');
      expect(results[0].evidence.some(e => e.includes('9,000 units'))).toBe(true);
    });

    it('should report "Insufficient data" when sales rate is unrecorded', () => {
      const testBatches: BatchItem[] = [
        {
          id: 'TEST-EXP-NODATA',
          drugName: 'Test Missing Sales Rate Drug',
          productSku: 'SKU-TEST-NODATA',
          batchSizeUnits: 5000,
          expiryDate: '2026-11-09', // 30 days
          status: 'released',
          storageCondition: 'Room Temp',
          currentWarehouse: 'Depot A',
          riskScore: 5,
          activeIngredients: 'Test API',
          dosageForm: 'Tablet',
          strength: '100mg',
          manufacturingDate: '2025-11-09',
          // estimatedMonthlySalesRate is undefined
        },
      ];

      const results = riskEngine.checkExpiringBeforeSale(testBatches, 90);
      expect(results.length).toBe(1);
      expect(results[0].evidence.some(e => e.includes('Sales/Demand Rate: Insufficient data'))).toBe(true);
    });

    it('should not flag batches expiring far beyond threshold date', () => {
      const testBatches: BatchItem[] = [
        {
          id: 'TEST-EXP-FAR',
          drugName: 'Long Expiry Drug',
          productSku: 'SKU-FAR-01',
          batchSizeUnits: 5000,
          expiryDate: '2029-10-10', // 3 years away
          status: 'released',
          storageCondition: 'Room Temp',
          currentWarehouse: 'Depot A',
          riskScore: 0,
          activeIngredients: 'Test API',
          dosageForm: 'Tablet',
          strength: '100mg',
          manufacturingDate: '2026-01-01',
          estimatedMonthlySalesRate: 10,
        },
      ];

      const results = riskEngine.checkExpiringBeforeSale(testBatches, 90);
      expect(results.length).toBe(0);
    });
  });

  // --- Requirement B: Supplier Return Window detailed cases ---
  describe('Requirement B: Supplier Return Window Rule', () => {
    it('should detect closing return window with specific deadline date', () => {
      const testBatches: BatchItem[] = [
        {
          id: 'TEST-SUP-01',
          drugName: 'Supplier Return Test Drug',
          productSku: 'SKU-SUP-01',
          batchSizeUnits: 2000,
          expiryDate: '2026-12-01',
          supplierReturnDeadline: '2026-10-25', // 15 days remaining from 2026-10-10
          status: 'released',
          storageCondition: 'Room Temp',
          currentWarehouse: 'Depot B',
          riskScore: 10,
          activeIngredients: 'Test API',
          dosageForm: 'Vial',
          strength: '1g',
          manufacturingDate: '2025-12-01',
          manufacturerName: 'Test Bio Labs',
        },
      ];

      const results = riskEngine.checkSupplierReturnWindow(testBatches);
      expect(results.length).toBe(1);
      expect(results[0].batchId).toBe('TEST-SUP-01');
      expect(results[0].evidence.some(e => e.includes('Eligible — Return Window Closing (15 days remaining)'))).toBe(true);
    });

    it('should detect passed return deadline and flag appropriate eligibility status', () => {
      const testBatches: BatchItem[] = [
        {
          id: 'TEST-SUP-PASSED',
          drugName: 'Expired Return Window Drug',
          productSku: 'SKU-SUP-02',
          batchSizeUnits: 1500,
          expiryDate: '2026-11-15',
          supplierReturnDeadline: '2026-10-01', // Passed 9 days ago
          status: 'released',
          storageCondition: 'Room Temp',
          currentWarehouse: 'Depot B',
          riskScore: 15,
          activeIngredients: 'Test API',
          dosageForm: 'Vial',
          strength: '1g',
          manufacturingDate: '2025-11-15',
          manufacturerName: 'Test Bio Labs',
        },
      ];

      const results = riskEngine.checkSupplierReturnWindow(testBatches);
      expect(results.length).toBe(1);
      expect(results[0].evidence.some(e => e.includes('Deadline Passed (9 days ago)'))).toBe(true);
    });

    it('should not invent return policies for batches with no return policy or deadline', () => {
      const testBatches: BatchItem[] = [
        {
          id: 'TEST-SUP-NONE',
          drugName: 'No Policy Drug',
          productSku: 'SKU-SUP-NONE',
          batchSizeUnits: 1000,
          expiryDate: '2027-01-01',
          status: 'released',
          storageCondition: 'Room Temp',
          currentWarehouse: 'Depot B',
          riskScore: 0,
          activeIngredients: 'Test API',
          dosageForm: 'Tablet',
          strength: '50mg',
          manufacturingDate: '2026-01-01',
        },
      ];

      const results = riskEngine.checkSupplierReturnWindow(testBatches);
      expect(results.length).toBe(0);
    });
  });

  // --- Requirement C: FEFO Violation detailed cases ---
  describe('Requirement C: FEFO Protocol Violation Rule', () => {
    it('should flag FEFO violation when later-expiring batch is dispatched while earlier-expiring eligible batch is available', () => {
      const testBatches: BatchItem[] = [
        {
          id: 'BATCH-EARLY-RELEASED',
          drugName: 'Paracetamol 500mg',
          productSku: 'SKU-PCM-500',
          batchSizeUnits: 5000,
          expiryDate: '2027-01-01', // Earlier expiry
          status: 'released',
          storageCondition: 'Room Temp',
          currentWarehouse: 'Depot A',
          riskScore: 0,
          activeIngredients: 'PCM',
          dosageForm: 'Tablet',
          strength: '500mg',
          manufacturingDate: '2026-01-01',
        },
        {
          id: 'BATCH-LATE-DISPATCHED',
          drugName: 'Paracetamol 500mg',
          productSku: 'SKU-PCM-500',
          batchSizeUnits: 2000,
          expiryDate: '2027-06-01', // Later expiry
          status: 'in_transit', // Dispatched
          storageCondition: 'Room Temp',
          currentWarehouse: 'Transit Fleet',
          riskScore: 0,
          activeIngredients: 'PCM',
          dosageForm: 'Tablet',
          strength: '500mg',
          manufacturingDate: '2026-02-01',
        },
      ];

      const results = riskEngine.checkFEFOViolations(testBatches);
      expect(results.length).toBe(1);
      expect(results[0].batchId).toBe('BATCH-LATE-DISPATCHED');
      expect(results[0].evidence.some(e => e.includes('BATCH-EARLY-RELEASED'))).toBe(true);
    });

    it('should NOT flag FEFO violation if earlier-expiring batch is quarantined, recalled, or zero stock', () => {
      const testBatches: BatchItem[] = [
        {
          id: 'BATCH-EARLY-QUARANTINED',
          drugName: 'Paracetamol 500mg',
          productSku: 'SKU-PCM-500',
          batchSizeUnits: 5000,
          expiryDate: '2027-01-01',
          status: 'quarantined', // Ineligible for dispatch!
          storageCondition: 'Room Temp',
          currentWarehouse: 'Quarantine Bay',
          riskScore: 80,
          activeIngredients: 'PCM',
          dosageForm: 'Tablet',
          strength: '500mg',
          manufacturingDate: '2026-01-01',
        },
        {
          id: 'BATCH-LATE-DISPATCHED',
          drugName: 'Paracetamol 500mg',
          productSku: 'SKU-PCM-500',
          batchSizeUnits: 2000,
          expiryDate: '2027-06-01',
          status: 'in_transit',
          storageCondition: 'Room Temp',
          currentWarehouse: 'Transit Fleet',
          riskScore: 0,
          activeIngredients: 'PCM',
          dosageForm: 'Tablet',
          strength: '500mg',
          manufacturingDate: '2026-02-01',
        },
      ];

      const results = riskEngine.checkFEFOViolations(testBatches);
      expect(results.length).toBe(0); // Valid dispatch because earlier batch is quarantined!
    });
  });

  // --- Duplicate Prevention & UI Alert Integration ---
  describe('UI & Alert Integration & Deduplication', () => {
    it('should return risk alerts with unique IDs and no duplicate entries', async () => {
      const alerts = await pharmacyService.getRiskAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const alertIds = alerts.map(a => a.id);
      const uniqueIds = new Set(alertIds);
      expect(uniqueIds.size).toBe(alertIds.length);

      // Verify required categories exist in alerts list
      const hasExpiry = alerts.some(a => a.riskType === 'Expiry Before Sale Risk');
      const hasSupplier = alerts.some(a => a.riskType === 'Supplier Return Window Closing');
      const hasFEFO = alerts.some(a => a.riskType === 'FEFO Protocol Violation');

      expect(hasExpiry).toBe(true);
      expect(hasSupplier).toBe(true);
      expect(hasFEFO).toBe(true);
    });
  });
});

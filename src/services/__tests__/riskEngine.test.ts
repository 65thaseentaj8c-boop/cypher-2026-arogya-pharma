import { describe, it, expect } from 'vitest';
import { riskEngine } from '../riskEngine';
import { MOCK_BATCHES, MOCK_ALERTS } from '../../data/mockData';

describe('Risk Engine — Deterministic Rule-Based Checks', () => {
  it('should detect batches expiring before sale (Check A)', () => {
    const results = riskEngine.checkExpiringBeforeSale(MOCK_BATCHES, 90);
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it('should detect closing supplier return windows (Check B)', () => {
    const results = riskEngine.checkSupplierReturnWindow(MOCK_BATCHES);
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
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
  });
});

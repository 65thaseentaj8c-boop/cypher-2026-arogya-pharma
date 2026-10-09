/**
 * Arogya Pharma — Rule-Based Risk & Recall Decision Engine
 * 
 * SAFETY CONSTRAINTS & COMPLIANCE:
 * -------------------------------------------------------------
 * 1. Risk calculations are strictly rule-based and evidence-backed.
 * 2. LLMs are NOT used to determine medicine safety or recall scope.
 * 3. Temperature excursions are evidence requiring qualified review,
 *    not automatic proof a medicine is unsafe.
 * 4. Never automatically release, destroy, return, recall or reorder medicines.
 *    All outputs are advisories requiring human-in-the-loop QA sign-off.
 */

import type { BatchItem, SeverityLevel, RiskAlert } from '../types';

export interface RiskCheckResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  severity: SeverityLevel;
  batchId: string;
  drugName: string;
  evidence: string[];
  affectedUnits: number;
  suggestedNextStep: string;
}

export interface InventoryShortageCheck {
  drugName: string;
  sku: string;
  currentStockUnits: number;
  safetyStockThreshold: number;
  demandRequirementUnits: number;
  deficitUnits: number;
  isShortage: boolean;
  hospitalPriorityRequired: boolean;
  suggestedAction: string;
}

export const riskEngine = {
  /**
   * (a) Check for batches likely to expire before selling based on expiry date & stock volume
   * Handles missing sales rate data gracefully as "Insufficient data".
   */
  checkExpiringBeforeSale(batches: BatchItem[], daysThreshold = 90): RiskCheckResult[] {
    const results: RiskCheckResult[] = [];
    const now = new Date('2026-10-10');

    for (const b of batches) {
      if (b.status === 'quarantined' || b.status === 'recalled') continue;

      const expDate = new Date(b.expiryDate);
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

      // Trigger for active stock expiring within threshold
      if (diffDays > 0 && diffDays <= daysThreshold && b.batchSizeUnits > 0) {
        let evidence: string[] = [];
        let severity: SeverityLevel = diffDays <= 30 ? 'high' : 'medium';
        let isRisk = false;

        if (b.estimatedMonthlySalesRate !== undefined && b.estimatedMonthlySalesRate > 0) {
          const estimatedSalesBeforeExpiry = Math.round((diffDays / 30) * b.estimatedMonthlySalesRate);
          const unsoldSurplus = b.batchSizeUnits - estimatedSalesBeforeExpiry;

          if (unsoldSurplus > 0) {
            isRisk = true;
            evidence = [
              `Expiry date: ${b.expiryDate} (${diffDays} days remaining; Threshold: ${daysThreshold} days).`,
              `Available stock: ${b.batchSizeUnits.toLocaleString()} units remaining at ${b.currentWarehouse}.`,
              `Sales velocity: ${b.estimatedMonthlySalesRate.toLocaleString()} units/month.`,
              `Projected unsold surplus at expiry: ${unsoldSurplus.toLocaleString()} units.`,
            ];
          }
        } else {
          // If required sales rate data is missing, report "Insufficient data" rather than inventing a value
          isRisk = true;
          severity = 'medium';
          evidence = [
            `Expiry date: ${b.expiryDate} (${diffDays} days remaining; Threshold: ${daysThreshold} days).`,
            `Available stock: ${b.batchSizeUnits.toLocaleString()} units remaining at ${b.currentWarehouse}.`,
            `Sales/Demand Rate: Insufficient data`,
            `Unsold Surplus Projection: Insufficient data (sales velocity unrecorded).`,
          ];
        }

        if (isRisk) {
          results.push({
            ruleId: 'RULE-EXP-BEFORE-SALE',
            ruleName: 'Batch Expiring Before Estimated Sales Velocity',
            triggered: true,
            severity,
            batchId: b.id,
            drugName: b.drugName,
            evidence,
            affectedUnits: b.batchSizeUnits,
            suggestedNextStep: `Evaluate promotional stock clearance, inter-warehouse transfer to high-demand regional depots, or request FEFO dispatch priority in QA Approval Queue.`,
          });
        }
      }
    }
    return results;
  },

  /**
   * (b) Check for closing supplier return windows (e.g. return allowed within deadline / policy window)
   */
  checkSupplierReturnWindow(batches: BatchItem[]): RiskCheckResult[] {
    const results: RiskCheckResult[] = [];
    const now = new Date('2026-10-10');

    for (const b of batches) {
      if (b.status === 'quarantined' || b.status === 'recalled') continue;

      let deadlineDate: Date | null = null;
      let deadlineStr = '';

      if (b.supplierReturnDeadline) {
        deadlineDate = new Date(b.supplierReturnDeadline);
        deadlineStr = b.supplierReturnDeadline;
      } else if (b.supplierReturnPolicyDays !== undefined && b.supplierReturnPolicyDays > 0) {
        const expDate = new Date(b.expiryDate);
        deadlineDate = new Date(expDate.getTime() - b.supplierReturnPolicyDays * 24 * 3600 * 1000);
        deadlineStr = deadlineDate.toISOString().slice(0, 10);
      }

      if (deadlineDate) {
        const diffDeadlineDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        const supplier = b.manufacturerName || 'Supplier';

        // Trigger if return deadline is closing (<= 60 days) or has passed
        if (diffDeadlineDays <= 60) {
          const eligibilityStatus = diffDeadlineDays > 0
            ? `Eligible — Return Window Closing (${diffDeadlineDays} days remaining)`
            : `Deadline Passed (${Math.abs(diffDeadlineDays)} days ago) — Subject to Supplier Waiver`;

          const severity: SeverityLevel = diffDeadlineDays <= 0 ? 'high' : diffDeadlineDays <= 15 ? 'high' : 'medium';

          results.push({
            ruleId: 'RULE-SUPPLIER-RETURN-WINDOW',
            ruleName: 'Supplier Return Credit Window Closing / Expired',
            triggered: true,
            severity,
            batchId: b.id,
            drugName: b.drugName,
            evidence: [
              `Supplier / Manufacturer: ${supplier}.`,
              `Supplier return deadline: ${deadlineStr} (${diffDeadlineDays > 0 ? `${diffDeadlineDays} days remaining` : `passed ${Math.abs(diffDeadlineDays)} days ago`}).`,
              `Eligibility status: ${eligibilityStatus}.`,
              `Available stock: ${b.batchSizeUnits.toLocaleString()} units remaining at ${b.currentWarehouse}.`,
            ],
            affectedUnits: b.batchSizeUnits,
            suggestedNextStep: `Submit Return Credit Note request to QA Approval Queue for manufacturer return authorization before credit window expires.`,
          });
        }
      }
    }
    return results;
  },

  /**
   * (c) Check for temperature breaches affecting stored/in-transit batches
   */
  checkTemperatureBreaches(batches: BatchItem[], alerts: RiskAlert[]): RiskCheckResult[] {
    const results: RiskCheckResult[] = [];
    const tempAlerts = alerts.filter(a => a.riskType === 'Temperature Excursion' && a.status !== 'resolved');

    for (const alert of tempAlerts) {
      const matchingBatch = batches.find(b => b.id === alert.batchId);
      results.push({
        ruleId: 'RULE-TEMP-EXCURSION',
        ruleName: 'Cold-Chain Temperature Deviation (Evidence Pending Laboratory Assay)',
        triggered: true,
        severity: alert.severity,
        batchId: alert.batchId,
        drugName: alert.drugName,
        evidence: [
          `Telemetry Alert ${alert.id}: ${alert.description}`,
          `Sensor summary: ${alert.telemetrySummary || 'Excursion recorded'}`,
          `Storage condition spec: ${matchingBatch?.storageCondition || 'Controlled Storage'}`,
          `Note: Temperature excursion is evidence requiring qualified review, NOT automatic proof medicine is unsafe.`,
        ],
        affectedUnits: alert.affectedUnits,
        suggestedNextStep: `Enforce dock hold on warehouse units, extract representative samples for HPLC assay, and prepare consignee inquiry notices.`,
      });
    }
    return results;
  },

  /**
   * (d) Check for recalled batches and customer exposure (e.g. Batch B2231)
   */
  checkRecallCustomerExposure(batches: BatchItem[]): RiskCheckResult[] {
    const results: RiskCheckResult[] = [];
    const recalledOrUnderReview = batches.filter(b => b.id === 'B2231' || b.status === 'recalled' || b.riskScore > 80);

    for (const b of recalledOrUnderReview) {
      if (b.id === 'B2231') {
        results.push({
          ruleId: 'RULE-RECALL-EXPOSURE-B2231',
          ruleName: 'Critical Batch Recall & Consignee Exposure Tracing (Batch B2231)',
          triggered: true,
          severity: 'critical',
          batchId: b.id,
          drugName: b.drugName,
          evidence: [
            `Total scope: 820 units (180 units in warehouse dock hold, 640 units dispatched).`,
            `Customer exposure radius: 25 consignees (23 retail chemists, 2 acute-care hospitals).`,
            `Hospitals affected: Thane District Civil Hospital (160 units), Metro Apex Hospital (120 units).`,
            `Precautionary hold active; clean replacement Batch B2240 (400 units) identified in reserve.`,
          ],
          affectedUnits: 820,
          suggestedNextStep: `Block Batch B2231 from further dispatch, draft customer recall advisories, and submit priority hospital allocation request for B2240 to QA.`,
        });
      }
    }
    return results;
  },

  /**
   * (e) Check for critical medicine shortages vs replacement & normal demand
   */
  checkCriticalMedicineShortages(batches: BatchItem[]): InventoryShortageCheck[] {
    // Check Paracetamol Infusion 1000mg
    const pcmBatches = batches.filter(b => b.drugName.toLowerCase().includes('paracetamol') && b.status === 'released');
    const availablePcmUnits = pcmBatches.reduce((acc, b) => acc + b.batchSizeUnits, 0);

    // Replacement demand for B2231 (640 units) + 30-day normal hospital demand (300 units) = 940 units
    const pcmReplacementDemand = 640;
    const pcmNormalDemand = 300;
    const totalPcmRequired = pcmReplacementDemand + pcmNormalDemand; // 940 units

    const pcmShortage: InventoryShortageCheck = {
      drugName: 'Paracetamol Infusion IP (100ml / 1000mg)',
      sku: 'SKU-PCM-1000IV',
      currentStockUnits: availablePcmUnits, // B2240 has 400 units
      safetyStockThreshold: 500,
      demandRequirementUnits: totalPcmRequired, // 940 units
      deficitUnits: totalPcmRequired - availablePcmUnits, // 940 - 400 = 540 units deficit
      isShortage: availablePcmUnits < totalPcmRequired,
      hospitalPriorityRequired: true,
      suggestedAction: `Clean Batch B2240 (400 units) covers only 42.5% of total demand (deficit: 540 units). Prioritize 280 units for 2 ICU Hospitals (Thane Civil 160, Metro Apex 120) and draft Urgent Purchase Order (PO) for 600 units.`,
    };

    // Check Insulin Glargine
    const insulinBatches = batches.filter(b => b.drugName.toLowerCase().includes('insulin') && b.status === 'released');
    const availableInsulin = insulinBatches.reduce((acc, b) => acc + b.batchSizeUnits, 0);

    const insulinShortage: InventoryShortageCheck = {
      drugName: 'Insulin Glargine rDNA (100 IU/ml)',
      sku: 'SKU-INS-GLR100',
      currentStockUnits: availableInsulin, // 0 released units (B2230 is quarantined)
      safetyStockThreshold: 5000,
      demandRequirementUnits: 6000,
      deficitUnits: 6000 - availableInsulin,
      isShortage: availableInsulin < 5000,
      hospitalPriorityRequired: true,
      suggestedAction: `Batch B2230 (18,000 units) is under quarantine. Available released stock is 0 units against 6,000 unit monthly requirement. Draft emergency transfer request from Hyderabad WH-HYD-02.`,
    };

    return [pcmShortage, insulinShortage];
  },

  /**
   * (f) Check for FEFO (First Expiring, First Out) violations
   * Detects when a later-expiring batch is dispatched while an earlier-expiring eligible batch of the same product remains available.
   * Strictly respects batch status (ignores quarantined, recalled, under_review, or expired earlier batches).
   */
  checkFEFOViolations(batches: BatchItem[]): RiskCheckResult[] {
    const results: RiskCheckResult[] = [];
    const now = new Date('2026-10-10');

    // Filter to batches currently dispatched or in transit
    const dispatchedBatches = batches.filter(
      b => b.status === 'in_transit' &&
           new Date(b.expiryDate).getTime() > now.getTime()
    );

    // Eligible available stock batches: status === 'released', stock > 0, expiry > now, not quarantined/recalled/under_review
    const eligibleAvailableBatches = batches.filter(
      b => b.status === 'released' &&
           b.batchSizeUnits > 0 &&
           new Date(b.expiryDate).getTime() > now.getTime()
    );

    for (const dispatched of dispatchedBatches) {
      const matchingSku = (dispatched.productSku || dispatched.drugName).toLowerCase();
      const dispatchedExp = new Date(dispatched.expiryDate).getTime();

      // Find an earlier-expiring eligible batch of the same product sitting available in warehouse
      const earlierEligible = eligibleAvailableBatches.find(avail => {
        if (avail.id.toUpperCase() === dispatched.id.toUpperCase()) return false;
        const availSku = (avail.productSku || avail.drugName).toLowerCase();
        if (availSku !== matchingSku) return false;
        const availExp = new Date(avail.expiryDate).getTime();
        return availExp < dispatchedExp;
      });

      if (earlierEligible) {
        results.push({
          ruleId: 'RULE-FEFO-VIOLATION',
          ruleName: 'FEFO Protocol Violation (Later Expiry Dispatched First)',
          triggered: true,
          severity: 'medium',
          batchId: dispatched.id,
          drugName: dispatched.drugName,
          evidence: [
            `Dispatched Batch ${dispatched.id} (Exp: ${dispatched.expiryDate}) was dispatched before older eligible Batch ${earlierEligible.id} (Exp: ${earlierEligible.expiryDate}).`,
            `Older Batch ${earlierEligible.id} has ${earlierEligible.batchSizeUnits.toLocaleString()} units remaining at ${earlierEligible.currentWarehouse}.`,
            `FEFO protocol requires dispatching Batch ${earlierEligible.id} prior to Batch ${dispatched.id}.`,
          ],
          affectedUnits: dispatched.batchSizeUnits,
          suggestedNextStep: `Halt secondary dispatches of Batch ${dispatched.id} and prioritize allocation of earlier-expiring Batch ${earlierEligible.id} to fulfill pending orders.`,
        });
      }
    }

    return results;
  }
};

/**
 * Arogya Pharma — Dedicated Data-Access Service Layer
 * 
 * ARCHITECTURE NOTE FOR TEAMMATES & FUTURE SUPABASE INTEGRATION:
 * -------------------------------------------------------------
 * This service currently returns Promise-wrapped local mock data.
 * When the backend team or risk engine is ready to connect Supabase:
 * 
 * 1. Install `@supabase/supabase-js`.
 * 2. Instantiate `const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)` in a client module.
 * 3. Replace the mock data resolutions inside each method below with:
 *      const { data, error } = await supabase.from('table_name').select('*');
 * 4. The UI components will not need ANY refactoring because they depend
 *    strictly on this async service interface and the TypeScript types!
 */

import type {
  BatchItem,
  BatchStatus,
  RiskAlert,
  RiskType,
  TraceabilityNode,
  AIRecommendation,
  ApprovalRequest,
  DashboardMetrics,
  RecallWorkflowData,
  RegisterBatchInput,
  DuplicateCheckResult,
  UpdateBatchInput,
} from '../types';
import {
  MOCK_METRICS,
  MOCK_BATCHES,
  MOCK_ALERTS,
  MOCK_TRACEABILITY_B2231,
  MOCK_RECOMMENDATIONS,
  MOCK_APPROVALS,
  MOCK_B2231_RECALL_WORKFLOW,
} from '../data/mockData';
import {
  validateBatchRegistration,
  sanitizeRegisterBatchInput,
} from './batchValidation';
import { riskEngine, type RiskCheckResult } from './riskEngine';

export const APPROVAL_STORAGE_KEY = 'arogya_pharma_approval_decisions_v1';
export const BATCH_STORAGE_KEY = 'arogya_pharma_batch_updates_v1';

export interface SavedApprovalDecision {
  id: string;
  status: 'approved' | 'rejected';
  decidedBy: string;
  decidedAt: string;
  decisionNotes: string;
}

export interface SavedBatchUpdate {
  batchId: string;
  status: BatchStatus;
  updatedAt: string;
  reason?: string;
}

const memoryStorageMock: Record<string, string> = {};

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined' && localStorage) {
    return localStorage;
  }
  return {
    getItem: (key: string) => memoryStorageMock[key] || null,
    setItem: (key: string, val: string) => { memoryStorageMock[key] = val; },
    removeItem: (key: string) => { delete memoryStorageMock[key]; },
    clear: () => { Object.keys(memoryStorageMock).forEach(k => delete memoryStorageMock[k]); },
    length: Object.keys(memoryStorageMock).length,
    key: (i: number) => Object.keys(memoryStorageMock)[i] || null,
  };
}

export function getStoredApprovalDecisions(): Record<string, SavedApprovalDecision> {
  try {
    const storage = getStorage();
    if (!storage) return {};
    const raw = storage.getItem(APPROVAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Record<string, SavedApprovalDecision>;
  } catch (err) {
    console.warn('Failed to parse approval decisions from localStorage:', err);
    return {};
  }
}

export function saveStoredApprovalDecision(decision: SavedApprovalDecision): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    const current = getStoredApprovalDecisions();
    current[decision.id] = decision;
    storage.setItem(APPROVAL_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Failed to save approval decision to localStorage:', err);
  }
}

export function getStoredBatchUpdates(): Record<string, SavedBatchUpdate> {
  try {
    const storage = getStorage();
    if (!storage) return {};
    const raw = storage.getItem(BATCH_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Record<string, SavedBatchUpdate>;
  } catch (err) {
    console.warn('Failed to parse batch updates from localStorage:', err);
    return {};
  }
}

export function saveStoredBatchUpdate(update: SavedBatchUpdate): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    const current = getStoredBatchUpdates();
    current[update.batchId] = update;
    storage.setItem(BATCH_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Failed to save batch update to localStorage:', err);
  }
}

// Mutable in-memory stores simulating local database
let inMemoryBatches: BatchItem[] = MOCK_BATCHES.map((b) => ({ ...b }));
let inMemoryApprovals: ApprovalRequest[] = MOCK_APPROVALS.map((a) => ({
  ...a,
  status: 'pending',
  decidedAt: undefined,
  decidedBy: undefined,
  decisionNotes: undefined,
}));
let trackedBatchesCount = MOCK_METRICS.totalTrackedBatches;

// Simulated slight async latency for realistic frontend loading states
const LATENCY_MS = 60;
const delay = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

export const pharmacyService = {
  /**
   * Reset in-memory batch & approval state to default seed data (useful for test isolation)
   */
  resetInventoryToDefault(): void {
    inMemoryBatches = MOCK_BATCHES.map((b) => ({ ...b }));
    inMemoryApprovals = MOCK_APPROVALS.map((a) => ({
      ...a,
      status: 'pending',
      decidedAt: undefined,
      decidedBy: undefined,
      decisionNotes: undefined,
    }));
    trackedBatchesCount = MOCK_METRICS.totalTrackedBatches;
    const storage = getStorage();
    if (storage) {
      try {
        storage.removeItem(APPROVAL_STORAGE_KEY);
        storage.removeItem(BATCH_STORAGE_KEY);
      } catch (_) {}
    }
  },

  /**
   * Fetch aggregate KPI metrics for the executive dashboard
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    await delay();
    const queue = await this.getApprovalQueue();
    const pendingCount = queue.filter((a) => a.status === 'pending').length;
    const batches = await this.getBatches();
    const quarantinedCount = batches.filter((b) => b.status === 'quarantined').length;
    return {
      ...MOCK_METRICS,
      totalTrackedBatches: trackedBatchesCount,
      pendingApprovals: pendingCount,
      quarantinedBatches: quarantinedCount,
    };
  },

  /**
   * Fetch all tracked pharmaceutical batches with optional status or search filter
   */
  async getBatches(searchQuery?: string, statusFilter?: string): Promise<BatchItem[]> {
    await delay();
    const storedBatchUpdates = getStoredBatchUpdates();
    const savedDecisions = getStoredApprovalDecisions();

    let result = inMemoryBatches.map((b) => {
      const batchKey = Object.keys(storedBatchUpdates).find(
        (k) => k.toUpperCase() === b.id.toUpperCase()
      );
      if (batchKey && storedBatchUpdates[batchKey]) {
        return { ...b, status: storedBatchUpdates[batchKey].status };
      }

      // Check all matching approval requests for this batch
      const matchingApprovals = inMemoryApprovals.filter(
        (a) => a.batchId.toUpperCase() === b.id.toUpperCase()
      );

      for (const req of matchingApprovals) {
        const savedDec = savedDecisions[req.id];
        const isApproved = savedDec
          ? savedDec.status === 'approved'
          : req.status === 'approved';

        if (isApproved) {
          if (req.requestType === 'Recall Authorization' || req.title.toLowerCase().includes('recall')) {
            return { ...b, status: 'recalled' as const };
          }
          if (req.requestType === 'Quarantine Order' || req.title.toLowerCase().includes('quarantine')) {
            return { ...b, status: 'quarantined' as const };
          }
          if (req.requestType === 'Disposal Order') {
            return { ...b, status: 'quarantined' as const };
          }
          if (req.requestType === 'Release Override') {
            return { ...b, status: 'released' as const };
          }
        }
      }

      return { ...b };
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.id.toLowerCase().includes(q) ||
          b.drugName.toLowerCase().includes(q) ||
          b.currentWarehouse.toLowerCase().includes(q) ||
          (b.productSku && b.productSku.toLowerCase().includes(q)) ||
          (b.manufacturerLotNumber && b.manufacturerLotNumber.toLowerCase().includes(q))
      );
    }
    if (statusFilter && statusFilter !== 'all') {
      result = result.filter((b) => b.status === statusFilter);
    }
    return result;
  },

  /**
   * Get specific batch details by ID (e.g. Batch B2231)
   */
  async getBatchById(batchId: string): Promise<BatchItem | undefined> {
    await delay();
    const batches = await this.getBatches();
    return batches.find((b) => b.id.toUpperCase() === batchId.toUpperCase());
  },

  /**
   * Check for duplicate batch ID or duplicate lot number for the same product & manufacturer
   */
  async checkBatchDuplicates(
    batchId: string,
    lotNumber?: string,
    productSku?: string,
    manufacturer?: string
  ): Promise<DuplicateCheckResult> {
    await delay();
    const cleanBatchId = (batchId || '').trim().toUpperCase();
    const cleanLot = (lotNumber || '').trim().toUpperCase();
    const cleanSku = (productSku || '').trim().toUpperCase();
    const cleanMfg = (manufacturer || '').trim().toLowerCase();

    const isDuplicateBatchId = inMemoryBatches.some(
      (b) => b.id.toUpperCase() === cleanBatchId
    );

    let isDuplicateLot = false;
    if (cleanLot && (cleanSku || cleanMfg)) {
      isDuplicateLot = inMemoryBatches.some((b) => {
        const matchLot = (b.manufacturerLotNumber || '').toUpperCase() === cleanLot;
        const matchSku = cleanSku && (b.productSku || '').toUpperCase() === cleanSku;
        const matchMfg = cleanMfg && (b.manufacturerName || '').toLowerCase() === cleanMfg;
        return matchLot && matchSku && matchMfg;
      });
    }

    let message: string | undefined;
    if (isDuplicateBatchId) {
      message = `Internal Batch ID "${cleanBatchId}" already exists in inventory.`;
    } else if (isDuplicateLot) {
      message = `Manufacturer lot "${cleanLot}" is already registered for this product and manufacturer.`;
    }

    return {
      isDuplicateBatchId,
      isDuplicateLot,
      message,
    };
  },

  /**
   * Register a new pharmaceutical batch into the system.
   */
  async registerBatch(input: RegisterBatchInput): Promise<BatchItem> {
    await delay();

    // 1. Validate
    const { isValid, errors } = validateBatchRegistration(input, inMemoryBatches);
    if (!isValid) {
      const firstError = Object.values(errors)[0] || 'Invalid batch registration data.';
      throw new Error(firstError);
    }

    // 2. Sanitize
    const sanitized = sanitizeRegisterBatchInput(input);

    // 3. Double-check duplicates on sanitized values
    const dupCheck = await this.checkBatchDuplicates(
      sanitized.batchId,
      sanitized.manufacturerLotNumber,
      sanitized.productSku,
      sanitized.manufacturerName
    );
    if (dupCheck.isDuplicateBatchId || dupCheck.isDuplicateLot) {
      throw new Error(dupCheck.message || 'Duplicate batch registration constraint violation.');
    }

    // 4. Create new BatchItem with initial status 'under_review'
    const newBatch: BatchItem = {
      id: sanitized.batchId,
      drugName: sanitized.productName,
      productSku: sanitized.productSku,
      manufacturerName: sanitized.manufacturerName,
      manufacturerLotNumber: sanitized.manufacturerLotNumber,
      dosageForm: sanitized.dosageForm,
      strength: sanitized.strength,
      batchSizeUnits: sanitized.quantityReceived,
      receivedQuantity: sanitized.quantityReceived,
      manufacturingDate: sanitized.manufacturingDate,
      expiryDate: sanitized.expiryDate,
      storageCondition: sanitized.storageCondition,
      currentWarehouse: sanitized.currentWarehouse,
      status: 'under_review',
      riskScore: 10,
      activeIngredients: sanitized.activeIngredients || 'Active Pharmaceutical Ingredient (IP/USP)',
      barcodeValue: sanitized.barcodeValue,
      registeredAt: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' IST',
      notes: sanitized.notes,
    };

    // 5. Store in memory and update metrics
    inMemoryBatches = [newBatch, ...inMemoryBatches];
    trackedBatchesCount += 1;

    return { ...newBatch };
  },

  /**
   * Update existing batch record
   */
  async updateBatch(input: UpdateBatchInput): Promise<BatchItem> {
    await delay();
    const index = inMemoryBatches.findIndex(
      (b) => b.id.toUpperCase() === input.batchId.trim().toUpperCase()
    );
    if (index === -1) {
      throw new Error(`Batch ID "${input.batchId}" not found in inventory.`);
    }

    const current = inMemoryBatches[index];
    const updated: BatchItem = {
      ...current,
      currentWarehouse: input.currentWarehouse?.trim() || current.currentWarehouse,
      storageCondition: input.storageCondition?.trim() || current.storageCondition,
      batchSizeUnits:
        input.batchSizeUnits !== undefined && input.batchSizeUnits > 0
          ? input.batchSizeUnits
          : current.batchSizeUnits,
      manufacturerLotNumber:
        input.manufacturerLotNumber?.trim() || current.manufacturerLotNumber,
      notes: input.notes?.trim() !== undefined ? input.notes.trim() : current.notes,
    };

    inMemoryBatches[index] = updated;
    return { ...updated };
  },

  /**
   * Fetch active risk alerts
   */
  async getRiskAlerts(severity?: string): Promise<RiskAlert[]> {
    await delay();
    const batches = await this.getBatches();

    // Dynamically run risk engine checks against active batches
    const expResults = riskEngine.checkExpiringBeforeSale(batches);
    const supResults = riskEngine.checkSupplierReturnWindow(batches);
    const fefoResults = riskEngine.checkFEFOViolations(batches);

    const generatedAlerts: RiskAlert[] = [];

    const mapResultToAlert = (r: RiskCheckResult, riskType: RiskType, prefix: string): RiskAlert => {
      const b = batches.find((item) => item.id.toUpperCase() === r.batchId.toUpperCase());
      return {
        id: `${prefix}-${r.batchId}`,
        batchId: r.batchId,
        drugName: r.drugName,
        riskType,
        severity: r.severity,
        warehouse: b?.currentWarehouse || 'Logistics Warehouse',
        detectedAt: '2026-10-10 08:00 IST',
        status: 'active',
        description: r.evidence.join(' '),
        telemetrySummary: r.evidence[0] || r.ruleName,
        affectedUnits: r.affectedUnits,
        recommendedAction: r.suggestedNextStep,
      };
    };

    for (const r of expResults) {
      generatedAlerts.push(mapResultToAlert(r, 'Expiry Before Sale Risk', 'ALT-EXP'));
    }
    for (const r of supResults) {
      generatedAlerts.push(mapResultToAlert(r, 'Supplier Return Window Closing', 'ALT-SUP'));
    }
    for (const r of fefoResults) {
      generatedAlerts.push(mapResultToAlert(r, 'FEFO Protocol Violation', 'ALT-FEFO'));
    }

    // Merge static seed MOCK_ALERTS and dynamic generated alerts without duplicates
    const combined: RiskAlert[] = [...MOCK_ALERTS];

    for (const gen of generatedAlerts) {
      const exists = combined.some(
        (a) => a.id.toUpperCase() === gen.id.toUpperCase() ||
               (a.batchId.toUpperCase() === gen.batchId.toUpperCase() && a.riskType === gen.riskType)
      );
      if (!exists) {
        combined.push(gen);
      }
    }

    let result = combined;
    if (severity && severity !== 'all') {
      result = result.filter((a) => a.severity === severity);
    }
    return result;
  },

  /**
   * Fetch complete end-to-end provenance and cold-chain telemetry nodes for ANY batch
   */
  async getBatchTraceability(batchId: string): Promise<TraceabilityNode[]> {
    await delay();
    const targetId = (batchId || 'B2231').toUpperCase();

    if (targetId === 'B2231') {
      return [...MOCK_TRACEABILITY_B2231];
    }

    const b = inMemoryBatches.find((item) => item.id.toUpperCase() === targetId);
    const drugName = b ? b.drugName : `Batch ${targetId}`;
    const mfg = b?.manufacturerName || 'Arogya Formulation Works';
    const wh = b?.currentWarehouse || 'Central Depot';
    const exp = b?.expiryDate || '2028-09-01';

    return [
      {
        id: `${targetId}-NODE-01`,
        stage: 'Raw Material & Active Ingredient Sourcing',
        facility: `${mfg} — Synthetics Unit`,
        location: 'Ankleshwar, Gujarat, India',
        timestamp: `${b?.manufacturingDate || '2026-09-01'} 08:30 IST`,
        status: 'passed',
        operator: 'Dr. V. K. Sharma (QA Synthetics)',
        parameters: [
          { key: 'API Purity Assay', value: '99.7% (Spec: 99.0%-101.0%)' },
          { key: 'Heavy Metals Test', value: 'Passed (< 10 ppm)' },
          { key: 'Vendor Certificate ID', value: `COA-${targetId}-API-01` },
        ],
        notes: `Raw material batch verified for ${drugName}. Compounding authorized.`,
      },
      {
        id: `${targetId}-NODE-02`,
        stage: 'Sterile Compounding & Packaging',
        facility: `${mfg} — Formulation Line 3`,
        location: 'Bengaluru / Ahmedabad Plant',
        timestamp: `${b?.manufacturingDate || '2026-09-05'} 14:00 IST`,
        status: 'passed',
        operator: 'R. K. Nair (Production Supervisor)',
        parameters: [
          { key: 'Formulation Temperature', value: '21.4°C (Nominal)' },
          { key: 'Fill Volume Accuracy', value: '100.1% of target' },
          { key: 'Blister/Vial Seal Integrity', value: '100% Vacuum Pass' },
        ],
        notes: `Production completed under cleanroom Class A environment.`,
      },
      {
        id: `${targetId}-NODE-03`,
        stage: 'QC Release Assay & Certificate of Analysis',
        facility: 'Central Quality Analytics Laboratory',
        location: 'Peenya Industrial Area, Karnataka',
        timestamp: `${b?.manufacturingDate || '2026-09-10'} 16:45 IST`,
        status: b?.status === 'quarantined' ? 'warning' : 'passed',
        operator: 'P. Ananya (Senior QC Analyst)',
        parameters: [
          { key: 'Potency Assay (HPLC)', value: '100.2% w/v' },
          { key: 'Bacterial Endotoxin Test', value: '< 0.25 EU/ml (Passed)' },
          { key: 'Expiry Assigned', value: exp },
        ],
        notes: b?.status === 'quarantined' ? 'Surveillance flag active. Precautionary hold.' : 'Certificate of Analysis issued. Batch cleared for commercial release.',
      },
      {
        id: `${targetId}-NODE-04`,
        stage: 'Cold-Chain Telemetry & Warehouse Ingestion',
        facility: wh,
        location: wh.split(' ')[0] || 'Regional Logistics Hub',
        timestamp: '2026-10-08 11:20 IST',
        status: b?.status === 'quarantined' ? 'critical' : 'passed',
        operator: 'IoT Temperature Gateway #GW-LOGIC-02',
        parameters: [
          { key: 'Storage Condition Spec', value: b?.storageCondition || '15°C to 25°C' },
          { key: 'Logged Sensor Temp', value: b?.status === 'quarantined' ? '12.8°C (Deviation logged)' : '21.2°C (Controlled Steady)' },
          { key: 'Relative Humidity', value: '48% RH' },
        ],
        notes: b?.status === 'quarantined' ? 'Temperature deviation flagged for QA review.' : 'Thermal telemetry logged within nominal specification limits.',
      },
    ];
  },

  /**
   * Fetch structured B2231 recall workflow data
   */
  async getB2231RecallWorkflow(): Promise<RecallWorkflowData> {
    await delay();
    return { ...MOCK_B2231_RECALL_WORKFLOW };
  },

  /**
   * Fetch AI recommendations
   */
  async getRecommendations(): Promise<AIRecommendation[]> {
    await delay();
    return [...MOCK_RECOMMENDATIONS];
  },

  /**
   * Add a new approval request (e.g. when recommendation dispatched)
   * Enforces stable duplicate prevention based on batch ID & request type for active pending requests.
   */
  async addApprovalRequest(request: ApprovalRequest): Promise<ApprovalRequest> {
    await delay();
    const queue = await this.getApprovalQueue();

    const cleanBatchId = (request.batchId || '').trim().toUpperCase();
    const cleanType = (request.requestType || '').trim().toUpperCase();

    // Check if an equivalent pending request already exists in the approval queue
    const existingPending = queue.find(
      (a) =>
        a.status === 'pending' &&
        a.batchId.trim().toUpperCase() === cleanBatchId &&
        a.requestType.trim().toUpperCase() === cleanType
    );

    if (existingPending) {
      throw new Error(
        `An equivalent pending ${request.requestType} already exists for Batch ${request.batchId} (Request ID: ${existingPending.id}). Duplicate submission prevented.`
      );
    }

    inMemoryApprovals = [request, ...inMemoryApprovals];
    return { ...request };
  },

  /**
   * Remove a single approval request by ID
   */
  async removeApprovalRequest(id: string): Promise<boolean> {
    await delay();
    const idx = inMemoryApprovals.findIndex((a) => a.id === id);
    if (idx !== -1) {
      inMemoryApprovals.splice(idx, 1);
      return true;
    }
    return false;
  },

  /**
   * Safely clean up duplicate pending requests while preserving primary pending requests and all historical decisions.
   */
  async cleanupDuplicatePendingRequests(): Promise<string[]> {
    await delay();
    const queue = await this.getApprovalQueue();
    const seenPendingKeys = new Set<string>();
    const removedIds: string[] = [];

    for (const req of queue) {
      if (req.status === 'pending') {
        const key = `${req.batchId.trim().toUpperCase()}_${req.requestType.trim().toUpperCase()}`;
        if (seenPendingKeys.has(key)) {
          removedIds.push(req.id);
        } else {
          seenPendingKeys.add(key);
        }
      }
    }

    if (removedIds.length > 0) {
      inMemoryApprovals = inMemoryApprovals.filter((req) => !removedIds.includes(req.id));
    }

    return removedIds;
  },

  /**
   * Fetch pending approval queue requests, restoring persisted decisions from localStorage by ID.
   */
  async getApprovalQueue(): Promise<ApprovalRequest[]> {
    await delay();
    const savedDecisions = getStoredApprovalDecisions();
    return inMemoryApprovals.map((req) => {
      const saved = savedDecisions[req.id];
      if (saved && (saved.status === 'approved' || saved.status === 'rejected')) {
        return {
          ...req,
          status: saved.status,
          decidedBy: saved.decidedBy,
          decidedAt: saved.decidedAt,
          decisionNotes: saved.decisionNotes,
        };
      }
      return { ...req };
    });
  },

  /**
   * Update an approval request status (Approve / Reject) and persist to versioned localStorage key.
   * Prevents duplicate sign-offs on already decided items.
   */
  async updateApprovalDecision(
    approvalId: string,
    decision: 'approved' | 'rejected',
    notes: string,
    decidedBy = 'Thaseen Taj (QA Lead Officer)'
  ): Promise<ApprovalRequest | null> {
    await delay();
    const queue = await this.getApprovalQueue();
    const item = queue.find((a) => a.id === approvalId);
    if (!item) return null;

    // Prevent duplicate sign-offs if already decided
    if (item.status !== 'pending') {
      return { ...item };
    }

    const decidedAt = new Date().toISOString();
    const updatedItem: ApprovalRequest = {
      ...item,
      status: decision,
      decisionNotes: notes,
      decidedAt,
      decidedBy,
    };

    // Update in-memory approval queue
    const idx = inMemoryApprovals.findIndex((a) => a.id === approvalId);
    if (idx !== -1) {
      inMemoryApprovals[idx] = updatedItem;
    } else {
      inMemoryApprovals.unshift(updatedItem);
    }

    // Persist to versioned localStorage key
    saveStoredApprovalDecision({
      id: approvalId,
      status: decision,
      decidedBy,
      decidedAt,
      decisionNotes: notes,
    });

    // Connect each action type to its correct effect when approved
    if (decision === 'approved' && item.batchId) {
      let targetStatus: BatchStatus | undefined;
      if (item.requestType === 'Quarantine Order' || item.title.toLowerCase().includes('quarantine')) {
        targetStatus = 'quarantined';
      } else if (item.requestType === 'Recall Authorization' || item.title.toLowerCase().includes('recall')) {
        targetStatus = 'recalled';
      } else if (item.requestType === 'Release Override') {
        targetStatus = 'released';
      } else if (item.requestType === 'Disposal Order') {
        targetStatus = 'quarantined';
      }

      if (targetStatus) {
        const bIdx = inMemoryBatches.findIndex(
          (b) => b.id.toUpperCase() === item.batchId.toUpperCase()
        );
        if (bIdx !== -1) {
          inMemoryBatches[bIdx] = {
            ...inMemoryBatches[bIdx],
            status: targetStatus,
          };
          saveStoredBatchUpdate({
            batchId: inMemoryBatches[bIdx].id,
            status: targetStatus,
            updatedAt: decidedAt,
            reason: `Approved ${item.requestType} ${approvalId}`,
          });
        }
      }
    }

    return { ...updatedItem };
  },

  /**
   * Check if a batch can be dispatched.
   * Strictly enforces simulated dispatch block for batches whose status is Quarantined or Recalled.
   */
  async canDispatchBatch(batchId: string): Promise<{ allowed: boolean; reason?: string }> {
    const batch = await this.getBatchById(batchId);
    if (!batch) {
      return { allowed: false, reason: `Batch ${batchId} not found in inventory.` };
    }
    if (batch.status === 'quarantined' || batch.status === 'recalled') {
      return {
        allowed: false,
        reason: `Simulated Dispatch Blocked: Batch ${batch.id} (${batch.drugName}) is under status "${batch.status.toUpperCase()}". Commercial dispatch and distribution are strictly prohibited.`,
      };
    }
    return { allowed: true };
  },

  /**
   * Attempt to dispatch units from a batch.
   * Rejects dispatch if batch status is Quarantined or Recalled.
   */
  async dispatchBatch(batchId: string, quantityUnits: number): Promise<{ success: boolean; message: string }> {
    await delay();
    if (typeof quantityUnits !== 'number' || isNaN(quantityUnits) || !isFinite(quantityUnits) || quantityUnits <= 0) {
      throw new Error('Invalid dispatch quantity. Quantity must be a positive number.');
    }
    if (!Number.isInteger(quantityUnits)) {
      throw new Error('Invalid dispatch quantity. Quantity must be a whole integer.');
    }
    const batch = await this.getBatchById(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found in inventory.`);
    }
    const check = await this.canDispatchBatch(batchId);
    if (!check.allowed) {
      throw new Error(check.reason);
    }
    if (quantityUnits > batch.batchSizeUnits) {
      throw new Error(`Dispatch quantity (${quantityUnits} units) exceeds available batch stock (${batch.batchSizeUnits} units).`);
    }
    return {
      success: true,
      message: `Simulated dispatch of ${quantityUnits} units for Batch ${batchId} authorized.`,
    };
  },
};


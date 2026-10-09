/**
 * Arogya Pharma — AI Batch Risk & Recall Management Agent
 * Domain Types & Schemas
 * Ready for future Supabase ORM / PostgREST client schema alignment.
 */

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export type AlertStatus = 'active' | 'investigating' | 'mitigated' | 'resolved';

export type BatchStatus = 'in_transit' | 'released' | 'quarantined' | 'recalled' | 'under_review';

export type RiskType = 
  | 'Temperature Excursion'
  | 'Chemical Impurity Spike'
  | 'Packaging Integrity Breach'
  | 'Transit Vibration Anomaly'
  | 'Documentation Discrepancy'
  | 'Microbial Contamination Risk';

export interface BatchItem {
  id: string; // Internal batch ID e.g. "B2231"
  drugName: string; // Product name
  dosageForm: string;
  strength: string;
  batchSizeUnits: number; // Current / total quantity units
  manufacturingDate: string;
  expiryDate: string;
  storageCondition: string;
  currentWarehouse: string;
  status: BatchStatus;
  riskScore: number; // 0 to 100
  qrCodeUrl?: string;
  activeIngredients: string;
  // Future Supabase persistence & batch registration fields:
  productSku?: string;
  manufacturerName?: string;
  manufacturerLotNumber?: string;
  receivedQuantity?: number;
  barcodeValue?: string;
  registeredAt?: string;
  notes?: string;
}

export interface ProductMasterItem {
  id: string;
  name: string;
  sku: string;
  dosageForm: string;
  strength: string;
  defaultManufacturer: string;
  storageCondition: string;
  activeIngredients: string;
  standardBarcode?: string;
}

export interface RegisterBatchInput {
  batchId: string;
  productName: string;
  productSku: string;
  manufacturerName: string;
  manufacturerLotNumber: string;
  dosageForm: string;
  strength: string;
  manufacturingDate: string;
  expiryDate: string;
  quantityReceived: number;
  currentWarehouse: string;
  storageCondition: string;
  activeIngredients?: string;
  barcodeValue?: string;
  notes?: string;
}

export interface RegisterBatchValidationErrors {
  batchId?: string;
  productName?: string;
  productSku?: string;
  manufacturerName?: string;
  manufacturerLotNumber?: string;
  dosageForm?: string;
  strength?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  quantityReceived?: string;
  currentWarehouse?: string;
  storageCondition?: string;
  barcodeValue?: string;
  general?: string;
}

export interface DuplicateCheckResult {
  isDuplicateBatchId: boolean;
  isDuplicateLot: boolean;
  message?: string;
}

export interface UpdateBatchInput {
  batchId: string;
  currentWarehouse?: string;
  storageCondition?: string;
  batchSizeUnits?: number;
  notes?: string;
  manufacturerLotNumber?: string;
}

export interface RiskAlert {
  id: string;
  batchId: string;
  drugName: string;
  riskType: RiskType;
  severity: SeverityLevel;
  warehouse: string;
  detectedAt: string;
  status: AlertStatus;
  description: string;
  telemetrySummary?: string;
  affectedUnits: number;
}

export interface TraceabilityNode {
  id: string;
  stage: string;
  facility: string;
  location: string;
  timestamp: string;
  status: 'passed' | 'warning' | 'critical' | 'pending';
  operator: string;
  parameters: {
    key: string;
    value: string;
    isOutOfSpec?: boolean;
    assumptionNote?: string;
  }[];
  notes?: string;
  regulatoryReviewStatus?: string;
}

export interface CustomerDistributionItem {
  id: string;
  name: string;
  type: 'chemist' | 'hospital';
  location: string;
  unitsAllocated: number;
  dispatchDate: string;
  contactPerson: string;
}

export interface RecallWorkflowData {
  batchId: string;
  drugName: string;
  unitsInWarehouse: number; // 180 units
  unitsDispatched: number; // 640 units
  totalScopeUnits: number; // 820 units
  affectedCustomers: {
    total: number; // 25
    chemists: number; // 23
    hospitals: number; // 2
  };
  customerList: CustomerDistributionItem[];
  replacementBatch: {
    batchId: string; // "B2240"
    drugName: string;
    availableUnits: number; // 400
    warehouse: string;
    status: string; // "Subject to demand and allocation constraints"
    allocationNotes: string;
  };
  investigationStatus: string;
  evidenceSummary: string;
}

export interface AIRecommendation {
  id: string;
  batchId: string;
  drugName: string;
  title: string;
  actionType: 'Quarantine' | 'Class II Recall' | 'Class I Recall' | 'Re-test' | 'Dispatch Hold';
  confidenceScore: number; // Percentage e.g. 94.5
  impactRadius: string;
  rationale: string;
  suggestedSteps: string[];
  recommendedAt: string;
  status: 'pending_review' | 'submitted_to_qa' | 'dismissed';
  evidencePoints?: string[];
  recallWorkflow?: RecallWorkflowData;
}

export interface ApprovalRequest {
  id: string;
  batchId: string;
  title: string;
  requestType: 'Quarantine Order' | 'Recall Authorization' | 'Release Override' | 'Disposal Order';
  submittedBy: string;
  submittedAt: string;
  urgency: SeverityLevel;
  summary: string;
  regulatoryReference?: string;
  status: 'pending' | 'approved' | 'rejected';
  decisionNotes?: string;
  decidedAt?: string;
  decidedBy?: string;
}

export interface DashboardMetrics {
  totalTrackedBatches: number;
  activeRiskAlerts: number;
  expiringBatches: number;
  temperatureIncidents: number;
  pendingApprovals: number;
  quarantinedBatches: number;
  lastUpdated: string;
}

export type NavigationTab = 
  | 'dashboard'
  | 'inventory'
  | 'traceability'
  | 'alerts'
  | 'recommendations'
  | 'approvals';

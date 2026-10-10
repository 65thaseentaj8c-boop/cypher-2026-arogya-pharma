import { describe, it, expect, vi } from 'vitest';
import {
  pharmacyService,
  mapBatchItemToDatabaseBatchForInsert,
  mapDatabaseBatchToBatchItem,
  mapApprovalRequestToDatabaseApprovalForInsert,
} from '../pharmacyService';
import type { RegisterBatchInput, BatchItem, ApprovalRequest } from '../../types';
import * as supabaseModule from '../../lib/supabase';

describe('Batch Registration & Live Inventory Fallback Tests', () => {
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

  // Tests for Requirement: Live inventory fallback bug fix
  describe('getBatches — Live Query & Fallback Behavior', () => {
    it('returns mapped live rows when Supabase returns data with records', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'LIVE-001',
            drug_name: 'Live Drug A',
            product_sku: 'SKU-LIVE-A',
            manufacturer_name: 'Live Mfg',
            manufacturer_lot_number: 'LOT-001',
            dosage_form: 'Tablet',
            strength: '500mg',
            batch_size_units: 5000,
            received_quantity: 5000,
            manufacturing_date: '2026-01-01',
            expiry_date: '2028-01-01',
            storage_condition: 'Ambient',
            current_warehouse: 'WH-01',
            status: 'released',
            risk_score: 5,
            active_ingredients: 'Active A',
            barcode_value: null,
            qr_code_url: null,
            registered_at: null,
            notes: null,
            estimated_monthly_sales_rate: null,
            supplier_return_deadline: null,
            supplier_return_policy_days: null,
          },
        ],
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      vi.spyOn(supabaseModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
      vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({ from: mockFrom } as any);

      const result = await pharmacyService.getBatches();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('LIVE-001');

      vi.restoreAllMocks();
    });

    it('returns an empty array when Supabase query succeeds with zero rows (does NOT fall back to demo data)', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      vi.spyOn(supabaseModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
      vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({ from: mockFrom } as any);

      const result = await pharmacyService.getBatches();
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);

      vi.restoreAllMocks();
    });

    it('returns an empty array when search or status filters match zero rows on successful query (does NOT fall back to demo data)', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'LIVE-001',
            drug_name: 'Live Drug A',
            product_sku: 'SKU-LIVE-A',
            manufacturer_name: 'Live Mfg',
            manufacturer_lot_number: 'LOT-001',
            dosage_form: 'Tablet',
            strength: '500mg',
            batch_size_units: 5000,
            received_quantity: 5000,
            manufacturing_date: '2026-01-01',
            expiry_date: '2028-01-01',
            storage_condition: 'Ambient',
            current_warehouse: 'WH-01',
            status: 'released',
            risk_score: 5,
            active_ingredients: 'Active A',
            barcode_value: null,
            qr_code_url: null,
            registered_at: null,
            notes: null,
            estimated_monthly_sales_rate: null,
            supplier_return_deadline: null,
            supplier_return_policy_days: null,
          },
        ],
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      vi.spyOn(supabaseModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
      vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({ from: mockFrom } as any);

      // Search for non-existent drug
      const searchResult = await pharmacyService.getBatches('NONEXISTENT_QUERY');
      expect(searchResult).toEqual([]);

      // Filter by non-matching status
      const statusResult = await pharmacyService.getBatches(undefined, 'quarantined');
      expect(statusResult).toEqual([]);

      vi.restoreAllMocks();
    });

    it('falls back to inMemoryBatches when Supabase returns an unauthenticated/permission error (e.g. 42501)', async () => {
      pharmacyService.resetInventoryToDefault();

      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'permission denied for table batches' },
      });

      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      vi.spyOn(supabaseModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
      vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({ from: mockFrom } as any);

      const result = await pharmacyService.getBatches();
      // Should fall back to inMemoryBatches demo data
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((b) => b.id === 'B2231')).toBe(true);

      vi.restoreAllMocks();
    });
  });

  // Tests for Approval Requests Permission & Payload Verification
  describe('approval_requests — Permissions & Insert Payload Compliance', () => {
    it('mapApprovalRequestToDatabaseApprovalForInsert excludes status, submitted_at, and decision fields to adhere to column GRANT INSERT permissions', () => {
      const sampleReq: ApprovalRequest = {
        id: 'APP-9999',
        batchId: 'B2231',
        title: 'Quarantine Order — Batch B2231 Thermal Excursion',
        requestType: 'Quarantine Order',
        submittedBy: 'qa.lead@arogyapharma.com',
        submittedAt: '2026-10-10 08:00 IST',
        urgency: 'critical',
        summary: 'Thermal excursion above spec',
        regulatoryReference: 'CDSCO Schedule M Section 8.4',
        status: 'pending',
        decisionNotes: 'Pending review',
        decidedAt: '2026-10-10 08:30 IST',
        decidedBy: 'QA Approver',
      };

      const dbInsertPayload = mapApprovalRequestToDatabaseApprovalForInsert(sampleReq);

      // Verify allowed columns for authenticated INSERT
      expect(dbInsertPayload.id).toBe('APP-9999');
      expect(dbInsertPayload.batch_id).toBe('B2231');
      expect(dbInsertPayload.title).toBe('Quarantine Order — Batch B2231 Thermal Excursion');
      expect(dbInsertPayload.request_type).toBe('Quarantine Order');
      expect(dbInsertPayload.submitted_by).toBe('qa.lead@arogyapharma.com');
      expect(dbInsertPayload.urgency).toBe('critical');
      expect(dbInsertPayload.summary).toBe('Thermal excursion above spec');
      expect(dbInsertPayload.regulatory_reference).toBe('CDSCO Schedule M Section 8.4');

      // Verify restricted columns are strictly omitted
      expect('status' in dbInsertPayload).toBe(false);
      expect('submitted_at' in dbInsertPayload).toBe(false);
      expect('decision_notes' in dbInsertPayload).toBe(false);
      expect('decided_at' in dbInsertPayload).toBe(false);
      expect('decided_by' in dbInsertPayload).toBe(false);
    });

    it('addApprovalRequest uses compliant insert payload when connected to Supabase', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'APP-8888',
          batch_id: 'B2231',
          title: 'Recall Order',
          request_type: 'Recall Authorization',
          submitted_by: 'qa.lead@arogyapharma.com',
          submitted_at: '2026-10-10T08:00:00Z',
          urgency: 'critical',
          summary: 'Critical defect',
          regulatory_reference: null,
          status: 'pending',
          decision_notes: null,
          decided_at: null,
          decided_by: null,
        },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

      vi.spyOn(supabaseModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
      vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({ from: mockFrom } as any);

      const requestInput: ApprovalRequest = {
        id: 'APP-8888',
        batchId: 'B2231',
        title: 'Recall Order',
        requestType: 'Recall Authorization',
        submittedBy: 'qa.lead@arogyapharma.com',
        submittedAt: '2026-10-10 08:00 IST',
        urgency: 'critical',
        summary: 'Critical defect',
        status: 'pending',
      };

      const result = await pharmacyService.addApprovalRequest(requestInput);

      expect(mockFrom).toHaveBeenCalledWith('approval_requests');
      expect(mockInsert).toHaveBeenCalledWith([
        {
          id: 'APP-8888',
          batch_id: 'B2231',
          title: 'Recall Order',
          request_type: 'Recall Authorization',
          submitted_by: 'qa.lead@arogyapharma.com',
          urgency: 'critical',
          summary: 'Critical defect',
          regulatory_reference: null,
        },
      ]);
      expect(result.id).toBe('APP-8888');

      vi.restoreAllMocks();
    });

    it('getApprovalQueue returns mapped live requests and returns empty array on zero rows without mock fallback', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.spyOn(supabaseModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
      vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({ from: mockFrom } as any);

      const queue = await pharmacyService.getApprovalQueue();
      expect(queue).toEqual([]);

      vi.restoreAllMocks();
    });

    it('updateApprovalDecision calls submit_approval_decision RPC enforcing server-side state transitions and audit logging', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          id: 'APP-101',
          batch_id: 'B2231',
          title: 'Quarantine Order',
          request_type: 'Quarantine Order',
          submitted_by: 'QA Analyst',
          submitted_at: '2026-10-09T10:00:00Z',
          urgency: 'critical',
          summary: 'Thermal excursion',
          regulatory_reference: null,
          status: 'approved',
          decision_notes: 'Approved for dock hold',
          decided_at: '2026-10-10T08:00:00Z',
          decided_by: 'Thaseen Taj (qa.lead@arogyapharma.com)',
        },
        error: null,
      });

      vi.spyOn(supabaseModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
      vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({ rpc: mockRpc } as any);

      const result = await pharmacyService.updateApprovalDecision(
        'APP-101',
        'approved',
        'Approved for dock hold'
      );

      expect(mockRpc).toHaveBeenCalledWith('submit_approval_decision', {
        p_request_id: 'APP-101',
        p_decision: 'approved',
        p_decision_notes: 'Approved for dock hold',
      });
      expect(result?.status).toBe('approved');

      vi.restoreAllMocks();
    });
  });
});

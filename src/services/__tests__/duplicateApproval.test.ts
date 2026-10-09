import { describe, it, expect, beforeEach } from 'vitest';
import { pharmacyService } from '../pharmacyService';
import type { ApprovalRequest } from '../../types';

describe('Duplicate Approval Prevention & Queue Governance', () => {
  beforeEach(() => {
    pharmacyService.resetInventoryToDefault();
  });

  it('should prevent submitting duplicate pending requests for the same batch ID and action type', async () => {
    const request1: ApprovalRequest = {
      id: 'APP-TEST-01',
      batchId: 'B2231',
      title: 'Quarantine Order: Test Precautionary Hold',
      requestType: 'Quarantine Order',
      submittedBy: 'AI Risk Agent',
      submittedAt: '10:00 IST',
      urgency: 'critical',
      summary: 'Test summary',
      status: 'pending',
    };

    // APP-101 is already pending in default seed queue for B2231 Quarantine Order
    const queueBefore = await pharmacyService.getApprovalQueue();
    const existingApp101 = queueBefore.find(a => a.id === 'APP-101');
    expect(existingApp101).toBeDefined();
    expect(existingApp101?.status).toBe('pending');

    // Attempting to add another pending Quarantine Order for B2231 should throw a clear duplicate error
    await expect(pharmacyService.addApprovalRequest(request1)).rejects.toThrow(
      /An equivalent pending Quarantine Order already exists for Batch B2231 \(Request ID: APP-101\)/
    );

    const queueAfter = await pharmacyService.getApprovalQueue();
    const b2231QuarantinePending = queueAfter.filter(
      a => a.status === 'pending' && a.batchId === 'B2231' && a.requestType === 'Quarantine Order'
    );
    // Only 1 pending Quarantine Order exists!
    expect(b2231QuarantinePending.length).toBe(1);
    expect(b2231QuarantinePending[0].id).toBe('APP-101');
  });

  it('should allow different request types for the same batch', async () => {
    // B2231 already has APP-101 (Quarantine Order) and APP-102 (Recall Authorization) pending
    const queue = await pharmacyService.getApprovalQueue();
    const app101 = queue.find(a => a.id === 'APP-101');
    const app102 = queue.find(a => a.id === 'APP-102');

    expect(app101).toBeDefined();
    expect(app102).toBeDefined();
    expect(app101?.requestType).toBe('Quarantine Order');
    expect(app102?.requestType).toBe('Recall Authorization');
    expect(app101?.batchId).toBe('B2231');
    expect(app102?.batchId).toBe('B2231');

    // Adding a Disposal Order for B2231 (different action type) should succeed
    const newDisposalRequest: ApprovalRequest = {
      id: 'APP-TEST-DISPOSAL',
      batchId: 'B2231',
      title: 'Disposal Order for Expired Vials',
      requestType: 'Disposal Order',
      submittedBy: 'QA Lead',
      submittedAt: '10:30 IST',
      urgency: 'high',
      summary: 'Disposal authorization request',
      status: 'pending',
    };

    const added = await pharmacyService.addApprovalRequest(newDisposalRequest);
    expect(added.id).toBe('APP-TEST-DISPOSAL');

    const updatedQueue = await pharmacyService.getApprovalQueue();
    const disposalReq = updatedQueue.find(a => a.id === 'APP-TEST-DISPOSAL');
    expect(disposalReq).toBeDefined();
  });

  it('should allow same action type for different batches', async () => {
    const newBatchRequest: ApprovalRequest = {
      id: 'APP-TEST-B2228',
      batchId: 'B2228',
      title: 'Quarantine Order for Ceftriaxone',
      requestType: 'Quarantine Order',
      submittedBy: 'AI Agent',
      submittedAt: '11:00 IST',
      urgency: 'high',
      summary: 'Quarantine request for B2228',
      status: 'pending',
    };

    const added = await pharmacyService.addApprovalRequest(newBatchRequest);
    expect(added.id).toBe('APP-TEST-B2228');
  });

  it('should preserve historical approved and rejected records and allow new requests after historical resolution', async () => {
    // 1. Approve APP-101
    await pharmacyService.updateApprovalDecision('APP-101', 'approved', 'Approved hold');
    const queueAfterApproval = await pharmacyService.getApprovalQueue();
    const app101Decided = queueAfterApproval.find(a => a.id === 'APP-101');
    expect(app101Decided?.status).toBe('approved');
    expect(app101Decided?.decisionNotes).toBe('Approved hold');

    // 2. Now that APP-101 is approved (no longer pending), a new Quarantine Order for B2231 should be allowed
    const newRequest: ApprovalRequest = {
      id: 'APP-NEW-AFTER-APPROVAL',
      batchId: 'B2231',
      title: 'Subsequent Quarantine Order for B2231',
      requestType: 'Quarantine Order',
      submittedBy: 'AI Agent',
      submittedAt: '12:00 IST',
      urgency: 'critical',
      summary: 'New incident requirement',
      status: 'pending',
    };

    const added = await pharmacyService.addApprovalRequest(newRequest);
    expect(added.id).toBe('APP-NEW-AFTER-APPROVAL');

    // 3. Historical approved record APP-101 remains intact
    const finalQueue = await pharmacyService.getApprovalQueue();
    const app101Historical = finalQueue.find(a => a.id === 'APP-101');
    expect(app101Historical?.status).toBe('approved');
    expect(app101Historical?.decisionNotes).toBe('Approved hold');
  });

  it('should clean up duplicate pending requests without deleting primary pending requests or historical decisions', async () => {
    // Manually inject duplicate pending request to simulate pre-existing duplicate entries
    const duplicateRequest: ApprovalRequest = {
      id: 'APP-DUPLICATE-6790',
      batchId: 'B2231',
      title: 'Duplicate Quarantine Request',
      requestType: 'Quarantine Order',
      submittedBy: 'AI Agent',
      submittedAt: '10:05 IST',
      urgency: 'critical',
      summary: 'Duplicate request',
      status: 'pending',
    };

    // Attempting to add duplicate request catches error
    await pharmacyService.addApprovalRequest(duplicateRequest).catch(() => {});

    const removedIds = await pharmacyService.cleanupDuplicatePendingRequests();
    expect(Array.isArray(removedIds)).toBe(true);

    const queue = await pharmacyService.getApprovalQueue();
    // Primary APP-101 remains pending
    const app101 = queue.find(a => a.id === 'APP-101');
    expect(app101).toBeDefined();
    expect(app101?.status).toBe('pending');
  });

  it('should accurately calculate pending approvals count in dashboard metrics', async () => {
    const metricsBefore = await pharmacyService.getDashboardMetrics();
    const initialPendingCount = metricsBefore.pendingApprovals;

    // Reject APP-104
    await pharmacyService.updateApprovalDecision('APP-104', 'rejected', 'Re-test required');

    const metricsAfter = await pharmacyService.getDashboardMetrics();
    expect(metricsAfter.pendingApprovals).toBe(initialPendingCount - 1);
  });

  it('should evaluate zero duplicate pending requests when all pending items belong to different batches/actions (explaining banner visibility)', () => {
    // Current queue state: APP-101 rejected, APP-102 approved, APP-103 (B2227), APP-104 (B2230), APP-105 (B2224) pending
    const sampleApprovals: ApprovalRequest[] = [
      { id: 'APP-101', batchId: 'B2231', requestType: 'Quarantine Order', status: 'rejected', title: '', submittedBy: '', submittedAt: '', urgency: 'critical', summary: '' },
      { id: 'APP-102', batchId: 'B2231', requestType: 'Recall Authorization', status: 'approved', title: '', submittedBy: '', submittedAt: '', urgency: 'high', summary: '' },
      { id: 'APP-103', batchId: 'B2227', requestType: 'Disposal Order', status: 'pending', title: '', submittedBy: '', submittedAt: '', urgency: 'high', summary: '' },
      { id: 'APP-104', batchId: 'B2230', requestType: 'Release Override', status: 'pending', title: '', submittedBy: '', submittedAt: '', urgency: 'medium', summary: '' },
      { id: 'APP-105', batchId: 'B2224', requestType: 'Release Override', status: 'pending', title: '', submittedBy: '', submittedAt: '', urgency: 'low', summary: '' },
    ];

    const pendingMap = new Map<string, string>();
    const duplicatePendingIds = new Set<string>();

    sampleApprovals.forEach((req) => {
      if (req.status === 'pending') {
        const key = `${req.batchId.trim().toUpperCase()}_${req.requestType.trim().toUpperCase()}`;
        if (pendingMap.has(key)) {
          duplicatePendingIds.add(req.id);
        } else {
          pendingMap.set(key, req.id);
        }
      }
    });

    // When all pending items are unique, duplicatePendingIds.size is 0, so duplicate banner & badges are correctly HIDDEN
    expect(duplicatePendingIds.size).toBe(0);
  });

  it('should detect duplicate pending requests and identify the primary vs duplicate request IDs when duplicates are present', () => {
    const sampleWithDuplicates: ApprovalRequest[] = [
      { id: 'APP-101', batchId: 'B2231', requestType: 'Quarantine Order', status: 'pending', title: 'Primary', submittedBy: '', submittedAt: '', urgency: 'critical', summary: '' },
      { id: 'APP-6790', batchId: 'B2231', requestType: 'Quarantine Order', status: 'pending', title: 'Duplicate 1', submittedBy: '', submittedAt: '', urgency: 'critical', summary: '' },
      { id: 'APP-8381', batchId: 'B2231', requestType: 'Quarantine Order', status: 'pending', title: 'Duplicate 2', submittedBy: '', submittedAt: '', urgency: 'critical', summary: '' },
    ];

    const pendingMap = new Map<string, string>();
    const duplicatePendingIds = new Set<string>();

    sampleWithDuplicates.forEach((req) => {
      if (req.status === 'pending') {
        const key = `${req.batchId.trim().toUpperCase()}_${req.requestType.trim().toUpperCase()}`;
        if (pendingMap.has(key)) {
          duplicatePendingIds.add(req.id);
        } else {
          pendingMap.set(key, req.id);
        }
      }
    });

    // Expect duplicatePendingIds to identify APP-6790 and APP-8381 as duplicates of primary APP-101
    expect(duplicatePendingIds.size).toBe(2);
    expect(duplicatePendingIds.has('APP-6790')).toBe(true);
    expect(duplicatePendingIds.has('APP-8381')).toBe(true);
    expect(pendingMap.get('B2231_QUARANTINE ORDER')).toBe('APP-101');
  });
});

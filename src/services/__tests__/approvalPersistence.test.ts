import { describe, it, expect, beforeEach } from 'vitest';
import {
  pharmacyService,
  APPROVAL_STORAGE_KEY,
  getStoredApprovalDecisions,
} from '../pharmacyService';

describe('Approval Decisions — LocalStorage Persistence & Lifecycle', () => {
  beforeEach(() => {
    pharmacyService.resetInventoryToDefault();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should persist an approval decision in localStorage', async () => {
    const approvalId = 'APP-101';
    const notes = 'Approved after reviewing HPLC stability assay.';

    const updated = await pharmacyService.updateApprovalDecision(
      approvalId,
      'approved',
      notes,
      'Dr. Jane Doe (QA Officer)'
    );

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe('approved');
    expect(updated?.decisionNotes).toBe(notes);
    expect(updated?.decidedBy).toBe('Dr. Jane Doe (QA Officer)');

    // Check localStorage saved decision
    const stored = getStoredApprovalDecisions();
    expect(stored[approvalId]).toBeDefined();
    expect(stored[approvalId].status).toBe('approved');
    expect(stored[approvalId].decisionNotes).toBe(notes);
    expect(stored[approvalId].decidedBy).toBe('Dr. Jane Doe (QA Officer)');
  });

  it('should persist a rejection decision in localStorage', async () => {
    const approvalId = 'APP-102';
    const notes = 'Rejected due to incomplete documentation.';

    const updated = await pharmacyService.updateApprovalDecision(
      approvalId,
      'rejected',
      notes,
      'Auditor Bob'
    );

    expect(updated?.status).toBe('rejected');
    expect(updated?.decisionNotes).toBe(notes);

    const stored = getStoredApprovalDecisions();
    expect(stored[approvalId]).toBeDefined();
    expect(stored[approvalId].status).toBe('rejected');
  });

  it('should restore saved decisions upon page refresh/reload', async () => {
    // 1. Make decisions
    await pharmacyService.updateApprovalDecision('APP-101', 'approved', 'Approved note A');
    await pharmacyService.updateApprovalDecision('APP-102', 'rejected', 'Rejected note B');

    // 2. Simulate refresh by re-fetching approval queue from service
    const queueAfterRefresh = await pharmacyService.getApprovalQueue();

    const app101 = queueAfterRefresh.find((a) => a.id === 'APP-101');
    const app102 = queueAfterRefresh.find((a) => a.id === 'APP-102');
    const app103 = queueAfterRefresh.find((a) => a.id === 'APP-103');

    expect(app101?.status).toBe('approved');
    expect(app101?.decisionNotes).toBe('Approved note A');
    expect(app102?.status).toBe('rejected');
    expect(app102?.decisionNotes).toBe('Rejected note B');

    // Undecided item remains pending
    expect(app103?.status).toBe('pending');
  });

  it('should update pending approvals metric count correctly', async () => {
    const initialMetrics = await pharmacyService.getDashboardMetrics();
    const initialPendingCount = initialMetrics.pendingApprovals;

    // Approve one request
    await pharmacyService.updateApprovalDecision('APP-101', 'approved', 'Authorized');

    const updatedMetrics = await pharmacyService.getDashboardMetrics();
    expect(updatedMetrics.pendingApprovals).toBe(initialPendingCount - 1);
  });

  it('should prevent modifying other actions when approving/rejecting a single action', async () => {
    const initialQueue = await pharmacyService.getApprovalQueue();
    const targetId = 'APP-103';

    await pharmacyService.updateApprovalDecision(targetId, 'approved', 'Only 103 approved');

    const newQueue = await pharmacyService.getApprovalQueue();

    // Check that non-target items were untouched
    initialQueue.forEach((orig) => {
      if (orig.id !== targetId) {
        const itemInNew = newQueue.find((n) => n.id === orig.id);
        expect(itemInNew?.status).toBe(orig.status);
      }
    });

    const targetInNew = newQueue.find((n) => n.id === targetId);
    expect(targetInNew?.status).toBe('approved');
  });

  it('should prevent duplicate sign-offs on an already decided action', async () => {
    const targetId = 'APP-101';
    await pharmacyService.updateApprovalDecision(targetId, 'approved', 'First decision');

    // Attempt second decision
    const resultSecond = await pharmacyService.updateApprovalDecision(
      targetId,
      'rejected',
      'Second decision attempt'
    );

    // Status remains approved (first decision retained)
    expect(resultSecond?.status).toBe('approved');
    expect(resultSecond?.decisionNotes).toBe('First decision');
  });

  it('should handle corrupted or invalid JSON in localStorage safely', async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(APPROVAL_STORAGE_KEY, 'invalid{json:parser_error');
    }

    // Should not throw or crash, should fallback to default queue
    const queue = await pharmacyService.getApprovalQueue();
    expect(queue.length).toBeGreaterThan(0);
    expect(queue.some((a) => a.status === 'pending')).toBe(true);
  });

  it('should synchronize batch status to "quarantined" when B2231 quarantine order APP-101 is approved and persist on refresh', async () => {
    // 1. Initial state: B2231 is under_review
    const initialB2231 = await pharmacyService.getBatchById('B2231');
    expect(initialB2231?.status).toBe('under_review');

    // 2. Approve quarantine order APP-101 for B2231
    await pharmacyService.updateApprovalDecision(
      'APP-101',
      'approved',
      'Authorized dock quarantine after cold chain excursion review.'
    );

    // 3. Batch B2231 status must immediately update to "quarantined"
    const updatedB2231 = await pharmacyService.getBatchById('B2231');
    expect(updatedB2231?.status).toBe('quarantined');

    // 4. On refresh/re-fetching batches, status remains "quarantined"
    const reloadedBatches = await pharmacyService.getBatches();
    const reloadedB2231 = reloadedBatches.find((b) => b.id === 'B2231');
    expect(reloadedB2231?.status).toBe('quarantined');
  });

  it('should NOT quarantine batch B2231 when quarantine order APP-101 is rejected', async () => {
    // 1. Reject quarantine order APP-101
    await pharmacyService.updateApprovalDecision(
      'APP-101',
      'rejected',
      'Re-test showed no physical thermal degradation. Hold rejected.'
    );

    // 2. Batch B2231 status remains "under_review" (unquarantined)
    const b2231 = await pharmacyService.getBatchById('B2231');
    expect(b2231?.status).toBe('under_review');

    // 3. Approval decision remains rejected
    const queue = await pharmacyService.getApprovalQueue();
    const app101 = queue.find((a) => a.id === 'APP-101');
    expect(app101?.status).toBe('rejected');
  });

  it('should update batch B2231 status to "recalled" when Recall Authorization APP-102 is approved and persist on refresh', async () => {
    // 1. Approve Recall Authorization APP-102 for B2231
    await pharmacyService.updateApprovalDecision(
      'APP-102',
      'approved',
      'Authorized consignee recall notifications.'
    );

    // 2. Batch B2231 status must update to "recalled"
    const updatedB2231 = await pharmacyService.getBatchById('B2231');
    expect(updatedB2231?.status).toBe('recalled');

    // 3. On refresh/re-fetching, status remains "recalled"
    const reloadedBatches = await pharmacyService.getBatches();
    const reloadedB2231 = reloadedBatches.find((b) => b.id === 'B2231');
    expect(reloadedB2231?.status).toBe('recalled');
  });

  it('should enforce simulated dispatch block for Quarantined and Recalled batches', async () => {
    // 1. Quarantined batch B2231 cannot be dispatched
    await pharmacyService.updateApprovalDecision('APP-101', 'approved', 'Quarantine B2231');
    const checkQuarantined = await pharmacyService.canDispatchBatch('B2231');
    expect(checkQuarantined.allowed).toBe(false);
    expect(checkQuarantined.reason).toContain('Dispatch Blocked');

    await expect(pharmacyService.dispatchBatch('B2231', 100)).rejects.toThrow('Simulated Dispatch Blocked');

    // 2. Released batch B2240 can be dispatched
    const checkReleased = await pharmacyService.canDispatchBatch('B2240');
    expect(checkReleased.allowed).toBe(true);
    const dispatchRes = await pharmacyService.dispatchBatch('B2240', 100);
    expect(dispatchRes.success).toBe(true);
  });

  it('should ensure unrelated batch B2240 remains "released" when B2231 is quarantined', async () => {
    // Approve quarantine order for B2231
    await pharmacyService.updateApprovalDecision('APP-101', 'approved', 'Quarantine B2231');

    // B2240 must remain QC Released ("released")
    const b2240 = await pharmacyService.getBatchById('B2240');
    expect(b2240?.status).toBe('released');
  });
});

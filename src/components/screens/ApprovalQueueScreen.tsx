import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import type { ApprovalRequest, NavigationTab } from '../../types';
import { SeverityBadge } from '../common/StatusBadge';
import { DemoBadge } from '../common/DemoBadge';
import { Modal } from '../common/Modal';

import { isSupabaseConfigured } from '../../lib/supabase';

interface ApprovalQueueScreenProps {
  approvals: ApprovalRequest[];
  onDecision: (
    id: string,
    decision: 'approved' | 'rejected',
    notes: string
  ) => void;
  onNavigate: (tab: NavigationTab) => void;
  onResetDemo?: () => void;
  onCleanupDuplicates?: () => void;
  onDismissRequest?: (id: string) => void;
}

export const ApprovalQueueScreen: React.FC<ApprovalQueueScreenProps> = ({
  approvals,
  onDecision,
  onNavigate,
  onResetDemo,
  onCleanupDuplicates,
  onDismissRequest,
}) => {
  const [activeItem, setActiveItem] = useState<{
    request: ApprovalRequest;
    decision: 'approved' | 'rejected';
  } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');

  // Identify duplicate pending requests based on stable key (batchId + requestType)
  const pendingMap = new Map<string, string>(); // key -> primary request ID
  const duplicatePendingIds = new Set<string>();

  approvals.forEach((req) => {
    if (req.status === 'pending') {
      const bId = (req.batchId || '').trim().toUpperCase();
      const rType = (req.requestType || '').trim().toUpperCase();
      const key = `${bId}_${rType}`;
      if (pendingMap.has(key)) {
        duplicatePendingIds.add(req.id);
      } else {
        pendingMap.set(key, req.id);
      }
    }
  });

  const handleOpenDecision = (
    request: ApprovalRequest,
    decision: 'approved' | 'rejected'
  ) => {
    setActiveItem({ request, decision });
    setDecisionNotes(
      decision === 'approved'
        ? 'Verified against cold-chain telemetry logs and standard Schedule M protocol. Authorization granted.'
        : 'Insufficient stabilization assay documentation attached. Requesting secondary laboratory re-test.'
    );
  };

  const handleConfirmDecision = async () => {
    if (!activeItem) return;
    const { request, decision } = activeItem;
    const notes = decisionNotes;
    setActiveItem(null);
    setDecisionNotes('');
    await onDecision(request.id, decision, notes);
  };

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Top QA Context Card */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
              QA REGULATORY CONSOLE
            </span>
            {isSupabaseConfigured ? (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE DB QUEUE
              </span>
            ) : (
              <DemoBadge label="Demonstration Approval Store" size="sm" />
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Pending Quarantine & Recall Sign-Off Requests
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Decisions logged here commit 21 CFR Part 11 compliant audit trails with cryptographic signer metadata.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {onCleanupDuplicates && duplicatePendingIds.size > 0 && (
            <button
              type="button"
              onClick={onCleanupDuplicates}
              className="px-2.5 py-1 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded transition-colors"
              title="Clean up duplicate pending requests while keeping primary requests"
            >
              Clean Up {duplicatePendingIds.size} Duplicate(s)
            </button>
          )}
          {onResetDemo && !isSupabaseConfigured && (
            <button
              type="button"
              onClick={onResetDemo}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors"
              title="Reset localStorage decisions and restore default seed queue"
            >
              Reset Demo Store
            </button>
          )}
          <span className="text-xs text-slate-600">Pending Actions:</span>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            {pendingCount} Required
          </span>
        </div>
      </div>

      {/* Duplicate Alert Banner */}
      {duplicatePendingIds.size > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Duplicate Submissions Detected:</strong> {duplicatePendingIds.size} redundant pending request(s) found in queue ({Array.from(duplicatePendingIds).join(', ')}). Primary requests remain active.
            </span>
          </div>
          {onCleanupDuplicates && (
            <button
              onClick={onCleanupDuplicates}
              className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded text-xs shrink-0 transition-colors"
            >
              Clean Up Duplicates Now
            </button>
          )}
        </div>
      )}

      {/* Empty Queue Honest State */}
      {approvals.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900">
            No Pending Regulatory Approval Requests
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isSupabaseConfigured
              ? 'There are currently zero pending quarantine, recall, or override requests in the live database. Submit new advisories from the AI Recommendations screen to process sign-offs.'
              : 'There are currently zero approval requests in the queue.'}
          </p>
          <button
            onClick={() => onNavigate('recommendations')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-xs transition-colors"
          >
            View AI Recommendations & Advisories →
          </button>
        </div>
      ) : (
        /* Approval Requests Cards */
        <div className="space-y-4">
        {approvals.map((req) => {
          const isPending = req.status === 'pending';
          const isDuplicate = duplicatePendingIds.has(req.id);
          const key = `${req.batchId.trim().toUpperCase()}_${req.requestType.trim().toUpperCase()}`;
          const primaryId = pendingMap.get(key);

          return (
            <div
              key={req.id}
              className={`bg-white rounded-lg border shadow-sm p-5 space-y-4 text-xs transition-all ${
                isDuplicate
                  ? 'border-amber-300 bg-amber-50/20'
                  : req.status === 'approved'
                  ? 'border-emerald-300 bg-emerald-50/10'
                  : req.status === 'rejected'
                  ? 'border-rose-300 bg-rose-50/10'
                  : 'border-slate-200'
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {req.id}
                  </span>
                  <button
                    onClick={() => onNavigate('traceability')}
                    className="font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-2 py-0.5 rounded transition-colors"
                  >
                    Batch {req.batchId}
                  </button>
                  <span className="font-bold text-slate-800">{req.requestType}</span>
                  <SeverityBadge severity={req.urgency} />
                  {isDuplicate && (
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                      Suspected Duplicate (Primary: {primaryId})
                    </span>
                  )}
                </div>

                <div>
                  {req.status === 'approved' && (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded">
                      <CheckCircle2 className="w-3.5 h-3.5" /> APPROVED
                    </span>
                  )}
                  {req.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded">
                      <XCircle className="w-3.5 h-3.5" /> REJECTED
                    </span>
                  )}
                  {req.status === 'pending' && !isDuplicate && (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded">
                      <Clock className="w-3.5 h-3.5" /> PENDING QA REVIEW
                    </span>
                  )}
                  {req.status === 'pending' && isDuplicate && (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-200 border border-amber-400 px-2.5 py-0.5 rounded">
                      <AlertTriangle className="w-3.5 h-3.5" /> DUPLICATE PENDING
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Summary */}
              <div>
                <h4 className="text-sm font-bold text-slate-900">{req.title}</h4>
                <p className="text-slate-600 mt-1 leading-relaxed">{req.summary}</p>
              </div>

              {/* Regulatory citation & submitter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-slate-50 rounded border border-slate-200 text-slate-600">
                <div>
                  <span className="font-semibold text-slate-700">Submitted By:</span>{' '}
                  {req.submittedBy} ({req.submittedAt})
                </div>
                {req.regulatoryReference && (
                  <div>
                    <span className="font-semibold text-slate-700">
                      Standard Reference:
                    </span>{' '}
                    {req.regulatoryReference}
                  </div>
                )}
              </div>

              {/* Audit trail if already decided */}
              {req.decidedAt && (
                <div className="p-3 bg-slate-100 rounded border border-slate-200 text-slate-700">
                  <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                    <span>Sign-off record by {req.decidedBy}</span>
                    <span className="font-mono">{req.decidedAt}</span>
                  </div>
                  <p className="italic text-slate-600">"{req.decisionNotes}"</p>
                </div>
              )}

              {/* Action Buttons */}
              {isPending && (
                <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
                  <div>
                    {isDuplicate && onDismissRequest && (
                      <button
                        type="button"
                        onClick={() => onDismissRequest(req.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-amber-900 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded transition-colors"
                      >
                        Dismiss Duplicate
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleOpenDecision(req, 'rejected')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject Request
                    </button>
                    <button
                      onClick={() => handleOpenDecision(req, 'approved')}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Authorize & Sign
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}

      {/* Decision Sign-off Modal */}
      {activeItem && (
        <Modal
          isOpen={!!activeItem}
          onClose={() => setActiveItem(null)}
          title={`Sign-off Action: ${
            activeItem.decision === 'approved' ? 'Approve' : 'Reject'
          } ${activeItem.request.requestType}`}
          subtitle={`Reference Lot: ${activeItem.request.batchId} (${activeItem.request.id})`}
          footer={
            <>
              <button
                onClick={() => setActiveItem(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDecision}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded shadow-xs flex items-center gap-1.5 ${
                  activeItem.decision === 'approved'
                    ? 'bg-teal-700 hover:bg-teal-800'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Commit Digital Sign-Off
              </button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <p className="font-semibold text-slate-800 mb-0.5">
                {activeItem.request.title}
              </p>
              <p className="text-slate-600">{activeItem.request.summary}</p>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                QA Officer Audit Notes & Regulatory Justification:
              </label>
              <textarea
                rows={3}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                className="w-full p-2.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-teal-600 focus:outline-none bg-slate-50"
                placeholder="Enter justification to append to the electronic batch record..."
              />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <span className="font-bold">Demonstration Audit Log Notice:</span>{' '}
                Submitting this mock signature updates state locally in memory. In Phase 2, this will commit an encrypted hash to Supabase audit tables.
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

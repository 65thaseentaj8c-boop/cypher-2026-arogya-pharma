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

interface ApprovalQueueScreenProps {
  approvals: ApprovalRequest[];
  onDecision: (
    id: string,
    decision: 'approved' | 'rejected',
    notes: string
  ) => void;
  onNavigate: (tab: NavigationTab) => void;
  onResetDemo?: () => void;
}

export const ApprovalQueueScreen: React.FC<ApprovalQueueScreenProps> = ({
  approvals,
  onDecision,
  onNavigate,
  onResetDemo,
}) => {
  const [activeItem, setActiveItem] = useState<{
    request: ApprovalRequest;
    decision: 'approved' | 'rejected';
  } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');

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

  const handleConfirmDecision = () => {
    if (!activeItem) return;
    onDecision(activeItem.request.id, activeItem.decision, decisionNotes);
    setActiveItem(null);
    setDecisionNotes('');
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
            <DemoBadge label="Demonstration Approval Store" size="sm" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Pending Quarantine & Recall Sign-Off Requests
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Decisions logged here simulate 21 CFR Part 11 compliant audit trails with cryptographic signer metadata.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onResetDemo && (
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

      {/* Approval Requests Cards */}
      <div className="space-y-4">
        {approvals.map((req) => {
          const isPending = req.status === 'pending';

          return (
            <div
              key={req.id}
              className={`bg-white rounded-lg border shadow-sm p-5 space-y-4 text-xs transition-all ${
                req.status === 'approved'
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
                  {req.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded">
                      <Clock className="w-3.5 h-3.5" /> PENDING QA REVIEW
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
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
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
              )}
            </div>
          );
        })}
      </div>

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

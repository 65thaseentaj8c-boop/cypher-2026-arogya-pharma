import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  AlertCircle,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import type { AIRecommendation, ApprovalRequest, BatchItem, NavigationTab } from '../../types';
import { DemoBadge } from '../common/DemoBadge';
import { Modal } from '../common/Modal';
import { isSupabaseConfigured } from '../../lib/supabase';

interface RecommendationsScreenProps {
  recommendations: AIRecommendation[];
  onNavigate: (tab: NavigationTab) => void;
  onSubmitToQA: (rec: AIRecommendation) => void;
  approvals?: ApprovalRequest[];
  batches?: BatchItem[];
}

export const RecommendationsScreen: React.FC<RecommendationsScreenProps> = ({
  recommendations,
  onNavigate,
  onSubmitToQA,
  approvals = [],
  batches = [],
}) => {
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [poUnits, setPoUnits] = useState('600');
  const [poSupplier, setPoSupplier] = useState('Arogya Formulation Works (Ahmedabad Unit)');
  const [poNotes, setPoNotes] = useState('Urgent PO drafted due to B2231 recall and B2240 reserve deficit (400 units vs 940 units total demand). Hospital ICUs prioritized.');
  const [poSubmitted, setPoSubmitted] = useState(false);

  const isBatchRegistered = (batchId: string) => {
    if (!isSupabaseConfigured) return true;
    if (!batches || batches.length === 0) return true;
    return batches.some((b) => b.id.toUpperCase() === batchId.toUpperCase());
  };

  const recA = recommendations[0];
  const recC = recommendations[1] || recommendations[0];

  const isOptionABatchRegistered = recA ? isBatchRegistered(recA.batchId) : true;
  const isOptionBBatchRegistered = isBatchRegistered('B2231');
  const isOptionCBatchRegistered = recC ? isBatchRegistered(recC.batchId) : true;

  const isOptionASubmitted = recA && isOptionABatchRegistered
    ? submittedIds.includes(recA.id) ||
      approvals.some(
        (a) =>
          a.status === 'pending' &&
          (a.batchId || '').toUpperCase() === (recA.batchId || '').toUpperCase() &&
          (a.requestType || '').toLowerCase().includes('quarantine')
      )
    : false;

  const isOptionBSubmitted = isOptionBBatchRegistered && (
    poSubmitted ||
    approvals.some(
      (a) =>
        (a.batchId || '').toUpperCase() === 'B2231' &&
        (a.title || '').toLowerCase().includes('urgent purchase order')
    )
  );

  const isOptionCSubmitted = recC && isOptionCBatchRegistered
    ? submittedIds.includes(recC.id) ||
      approvals.some(
        (a) =>
          a.status === 'pending' &&
          (a.batchId || '').toUpperCase() === (recC.batchId || '').toUpperCase() &&
          (a.requestType || '').toLowerCase().includes('recall')
      )
    : false;

  const handleSubmit = async (rec: AIRecommendation) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmitToQA(rec);
      setSubmittedIds((prev) => [...prev, rec.id]);
    } catch (_) {
      // Submission failed, state remains unsubmitted
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePoSubmit = async () => {
    // Create an approval request for the PO
    const fakePoRec: AIRecommendation = {
      id: `PO-${Date.now().toString().slice(-4)}`,
      batchId: 'B2231',
      drugName: 'Paracetamol Infusion IP (100ml / 1000mg)',
      title: `Urgent Purchase Order: ${poUnits} units of Paracetamol Infusion IP`,
      actionType: 'Dispatch Hold',
      confidenceScore: 96.5,
      impactRadius: 'Enterprise Supply Chain & ICU Hospital Stock Replenishment',
      rationale: poNotes,
      suggestedSteps: [
        `Issue expedited PO for ${poUnits} units to ${poSupplier}.`,
        'Prioritize 280 units to Thane District Civil Hospital & Metro Apex Hospital ICUs upon arrival.',
        'Reserve 120 units as safety buffer at Bhiwandi WH-04.',
      ],
      recommendedAt: new Date().toLocaleTimeString() + ' IST',
      status: 'pending_review',
    };
    try {
      await onSubmitToQA(fakePoRec);
      setPoSubmitted(true);
    } catch (_) {
      // Submission failed
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
              DECISION SUPPORT ENGINE
            </span>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              RULE-BASED EXPLAINABLE ADVISORIES
            </span>
            {isSupabaseConfigured ? (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE ADVISORY ENGINE
              </span>
            ) : (
              <DemoBadge label="Demonstration Engine" size="sm" />
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Option Comparison & Strategic Recommendations
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare actionable options, evaluate stock demand vs reserve coverage, and submit proposed actions for human QA authorization.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setIsPoModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {isOptionBSubmitted ? 'View Urgent PO Draft' : 'Draft Urgent Purchase Order'}
          </button>
          <button
            onClick={() => onNavigate('approvals')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
          >
            Approval Queue
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* REQUIREMENT 6: DEMAND COVERAGE CHECK & OPTION COMPARISON WIDGET */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-700" />
              <h4 className="text-base font-bold text-slate-900 tracking-tight">
                Batch B2240 Demand Coverage Check & Actionable Options Comparison
              </h4>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluating whether Clean Batch B2240 (400 units) covers replacement demand (640) + 30-day normal demand (300).
            </p>
          </div>
          <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1 rounded">
            DEFICIT DETECTED: -540 UNITS
          </span>
        </div>

        {/* Demand Coverage Calculation Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">1. Replacement Demand (B2231)</span>
            <span className="text-lg font-bold text-slate-900 font-mono">640 units</span>
            <p className="text-[10px] text-slate-500 mt-0.5">25 customers (23 chemists, 2 hospitals)</p>
          </div>
          <div className="p-3 bg-white rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">2. 30-Day Normal Hospital Demand</span>
            <span className="text-lg font-bold text-slate-900 font-mono">300 units</span>
            <p className="text-[10px] text-slate-500 mt-0.5">ICU & Emergency baseline</p>
          </div>
          <div className="p-3 bg-teal-50 rounded border border-teal-200">
            <span className="text-[10px] text-teal-800 uppercase font-bold block mb-1">3. Available Batch B2240 Stock</span>
            <span className="text-lg font-bold text-teal-950 font-mono">400 units</span>
            <p className="text-[10px] text-teal-700 mt-0.5">WH-AHM-02 Reserve</p>
          </div>
          <div className="p-3 bg-rose-50 rounded border border-rose-200">
            <span className="text-[10px] text-rose-800 uppercase font-bold block mb-1">4. Net Coverage Deficit</span>
            <span className="text-lg font-bold text-rose-950 font-mono">-540 units</span>
            <p className="text-[10px] text-rose-700 font-semibold mt-0.5">INSUFFICIENT! Triggers PO</p>
          </div>
        </div>

        {/* Option Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Option A */}
          <div className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50/30 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="bg-purple-700 text-white font-bold text-[10px] px-2 py-0.5 rounded uppercase shrink-0">
                  Option A (Recommended Priority)
                </span>
                <span className="text-[10px] text-purple-800 font-bold shrink-0">Suggested Allocation</span>
              </div>
              <h5 className="font-bold text-sm text-slate-900">
                Allocate B2240 (400 Units) Prioritizing Hospital ICUs
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Suggested allocation: Reserve 280 units for Thane Civil Hospital (160) & Metro Apex Hospital (120) ICUs. Allocate remaining 120 units to top retail chemists.
              </p>
              {!isOptionABatchRegistered ? (
                <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded border border-amber-200 font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Batch {recA?.batchId} is not registered in the live database. Request submission disabled.</span>
                </div>
              ) : (
                <div className="text-[11px] text-purple-900 bg-purple-100/60 p-2 rounded border border-purple-200 font-medium">
                  Hospital Priority: Suggested recommendation, NOT an automatic decision. Requires QA sign-off.
                </div>
              )}
            </div>
            <button
              onClick={() => recA && handleSubmit(recA)}
              disabled={isSubmitting || isOptionASubmitted || !isOptionABatchRegistered}
              className="w-full py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-slate-200 disabled:text-slate-500 font-semibold text-xs rounded transition-colors flex items-center justify-center gap-1.5 text-white"
            >
              {!isOptionABatchRegistered ? (
                `Demo Batch ${recA?.batchId} (Unregistered in Live DB)`
              ) : isOptionASubmitted ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-200" />
                  Submitted to QA Queue
                </>
              ) : isSubmitting ? (
                'Submitting...'
              ) : (
                'Submit Option A to QA Queue'
              )}
            </button>
          </div>

          {/* Option B */}
          <div className="p-4 rounded-lg border-2 border-amber-200 bg-amber-50/30 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded uppercase shrink-0">
                  Option B (Required Expansion)
                </span>
                <span className="text-[10px] text-amber-800 font-bold shrink-0">Urgent Procurement</span>
              </div>
              <h5 className="font-bold text-sm text-slate-900">
                Draft Urgent Purchase Order (600 Units)
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Because B2240 reserve (400 units) is insufficient for total demand (940 units), draft an urgent PO for 600 units from primary manufacturer with 48h delivery terms.
              </p>
              <div className="text-[11px] text-amber-900 bg-amber-100/60 p-2 rounded border border-amber-200 font-medium">
                Bridges the 540-unit deficit and restores enterprise safety stock.
              </div>
            </div>
            <button
              onClick={() => setIsPoModalOpen(true)}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded transition-colors flex items-center justify-center gap-1.5"
            >
              {isOptionBSubmitted ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-200" />
                  View / Edit Urgent PO Draft
                </>
              ) : (
                'Draft & Open Urgent PO Modal'
              )}
            </button>
          </div>

          {/* Option C */}
          <div className="p-4 rounded-lg border-2 border-slate-200 bg-slate-50 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="bg-slate-700 text-white font-bold text-[10px] px-2 py-0.5 rounded uppercase shrink-0">
                  Option C (Secondary Contingency)
                </span>
                <span className="text-[10px] text-slate-600 font-bold shrink-0">Supplier Return & Transfer</span>
              </div>
              <h5 className="font-bold text-sm text-slate-900">
                Supplier Return Credit & Inter-Depot Transfer
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                File a formal Return Credit Note for the 180 warehouse units of B2231 and initiate inter-warehouse stock transfer of 300 units from Hyderabad WH-HYD-02.
              </p>
              {!isOptionCBatchRegistered ? (
                <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded border border-amber-200 font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Batch {recC?.batchId} is not registered in the live database. Request submission disabled.</span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-700 bg-slate-200/60 p-2 rounded border border-slate-300 font-medium">
                  Provides financial recovery via supplier credit note.
                </div>
              )}
            </div>
            <button
              onClick={() => recC && handleSubmit(recC)}
              disabled={isSubmitting || isOptionCSubmitted || !isOptionCBatchRegistered}
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-500 font-semibold text-xs rounded transition-colors flex items-center justify-center gap-1.5 text-white"
            >
              {!isOptionCBatchRegistered ? (
                `Demo Batch ${recC?.batchId} (Unregistered in Live DB)`
              ) : isOptionCSubmitted ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-300" />
                  Submitted to QA Queue
                </>
              ) : isSubmitting ? (
                'Submitting...'
              ) : (
                'Submit Option C to QA Queue'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Advisory Cards List */}
      <div className="space-y-5">
        {recommendations.map((rec) => {
          const targetType = rec.actionType === 'Quarantine' ? 'Quarantine Order' : 'Recall Authorization';
          const isCardBatchRegistered = isBatchRegistered(rec.batchId);
          const existingPending = isCardBatchRegistered
            ? approvals.find(
                (a) =>
                  a.status === 'pending' &&
                  a.batchId.toUpperCase() === rec.batchId.toUpperCase() &&
                  a.requestType.toLowerCase() === targetType.toLowerCase()
              )
            : undefined;
          const isSubmitted = submittedIds.includes(rec.id) || !!existingPending;

          return (
            <div
              key={rec.id}
              className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Card Header */}
              <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-bold text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                    {rec.id}
                  </span>
                  <button
                    onClick={() => onNavigate('traceability')}
                    className="font-mono font-bold text-xs text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-2 py-0.5 rounded transition-colors"
                  >
                    Batch {rec.batchId}
                  </button>
                  <span className="text-xs font-semibold text-slate-600">
                    {rec.drugName}
                  </span>
                  {!isCardBatchRegistered && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
                      Demo Batch — Not Registered in Live DB
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Model Confidence:</span>
                  <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                    {rec.confidenceScore}% (Demo)
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                    {rec.actionType}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4 text-xs">
                <div>
                  <h4 className="text-base font-bold text-slate-900 tracking-tight">
                    {rec.title}
                  </h4>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Recommended on {rec.recommendedAt} • Scope: <strong className="text-slate-700">{rec.impactRadius}</strong>
                  </p>
                </div>

                {!isCardBatchRegistered && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-950 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Batch <strong>{rec.batchId}</strong> is a demo-only batch and is not registered in the live database. The request cannot be submitted to the live QA approval queue.
                    </span>
                  </div>
                )}

                {/* Evidence Points */}
                {rec.evidencePoints && rec.evidencePoints.length > 0 && (
                  <div className="p-3 bg-teal-50/40 border border-teal-200 rounded-md space-y-1">
                    <span className="font-bold text-teal-900 block mb-1">
                      Supporting Evidence & Telemetry Findings:
                    </span>
                    <ul className="space-y-1 list-disc pl-4 text-teal-950">
                      {rec.evidencePoints.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                  <h5 className="font-bold text-slate-800 mb-1">
                    Quality & Regulatory Rationale (Advisory):
                  </h5>
                  <p className="text-slate-700 leading-relaxed">{rec.rationale}</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 mb-2">
                    Proposed Investigation & Quarantine Steps:
                  </h5>
                  <ul className="space-y-1.5 list-disc pl-4 text-slate-700">
                    {rec.suggestedSteps.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Advisory order only — quarantine or recall has NOT been executed.</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSubmitted ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {existingPending ? `Pending QA Sign-Off (${existingPending.id})` : 'Dispatched to QA Approval Queue'}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSubmit(rec)}
                        disabled={isSubmitting || !isCardBatchRegistered}
                        className="bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-500 text-white font-semibold text-xs px-4 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
                      >
                        <FileCheck2 className="w-4 h-4" />
                        {!isCardBatchRegistered
                          ? `Demo Batch ${rec.batchId} (Unregistered in Live DB)`
                          : isSubmitting
                          ? 'Submitting...'
                          : 'Submit Order to QA Approval Queue'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* REQUIREMENT 6: URGENT PURCHASE ORDER DRAFT MODAL */}
      {isPoModalOpen && (
        <Modal
          isOpen={isPoModalOpen}
          onClose={() => setIsPoModalOpen(false)}
          title="Draft Urgent Purchase Order (PO)"
          subtitle="Replenishment Procurement — Triggered by Stock Deficit Analysis"
          maxWidth="lg"
          footer={
            <>
              <button
                onClick={() => setIsPoModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              {!poSubmitted ? (
                <button
                  onClick={handlePoSubmit}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded shadow-xs flex items-center gap-1.5"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Submit Urgent PO to QA Queue
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsPoModalOpen(false);
                    onNavigate('approvals');
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 shadow-xs"
                >
                  View Order in Approval Queue →
                </button>
              )}
            </>
          }
        >
          <div className="space-y-4 text-xs">
            {poSubmitted ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-sm">Urgent Purchase Order Drafted & Sent to QA!</span>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  Purchase Order for {poUnits} units of Paracetamol Infusion 1000mg has been created and submitted to the QA Approval Queue for human authorization.
                </p>
              </div>
            ) : (
              <>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-950 space-y-1">
                  <span className="font-bold text-xs uppercase tracking-wide">
                    Deficit Procurement Rationale
                  </span>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Batch B2240 reserve (400 units) is insufficient to cover total demand (940 units = 640 recall replacement + 300 normal demand). An urgent PO of 600 units is recommended to bridge the 540-unit deficit.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Product SKU:</label>
                    <input
                      type="text"
                      readOnly
                      value="SKU-PCM-1000IV — Paracetamol Infusion 1000mg"
                      className="w-full p-2 rounded border border-slate-300 bg-slate-100 text-slate-800 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Order Quantity (Units):</label>
                    <input
                      type="number"
                      value={poUnits}
                      onChange={(e) => setPoUnits(e.target.value)}
                      className="w-full p-2 rounded border border-slate-300 font-mono font-bold text-slate-900 text-xs focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Supplier / Production Plant:</label>
                  <input
                    type="text"
                    value={poSupplier}
                    onChange={(e) => setPoSupplier(e.target.value)}
                    className="w-full p-2 rounded border border-slate-300 text-slate-800 text-xs focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Procurement Justification & Priority Notes:</label>
                  <textarea
                    rows={3}
                    value={poNotes}
                    onChange={(e) => setPoNotes(e.target.value)}
                    className="w-full p-2.5 rounded border border-slate-300 text-xs text-slate-800 focus:ring-1 focus:ring-teal-600 bg-slate-50"
                  />
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

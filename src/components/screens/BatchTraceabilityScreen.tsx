import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  MapPin,
  User,
  ArrowRight,
  Building2,
  Package,
  Layers,
  Boxes,
  Truck,
  Hospital,
  Store,
  ChevronDown,
  ChevronUp,
  Search,
  Lock,
} from 'lucide-react';
import type { TraceabilityNode, NavigationTab, BatchItem } from '../../types';
import { DemoBadge } from '../common/DemoBadge';
import { Modal } from '../common/Modal';
import { MOCK_B2231_RECALL_WORKFLOW, MOCK_BATCHES } from '../../data/mockData';
import { pharmacyService } from '../../services/pharmacyService';

interface BatchTraceabilityScreenProps {
  traceabilityNodes: TraceabilityNode[];
  onNavigate: (tab: NavigationTab) => void;
}

export const BatchTraceabilityScreen: React.FC<BatchTraceabilityScreenProps> = ({
  traceabilityNodes: initialNodes,
  onNavigate,
}) => {
  const [searchBatchId, setSearchBatchId] = useState<string>('B2231');
  const [currentBatch, setCurrentBatch] = useState<BatchItem>(MOCK_BATCHES[0]);
  const [nodes, setNodes] = useState<TraceabilityNode[]>(initialNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('NODE-04');
  const [isAiRecModalOpen, setIsAiRecModalOpen] = useState(false);
  const [isBlockBatchModalOpen, setIsBlockBatchModalOpen] = useState(false);
  const [isAdditionalChemistsExpanded, setIsAdditionalChemistsExpanded] = useState(false);
  const [blockNoticeSubmitted, setBlockNoticeSubmitted] = useState(false);

  // Fetch traceability when batchId changes
  useEffect(() => {
    async function loadTraceData() {
      const b = await pharmacyService.getBatchById(searchBatchId) || MOCK_BATCHES[0];
      setCurrentBatch(b);
      const fetchedNodes = await pharmacyService.getBatchTraceability(searchBatchId);
      setNodes(fetchedNodes);
      if (fetchedNodes.length > 0) {
        setSelectedNodeId(fetchedNodes[0].id);
      }
    }
    loadTraceData();
  }, [searchBatchId]);

  const isB2231 = currentBatch.id.toUpperCase() === 'B2231';

  const selectedNode =
    nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const recallData = MOCK_B2231_RECALL_WORKFLOW;
  const hospitals = recallData.customerList.filter((c) => c.type === 'hospital');
  const chemists = recallData.customerList.filter((c) => c.type === 'chemist');
  const topChemists = chemists.slice(0, 5);
  const additionalChemists = chemists.slice(5);

  const getStatusBadge = (status: TraceabilityNode['status']) => {
    switch (status) {
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Passed QC
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Surveillance Flag
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
            <AlertOctagon className="w-3 h-3 text-rose-600" /> Sensor Anomaly
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            <Clock className="w-3 h-3 text-slate-500" /> Pending QA Gate
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Select Batch Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <label htmlFor="batch-search-select" className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Batch Trace Search:
          </label>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <select
            id="batch-search-select"
            value={searchBatchId}
            onChange={(e) => setSearchBatchId(e.target.value)}
            className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600 bg-slate-50 text-slate-900"
          >
            {MOCK_BATCHES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id} — {b.drugName} ({b.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <DemoBadge label="Full Traceability Lineage" size="sm" />
        </div>
      </div>

      {/* Target Batch Header Card */}
      <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded">
              BATCH ID: {currentBatch.id}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${
              currentBatch.status === 'under_review'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : currentBatch.status === 'quarantined'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {currentBatch.status.replace('_', ' ')}
            </span>
            {isB2231 && (
              <span className="text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded">
                CYPHER 2026 RECALL CASE STUDY
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            {currentBatch.drugName} ({currentBatch.dosageForm} • {currentBatch.strength})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Mfg: {currentBatch.manufacturingDate} • Expiry: {currentBatch.expiryDate} • Stock: {currentBatch.batchSizeUnits.toLocaleString()} units @ {currentBatch.currentWarehouse}
          </p>
          <p className="text-[11px] text-slate-600 mt-1">
            <strong>Manufacturer / Supplier:</strong> {currentBatch.manufacturerName || 'Arogya Formulation Works'} (Lot: {currentBatch.manufacturerLotNumber || 'LOT-VERIFIED'})
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {isB2231 && (
            <button
              onClick={() => setIsBlockBatchModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              Block Dispatch & Draft Customer Notices
            </button>
          )}
          <button
            onClick={() => setIsAiRecModalOpen(true)}
            className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs px-3.5 py-2.5 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
          >
            Trigger AI Recommendations
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Left Node Tree / Right Telemetry Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Timeline / Lineage (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Provenance Pipeline for Batch {currentBatch.id}
            </h4>
            <span className="text-xs text-slate-500">
              Select stage to view parameters
            </span>
          </div>

          <div className="space-y-3">
            {nodes.map((node, index) => {
              const isSelected = selectedNodeId === node.id;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`relative p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-teal-500/40'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                          node.status === 'critical'
                            ? 'bg-rose-500 text-white'
                            : node.status === 'warning'
                            ? 'bg-amber-500 text-white'
                            : isSelected
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <h5
                          className={`font-bold text-sm ${
                            isSelected ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {node.stage}
                        </h5>
                        <p
                          className={`text-xs mt-0.5 ${
                            isSelected ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          {node.facility}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">{getStatusBadge(node.status)}</div>
                  </div>

                  <div
                    className={`mt-3 pt-2 text-xs flex flex-wrap items-center justify-between gap-2 border-t ${
                      isSelected ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {node.timestamp}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {node.location}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Node Inspector (5 cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-20 bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  Stage Diagnostics Inspector
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedNode.stage}
                </h4>
                <p className="text-xs text-slate-500">{selectedNode.facility}</p>
              </div>
              <div>{getStatusBadge(selectedNode.status)}</div>
            </div>

            {/* Stage Operator & Location */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Certified Operator:
                </span>
                <span className="font-semibold text-slate-800">{selectedNode.operator}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> Location:
                </span>
                <span className="font-semibold text-slate-800 text-right">{selectedNode.location}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Timestamp:
                </span>
                <span className="font-mono font-medium text-slate-800">{selectedNode.timestamp}</span>
              </div>
            </div>

            {/* In-spec / Out-of-spec Parameters */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Assay & Telemetry Parameters
              </h5>
              <div className="space-y-1.5">
                {selectedNode.parameters.map((param, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded border text-xs flex flex-col justify-between gap-1 ${
                      param.isOutOfSpec
                        ? 'bg-rose-50/60 border-rose-200 text-rose-950 font-medium'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">{param.key}</span>
                      <span
                        className={`font-mono font-bold ${
                          param.isOutOfSpec ? 'text-rose-700' : 'text-slate-900'
                        }`}
                      >
                        {param.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {selectedNode.notes && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="font-bold text-slate-800 block mb-1">
                  Stage Evaluation Notes:
                </span>
                <p className="text-slate-600 leading-relaxed">{selectedNode.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REQUIREMENT 3 & 5: DEDICATED B2231 RECALL & CUSTOMER WORKFLOW (ONLY DISPLAYED FOR B2231!) */}
      {isB2231 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-700" />
                  Batch B2231 Recall & Customer Exposure Workflow
                </h4>
                <DemoBadge label="VERIFIED B2231 MODEL" size="sm" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact Cypher 2026 Problem Statement 7 distribution records: 180 warehouse units + 640 dispatched to 25 customers.
              </p>
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
              Total Target Consignment Scope: <strong className="text-slate-800">{recallData.totalScopeUnits} units</strong>
            </div>
          </div>

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/40">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-900 mb-1">
                <span>WAREHOUSE DOCK HOLD</span>
                <Boxes className="w-4 h-4 text-amber-700" />
              </div>
              <div className="text-2xl font-bold text-amber-900">
                {recallData.unitsInWarehouse} units
              </div>
              <p className="text-[11px] text-amber-800 mt-1">
                Remaining at Bhiwandi Hub WH-04 dock hold.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-rose-200 bg-rose-50/40">
              <div className="flex items-center justify-between text-xs font-semibold text-rose-900 mb-1">
                <span>PREVIOUSLY DISPATCHED</span>
                <Truck className="w-4 h-4 text-rose-700" />
              </div>
              <div className="text-2xl font-bold text-rose-900">
                {recallData.unitsDispatched} units
              </div>
              <p className="text-[11px] text-rose-800 mt-1">
                Traced across regional customer supply chain.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-sky-200 bg-sky-50/40">
              <div className="flex items-center justify-between text-xs font-semibold text-sky-900 mb-1">
                <span>AFFECTED CUSTOMERS</span>
                <Building2 className="w-4 h-4 text-sky-700" />
              </div>
              <div className="text-2xl font-bold text-sky-900">
                {recallData.affectedCustomers.total} Customers
              </div>
              <div className="text-[11px] text-sky-800 mt-1 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" /> {recallData.affectedCustomers.chemists} Chemists •
                <Hospital className="w-3.5 h-3.5 ml-1" /> {recallData.affectedCustomers.hospitals} Hospitals
              </div>
            </div>

            <div className="p-4 rounded-lg border border-teal-200 bg-teal-50/40">
              <div className="flex items-center justify-between text-xs font-semibold text-teal-900 mb-1">
                <span>CLEAN BATCH B2240</span>
                <Layers className="w-4 h-4 text-teal-700" />
              </div>
              <div className="text-2xl font-bold text-teal-900">
                {recallData.replacementBatch.availableUnits} units
              </div>
              <p className="text-[11px] text-teal-800 mt-1">
                Separate reserve stock at WH-AHM-02.
              </p>
            </div>
          </div>

          {/* Customer Distribution Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Distribution Breakdown (25 Customers: 23 Chemists, 2 Hospitals)
              </h5>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Sum: 640 dispatched units
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white text-xs divide-y divide-slate-100 shadow-xs">
              {/* Group 1: Acute-Care Hospitals */}
              <div className="bg-purple-50/80 px-3.5 py-2 border-b border-purple-100 flex items-center justify-between text-purple-900 font-semibold text-xs">
                <span className="flex items-center gap-1.5">
                  <Hospital className="w-3.5 h-3.5 text-purple-700" />
                  Priority Inpatient Hospitals (2 Distinct Records)
                </span>
                <span className="font-mono text-purple-950 font-bold">280 units subtotal</span>
              </div>

              {hospitals.map((cust) => (
                <div key={cust.id} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{cust.name}</span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">{cust.id}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border bg-purple-50 text-purple-800 border-purple-200">
                        HOSPITAL (ICU)
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      {cust.location} • Contact: {cust.contactPerson}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 font-mono text-xs">
                      {cust.unitsAllocated} units
                    </span>
                    <p className="text-[10px] text-slate-400">Dispatched: {cust.dispatchDate}</p>
                  </div>
                </div>
              ))}

              {/* Group 2: Top 5 Chemists */}
              <div className="bg-blue-50/80 px-3.5 py-2 border-y border-blue-100 flex items-center justify-between text-blue-900 font-semibold text-xs">
                <span className="flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-blue-700" />
                  Primary Retail Chemists (Top 5 Records)
                </span>
                <span className="font-mono text-blue-950 font-bold">130 units subtotal</span>
              </div>

              {topChemists.map((cust) => (
                <div key={cust.id} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{cust.name}</span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">{cust.id}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border bg-blue-50 text-blue-800 border-blue-200">
                        RETAIL CHEMIST
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      {cust.location} • Contact: {cust.contactPerson}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 font-mono text-xs">
                      {cust.unitsAllocated} units
                    </span>
                    <p className="text-[10px] text-slate-400">Dispatched: {cust.dispatchDate}</p>
                  </div>
                </div>
              ))}

              {/* Group 3: Expandable 18 Chemists */}
              <div className="border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAdditionalChemistsExpanded(!isAdditionalChemistsExpanded)}
                  className="w-full px-3.5 py-2.5 bg-slate-100/90 hover:bg-slate-200/80 transition-colors flex items-center justify-between text-left text-xs font-semibold text-slate-800"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Store className="w-3.5 h-3.5 text-slate-600" />
                    <span>18 Additional Retail Chemists</span>
                    <span className="text-[11px] font-normal text-slate-600">
                      (18 distinct records CUST-C06 to CUST-C23 • 230 units)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-teal-700 font-bold text-xs shrink-0">
                    <span>{isAdditionalChemistsExpanded ? 'Hide 18 Chemists' : 'Expand 18 Chemists'}</span>
                    {isAdditionalChemistsExpanded ? (
                      <ChevronUp className="w-4 h-4 text-teal-700" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-teal-700" />
                    )}
                  </div>
                </button>

                {isAdditionalChemistsExpanded && (
                  <div className="divide-y divide-slate-100 bg-slate-50/40 border-t border-slate-200">
                    {additionalChemists.map((cust) => (
                      <div
                        key={cust.id}
                        className="p-3 pl-5 flex items-start justify-between gap-3 hover:bg-slate-100/60 transition-colors border-l-2 border-teal-500"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-900">{cust.name}</span>
                            <span className="text-[10px] font-mono font-bold text-slate-500">{cust.id}</span>
                          </div>
                          <p className="text-slate-500 text-[11px]">
                            {cust.location} • Contact: {cust.contactPerson}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-slate-900 font-mono text-xs">
                            {cust.unitsAllocated} units
                          </span>
                          <p className="text-[10px] text-slate-400">Dispatched: {cust.dispatchDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verified Totals */}
              <div className="p-3 bg-slate-100 border-t border-slate-200 text-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-medium">
                  Verified Arithmetic: 2 Hospitals (280) + 5 Top Chemists (130) + 18 Chemists (230)
                </span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  = 640 Dispatched Units (25 Records)
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CLEAN BATCH CUSTOMER & DISPATCH SUMMARY FOR UNRELATED BATCHES */
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h4 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-700" />
                Dispatch & Customer Distribution Record — Batch {currentBatch.id}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Current Warehouse Stock: <strong>{currentBatch.batchSizeUnits.toLocaleString()} units</strong> @ {currentBatch.currentWarehouse}
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
              Standard Distribution Log
            </span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
            <p className="text-slate-700">
              <strong>Product Details:</strong> {currentBatch.drugName} ({currentBatch.dosageForm} • {currentBatch.strength})
            </p>
            <p className="text-slate-700">
              <strong>Manufacturer:</strong> {currentBatch.manufacturerName || 'Arogya Formulation Works'} (Lot: {currentBatch.manufacturerLotNumber || 'LOT-VERIFIED'})
            </p>
            <p className="text-slate-700">
              <strong>Storage Specification:</strong> {currentBatch.storageCondition}
            </p>
            <p className="text-slate-600 italic pt-1">
              No active recall exposure or customer containment alert associated with Batch {currentBatch.id}. Nominal batch operations.
            </p>
          </div>
        </div>
      )}

      {/* Block Batch & Draft Customer Notices Modal */}
      {isBlockBatchModalOpen && (
        <Modal
          isOpen={isBlockBatchModalOpen}
          onClose={() => setIsBlockBatchModalOpen(false)}
          title="Block Batch B2231 & Draft Customer Advisory Notices"
          subtitle="Demo Workflow Action — Prevent Secondary Dispatch & Notify Consignees"
          maxWidth="lg"
          footer={
            <>
              <button
                onClick={() => setIsBlockBatchModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >
                Close
              </button>
              {!blockNoticeSubmitted ? (
                <button
                  onClick={() => {
                    setBlockNoticeSubmitted(true);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-xs"
                >
                  Submit Block & Dispatch Notices to QA
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsBlockBatchModalOpen(false);
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
            {blockNoticeSubmitted ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-sm">Dock Block & Draft Advisories Submitted!</span>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  Batch B2231 dock hold flag committed. Draft advisory notices for 25 consignees (23 chemists, 2 hospitals) submitted to QA Approval Queue for final sign-off.
                </p>
              </div>
            ) : (
              <>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-950 space-y-1">
                  <span className="font-bold text-xs uppercase tracking-wide">
                    Precautionary Hold Action
                  </span>
                  <p className="text-[11px] text-rose-900 leading-relaxed">
                    This action blocks Batch B2231 from further ERP allocation and generates pre-filled advisory draft notices for 25 consignees. Authorization remains pending until QA sign-off.
                  </p>
                </div>

                <div className="space-y-2">
                  <h5 className="font-bold text-slate-900">Target Consignees to Notify (640 Dispatched Units):</h5>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-700 space-y-1 font-mono text-[11px]">
                    <p>• 2 Acute-Care Hospitals: Thane Civil Hospital (160), Metro Apex (120)</p>
                    <p>• 23 Retail Chemists: Apollo Station Rd, MedPlus Ghodbunder, Wellness Forever, etc. (360 units)</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800 block">Draft Customer Notice Text:</label>
                  <textarea
                    rows={3}
                    readOnly
                    value="URGENT PRECAUTIONARY ADVISORY: Arogya Pharma requests dock hold and inventory verification for Batch B2231 (Paracetamol Infusion IP 1000mg/100ml) pending laboratory stability assay. Please segregate remaining stock."
                    className="w-full p-2.5 rounded border border-slate-300 text-xs bg-slate-50 text-slate-800 font-mono"
                  />
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* AI Recommendation Modal */}
      {isAiRecModalOpen && (
        <Modal
          isOpen={isAiRecModalOpen}
          onClose={() => setIsAiRecModalOpen(false)}
          title={`AI Advisory for Batch ${currentBatch.id}`}
          subtitle="Simulated Decision Support — Pending Qualified Review"
          maxWidth="lg"
          footer={
            <>
              <button
                onClick={() => setIsAiRecModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsAiRecModalOpen(false);
                  onNavigate('recommendations');
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 rounded hover:bg-teal-800"
              >
                Open Recommendations Console →
              </button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Target: {currentBatch.drugName}</span>
              <p className="text-slate-600">Current Status: {currentBatch.status.toUpperCase()} • Location: {currentBatch.currentWarehouse}</p>
            </div>
            <p className="text-slate-700 leading-relaxed">
              {isB2231
                ? 'Precautionary hold recommended on 180 warehouse units and customer notices for 640 dispatched units across 25 consignees. Replacement Batch B2240 (400 units) available in reserve.'
                : `Batch ${currentBatch.id} is currently operating under status ${currentBatch.status.toUpperCase()}. No thermal or chemical deviations logged.`}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

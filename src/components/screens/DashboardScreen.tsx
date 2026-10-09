import React, { useState } from 'react';
import {
  Boxes,
  AlertTriangle,
  Clock,
  FileCheck2,
  AlertOctagon,
  MapPin,
  ExternalLink,
  Package,
  ShoppingCart,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { DataTable } from '../common/DataTable';
import type { Column } from '../common/DataTable';
import { SeverityBadge, AlertStatusBadge } from '../common/StatusBadge';
import { DemoBadge } from '../common/DemoBadge';
import { Modal } from '../common/Modal';
import type {
  DashboardMetrics,
  RiskAlert,
  NavigationTab,
} from '../../types';

interface DashboardScreenProps {
  metrics: DashboardMetrics;
  alerts: RiskAlert[];
  onNavigate: (tab: NavigationTab) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  metrics,
  alerts,
  onNavigate,
}) => {
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);

  // Table columns matching requirement 4: risk type, batch ID, severity, warehouse and status
  const alertColumns: Column<RiskAlert>[] = [
    {
      key: 'riskType',
      header: 'Risk Type',
      render: (alert) => (
        <span className="font-semibold text-slate-900">{alert.riskType}</span>
      ),
    },
    {
      key: 'batchId',
      header: 'Batch ID',
      render: (alert) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate('traceability');
          }}
          className="font-mono font-bold text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1"
        >
          {alert.batchId}
          <ExternalLink className="w-3 h-3 text-teal-600" />
        </button>
      ),
    },
    {
      key: 'drugName',
      header: 'Pharmaceutical Product',
      render: (alert) => (
        <span className="text-slate-700 truncate max-w-xs block font-medium">
          {alert.drugName}
        </span>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (alert) => <SeverityBadge severity={alert.severity} />,
    },
    {
      key: 'warehouse',
      header: 'Warehouse / Location',
      render: (alert) => (
        <span className="text-slate-600 text-xs flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate max-w-[200px]">{alert.warehouse}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (alert) => <AlertStatusBadge status={alert.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Header: What needs my attention today? */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="bg-purple-100 text-purple-900 font-bold text-[11px] px-2.5 py-0.5 rounded border border-purple-200">
              OPERATIONS & RISK EXECUTIVE CONSOLE
            </span>
            <DemoBadge label="Real-Time Data Feed" size="sm" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            What Needs My Attention Today?
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Prioritized supply chain risk triage, cold-chain telemetry breaches, recall exposure, and pending QA sign-offs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('inventory')}
            className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Package className="w-3.5 h-3.5" />
            + Register New Batch
          </button>
        </div>
      </div>

      {/* Prioritized Action List */}
      <div className="bg-gradient-to-br from-slate-900 via-navy-900 to-slate-900 rounded-lg p-5 text-white shadow-md border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Prioritized Action List (5 Urgent Items Needing Human Review)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
            Rule-Based Triaging Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Action 1: B2231 Recall */}
          <div
            onClick={() => onNavigate('traceability')}
            className="bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 rounded-md p-3 cursor-pointer transition-all space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="bg-rose-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded uppercase">
                #1 CRITICAL RECALL
              </span>
              <span className="text-[10px] font-mono text-rose-300">Batch B2231</span>
            </div>
            <h4 className="font-bold text-xs text-white group-hover:text-rose-200 transition-colors">
              Dock Hold & 25 Customer Notices (B2231)
            </h4>
            <p className="text-[11px] text-slate-300 leading-snug">
              180 units in warehouse dock hold + 640 units dispatched to 25 customers (23 chemists, 2 hospitals).
            </p>
            <div className="text-[11px] font-semibold text-rose-300 flex items-center justify-end gap-1 pt-1">
              <span>Inspect Recall Workflow</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Action 2: Shortage & Urgent PO */}
          <div
            onClick={() => onNavigate('recommendations')}
            className="bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 rounded-md p-3 cursor-pointer transition-all space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="bg-amber-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded uppercase">
                #2 CRITICAL SHORTAGE
              </span>
              <span className="text-[10px] font-mono text-amber-300">Paracetamol IV</span>
            </div>
            <h4 className="font-bold text-xs text-white group-hover:text-amber-200 transition-colors">
              Deficit of 540 Units — Draft Urgent PO
            </h4>
            <p className="text-[11px] text-slate-300 leading-snug">
              Batch B2240 reserve (400 units) covers only 42.5% of total demand (940 units). Urgent PO required.
            </p>
            <div className="text-[11px] font-semibold text-amber-300 flex items-center justify-end gap-1 pt-1">
              <span>Review Urgent PO Draft</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Action 3: Temp Breach B2230 */}
          <div
            onClick={() => onNavigate('traceability')}
            className="bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 rounded-md p-3 cursor-pointer transition-all space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="bg-sky-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded uppercase">
                #3 TEMP EXCURSION
              </span>
              <span className="text-[10px] font-mono text-sky-300">Batch B2230</span>
            </div>
            <h4 className="font-bold text-xs text-white group-hover:text-sky-200 transition-colors">
              Insulin Cold Room 12.8°C Excursion
            </h4>
            <p className="text-[11px] text-slate-300 leading-snug">
              18,000 cartridges in WH-BLR-01. SEC-HPLC bio-assay re-test recommended before lot disposition.
            </p>
            <div className="text-[11px] font-semibold text-sky-300 flex items-center justify-end gap-1 pt-1">
              <span>Inspect Telemetry Tree</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Action 4: FEFO Violation */}
          <div
            onClick={() => onNavigate('inventory')}
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-md p-3 cursor-pointer transition-all space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="bg-purple-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded uppercase">
                #4 FEFO VIOLATION
              </span>
              <span className="text-[10px] font-mono text-purple-300">Batch B2229</span>
            </div>
            <h4 className="font-bold text-xs text-white group-hover:text-purple-200 transition-colors">
              Later Expiry Dispatched First
            </h4>
            <p className="text-[11px] text-slate-300 leading-snug">
              Batch B2229 dispatched while older Batch B2228 remains in warehouse. Prioritize older stock.
            </p>
            <div className="text-[11px] font-semibold text-purple-300 flex items-center justify-end gap-1 pt-1">
              <span>Inspect Batch Inventory</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Action 5: Pending Sign-Offs */}
          <div
            onClick={() => onNavigate('approvals')}
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-md p-3 cursor-pointer transition-all space-y-1.5 group md:col-span-2 lg:col-span-2"
          >
            <div className="flex items-center justify-between">
              <span className="bg-teal-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded uppercase">
                #5 QA APPROVAL QUEUE
              </span>
              <span className="text-[10px] font-mono text-teal-300">5 Pending Orders</span>
            </div>
            <h4 className="font-bold text-xs text-white group-hover:text-teal-200 transition-colors">
              5 Authorizations Awaiting QA Officer Digital Sign-Off
            </h4>
            <p className="text-[11px] text-slate-300 leading-snug">
              Includes Dock Quarantine for B2231, Customer Advisory Draft, and Pallet #3 Disposal Order.
            </p>
            <div className="text-[11px] font-semibold text-teal-300 flex items-center justify-end gap-1 pt-1">
              <span>Open Approval Console ({metrics.pendingApprovals} Pending)</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metrics Cards (7 Cards as per Requirement 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <MetricCard
          title="Total Stock Units"
          value="317,400"
          subtitle="Enterprise warehouse total"
          icon={Boxes}
          variant="default"
          onClick={() => onNavigate('inventory')}
        />
        <MetricCard
          title="Tracked Batches"
          value={metrics.totalTrackedBatches.toLocaleString()}
          subtitle="Active lot master"
          icon={Package}
          variant="default"
          onClick={() => onNavigate('inventory')}
        />
        <MetricCard
          title="Expiring Stock"
          value={`${metrics.expiringBatches} Lots`}
          subtitle="Within 90-day threshold"
          icon={Clock}
          variant="warning"
          onClick={() => onNavigate('inventory')}
        />
        <MetricCard
          title="Active Risks"
          value={metrics.activeRiskAlerts}
          subtitle="4 Critical deviations"
          icon={AlertTriangle}
          variant="danger"
          onClick={() => onNavigate('alerts')}
        />
        <MetricCard
          title="Recall Status"
          value="1 Scope"
          subtitle="Batch B2231 (820 units)"
          icon={AlertOctagon}
          variant="danger"
          onClick={() => onNavigate('traceability')}
        />
        <MetricCard
          title="Medicine Shortages"
          value="2 Critical"
          subtitle="PCM IV & Insulin"
          icon={ShoppingCart}
          variant="warning"
          onClick={() => onNavigate('recommendations')}
        />
        <MetricCard
          title="Pending Approvals"
          value={metrics.pendingApprovals}
          subtitle="Awaiting QA Sign-off"
          icon={FileCheck2}
          variant="teal"
          onClick={() => onNavigate('approvals')}
        />
      </div>

      {/* High Priority Active Alerts Section */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h4 className="text-base font-bold text-slate-900 tracking-tight">
            High Priority Active Risk Alerts
          </h4>
          <p className="text-xs text-slate-500">
            Real-time feed filtered by severity & cold-chain impact
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DemoBadge label="Synthetic Risk Feed" size="sm" />
          <button
            onClick={() => onNavigate('alerts')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline"
          >
            View All ({alerts.length}) →
          </button>
        </div>
      </div>

      {/* Alerts Table (Requirement 4) */}
      <DataTable
        columns={alertColumns}
        data={alerts}
        keyExtractor={(item) => item.id}
        onRowClick={(item) => setSelectedAlert(item)}
      />

      {/* Alert Inspection Modal */}
      {selectedAlert && (
        <Modal
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          title={`Alert Details — ${selectedAlert.id}`}
          subtitle={`Detected on ${selectedAlert.detectedAt}`}
          footer={
            <>
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedAlert(null);
                  onNavigate('traceability');
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 rounded hover:bg-teal-800"
              >
                Inspect Batch {selectedAlert.batchId}
              </button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded border border-slate-200">
              <div>
                <span className="text-slate-500 font-medium">Batch ID:</span>
                <p className="font-mono font-bold text-slate-900 text-sm">
                  {selectedAlert.batchId}
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Product:</span>
                <p className="font-bold text-slate-900">{selectedAlert.drugName}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Severity:</span>
                <div className="mt-0.5">
                  <SeverityBadge severity={selectedAlert.severity} />
                </div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Affected Units:</span>
                <p className="font-semibold text-slate-800">
                  {selectedAlert.affectedUnits.toLocaleString()} units
                </p>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-900 mb-1">Deviation Summary</h5>
              <p className="text-slate-700 leading-relaxed bg-white p-3 border border-slate-200 rounded">
                {selectedAlert.description}
              </p>
            </div>

            {selectedAlert.telemetrySummary && (
              <div>
                <h5 className="font-bold text-slate-900 mb-1">
                  Telemetry & Diagnostics Log
                </h5>
                <pre className="text-[11px] font-mono bg-slate-900 text-emerald-400 p-3 rounded overflow-x-auto">
                  {selectedAlert.telemetrySummary}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

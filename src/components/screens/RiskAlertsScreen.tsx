import React, { useState } from 'react';
import { Search, Filter, ExternalLink } from 'lucide-react';
import { DataTable } from '../common/DataTable';
import type { Column } from '../common/DataTable';
import { SeverityBadge, AlertStatusBadge } from '../common/StatusBadge';
import { DemoBadge } from '../common/DemoBadge';
import { Modal } from '../common/Modal';
import type { RiskAlert, NavigationTab } from '../../types';

interface RiskAlertsScreenProps {
  alerts: RiskAlert[];
  onNavigate: (tab: NavigationTab) => void;
}

export const RiskAlertsScreen: React.FC<RiskAlertsScreenProps> = ({
  alerts,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);

  const filteredAlerts = alerts.filter((alert) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return severityFilter === 'all' || alert.severity === severityFilter;
    }
    const matchesSearch =
      (alert.id || '').toLowerCase().includes(q) ||
      (alert.batchId || '').toLowerCase().includes(q) ||
      (alert.drugName || '').toLowerCase().includes(q) ||
      (alert.riskType || '').toLowerCase().includes(q) ||
      (alert.warehouse || '').toLowerCase().includes(q) ||
      (alert.description || '').toLowerCase().includes(q) ||
      (alert.telemetrySummary && alert.telemetrySummary.toLowerCase().includes(q)) ||
      (alert.recommendedAction && alert.recommendedAction.toLowerCase().includes(q));

    const matchesSeverity =
      severityFilter === 'all' || alert.severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  const columns: Column<RiskAlert>[] = [
    {
      key: 'id',
      header: 'Alert ID',
      render: (alert) => (
        <span className="font-mono font-bold text-slate-800 text-xs">
          {alert.id}
        </span>
      ),
    },
    {
      key: 'riskType',
      header: 'Risk Classification',
      render: (alert) => (
        <span className="font-semibold text-slate-900">{alert.riskType}</span>
      ),
    },
    {
      key: 'batchId',
      header: 'Target Batch',
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
      header: 'Product Name',
      render: (alert) => (
        <span className="text-slate-700 font-medium truncate max-w-xs block">
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
      header: 'Assigned Facility',
      render: (alert) => (
        <span className="text-xs text-slate-600 truncate max-w-[200px] block" title={alert.warehouse}>
          {alert.warehouse}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (alert) => <AlertStatusBadge status={alert.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (alert) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAlert(alert);
          }}
          className="text-xs font-semibold text-teal-700 hover:text-teal-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded transition-colors"
        >
          Investigate
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Search and Severity Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Alert ID, Batch B2231, Risk Type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 bg-slate-50"
          />
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Severity:
          </span>
          {[
            { id: 'all', label: 'All Severities' },
            { id: 'critical', label: 'Critical' },
            { id: 'high', label: 'High' },
            { id: 'medium', label: 'Medium' },
            { id: 'low', label: 'Low' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSeverityFilter(pill.id)}
              className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                severityFilter === pill.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Active alerts queue: <strong className="text-slate-800">{filteredAlerts.length}</strong> incidents
          </p>
          <DemoBadge label="Synthetic Risk Events" size="sm" />
        </div>

        <DataTable
          columns={columns}
          data={filteredAlerts}
          keyExtractor={(a) => a.id}
          onRowClick={(a) => setSelectedAlert(a)}
        />
      </div>

      {/* Alert Investigation Modal */}
      {selectedAlert && (
        <Modal
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          title={`Alert Investigation: ${selectedAlert.id}`}
          subtitle={`Logged on ${selectedAlert.detectedAt}`}
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
                  onNavigate('recommendations');
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded hover:bg-teal-700"
              >
                View AI Mitigation Plan
              </button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 font-medium">Alert ID:</span>
                <p className="font-mono font-bold text-slate-900">{selectedAlert.id}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Batch ID:</span>
                <p className="font-mono font-bold text-teal-800">{selectedAlert.batchId}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Severity:</span>
                <div className="mt-0.5">
                  <SeverityBadge severity={selectedAlert.severity} />
                </div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Status:</span>
                <div className="mt-0.5">
                  <AlertStatusBadge status={selectedAlert.status} />
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
              <h5 className="font-bold text-slate-900">Incident Description</h5>
              <p className="text-slate-700 leading-relaxed">{selectedAlert.description}</p>
              <p className="text-slate-500 text-[11px] pt-1">
                Facility: <strong className="text-slate-700">{selectedAlert.warehouse}</strong> • Units Impacted:{' '}
                <strong className="text-slate-700">{selectedAlert.affectedUnits.toLocaleString()} units</strong>
              </p>
            </div>

            {selectedAlert.telemetrySummary && (
              <div className="p-3 bg-slate-900 rounded-lg space-y-1">
                <span className="font-mono text-[10px] text-teal-400 font-bold uppercase tracking-wider block">
                  IoT Sensor Gateway Diagnostic Log
                </span>
                <p className="font-mono text-emerald-400 text-[11px] leading-relaxed">
                  {selectedAlert.telemetrySummary}
                </p>
              </div>
            )}

            {selectedAlert.recommendedAction && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-1">
                <span className="font-semibold text-purple-900 block">
                  Recommended Action & Mitigation Plan
                </span>
                <p className="text-purple-800 leading-relaxed text-xs">
                  {selectedAlert.recommendedAction}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Search, Filter, ShieldAlert, Plus, Edit3, Barcode, CheckCircle2, Truck } from 'lucide-react';
import { DataTable } from '../common/DataTable';
import type { Column } from '../common/DataTable';
import { BatchStatusBadge } from '../common/StatusBadge';
import { DemoBadge } from '../common/DemoBadge';
import { Modal } from '../common/Modal';
import type { BatchItem, NavigationTab, RegisterBatchInput, UpdateBatchInput } from '../../types';
import { RegisterBatchModal } from '../inventory/RegisterBatchModal';
import { EditBatchModal } from '../inventory/EditBatchModal';
import { pharmacyService } from '../../services/pharmacyService';

interface BatchInventoryScreenProps {
  batches: BatchItem[];
  onNavigate: (tab: NavigationTab) => void;
  onBatchCreated?: (batch: BatchItem) => void;
  onBatchUpdated?: (batch: BatchItem) => void;
}

export const BatchInventoryScreen: React.FC<BatchInventoryScreenProps> = ({
  batches,
  onNavigate,
  onBatchCreated,
  onBatchUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [inspectedBatch, setInspectedBatch] = useState<BatchItem | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchItem | null>(null);
  const [recentRegisteredBatch, setRecentRegisteredBatch] = useState<BatchItem | null>(null);

  // Test Dispatch Simulation State
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchBatchId, setDispatchBatchId] = useState<string>('B2231');
  const [dispatchQuantity, setDispatchQuantity] = useState<number>(100);
  const [dispatchResult, setDispatchResult] = useState<{
    success: boolean;
    message: string;
    batchId: string;
    status?: string;
  } | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.drugName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.currentWarehouse.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === 'all' || b.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleBatchRegistered = async (input: RegisterBatchInput) => {
    const newBatch = await pharmacyService.registerBatch(input);
    if (onBatchCreated) {
      onBatchCreated(newBatch);
    }
    setRecentRegisteredBatch(newBatch);
    return newBatch;
  };

  const handleBatchUpdated = async (input: UpdateBatchInput) => {
    const updated = await pharmacyService.updateBatch(input);
    if (onBatchUpdated) {
      onBatchUpdated(updated);
    }
    if (inspectedBatch && inspectedBatch.id === updated.id) {
      setInspectedBatch(updated);
    }
    return updated;
  };

  const columns: Column<BatchItem>[] = [
    {
      key: 'id',
      header: 'Batch ID',
      render: (batch) => (
        <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
          {batch.id}
        </span>
      ),
    },
    {
      key: 'drugName',
      header: 'Product & Dosage',
      render: (batch) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-900">{batch.drugName}</span>
            {batch.productSku && (
              <span className="font-mono text-[10px] text-teal-700 bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                {batch.productSku}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{batch.dosageForm} • {batch.strength}</p>
        </div>
      ),
    },
    {
      key: 'batchSizeUnits',
      header: 'Batch Size',
      render: (batch) => (
        <span className="font-medium text-slate-700">
          {batch.batchSizeUnits.toLocaleString()} units
        </span>
      ),
    },
    {
      key: 'dates',
      header: 'Mfg / Expiry',
      render: (batch) => (
        <div className="text-xs">
          <p className="text-slate-600">Mfg: {batch.manufacturingDate}</p>
          <p className="font-medium text-slate-800">Exp: {batch.expiryDate}</p>
        </div>
      ),
    },
    {
      key: 'currentWarehouse',
      header: 'Current Location',
      render: (batch) => (
        <span className="text-xs text-slate-600 truncate max-w-[200px] block" title={batch.currentWarehouse}>
          {batch.currentWarehouse}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (batch) => <BatchStatusBadge status={batch.status} />,
    },
    {
      key: 'riskScore',
      header: 'AI Risk Index',
      render: (batch) => {
        const score = batch.riskScore;
        const color =
          score > 70
            ? 'text-rose-700 bg-rose-50 border-rose-200'
            : score > 30
            ? 'text-amber-700 bg-amber-50 border-amber-200'
            : 'text-emerald-700 bg-emerald-50 border-emerald-200';
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${color}`}>
            {score}/100
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (batch) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDispatchBatchId(batch.id);
              setDispatchResult(null);
              setDispatchError(null);
              setIsDispatchModalOpen(true);
            }}
            title="Test Dispatch Authorization on this Lot"
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors flex items-center gap-1"
          >
            <Truck className="w-3.5 h-3.5 text-teal-700" />
            <span>Dispatch</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setInspectedBatch(batch);
            }}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded transition-colors"
          >
            View
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingBatch(batch);
            }}
            title="Edit / Correct Batch Record"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const handleExecuteTestDispatch = async () => {
    const cleanId = (dispatchBatchId || '').trim();
    if (!cleanId) {
      setDispatchError('Please select a valid batch ID.');
      return;
    }
    if (!dispatchQuantity || dispatchQuantity <= 0) {
      setDispatchError('Please enter a positive dispatch quantity.');
      return;
    }

    setDispatchError(null);
    setDispatchResult(null);
    setIsDispatching(true);

    try {
      const res = await pharmacyService.dispatchBatch(cleanId, dispatchQuantity);
      const targetBatch = batches.find((b) => b.id.toUpperCase() === cleanId.toUpperCase());
      setDispatchResult({
        success: true,
        message: res.message,
        batchId: cleanId.toUpperCase(),
        status: targetBatch?.status || 'released',
      });
    } catch (err: any) {
      const targetBatch = batches.find((b) => b.id.toUpperCase() === cleanId.toUpperCase());
      setDispatchResult({
        success: false,
        message: err?.message || 'Dispatch blocked by system policy.',
        batchId: cleanId.toUpperCase(),
        status: targetBatch?.status,
      });
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Newly Registered Batch Success Banner */}
      {recentRegisteredBatch && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Batch {recentRegisteredBatch.id} successfully registered in inventory!</span>
              <span className="text-emerald-800 ml-1.5">
                ({recentRegisteredBatch.drugName} • {recentRegisteredBatch.batchSizeUnits.toLocaleString()} units)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setInspectedBatch(recentRegisteredBatch)}
              className="font-semibold text-teal-800 underline hover:text-teal-950"
            >
              Inspect Batch Details →
            </button>
            <button
              type="button"
              onClick={() => setRecentRegisteredBatch(null)}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Search, Filter and Primary Action Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Batch ID, SKU, Drug or Warehouse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 bg-slate-50"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {[
            { id: 'all', label: 'All Lots' },
            { id: 'under_review', label: 'Under Review' },
            { id: 'quarantined', label: 'Quarantined' },
            { id: 'released', label: 'Released' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedStatus(pill.id)}
              className={`text-xs px-2.5 py-1 rounded font-medium transition-colors shrink-0 ${
                selectedStatus === pill.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setDispatchResult(null);
              setDispatchError(null);
              setIsDispatchModalOpen(true);
            }}
            className="w-full lg:w-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-md shadow-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 text-xs"
            title="Open Test Dispatch Authorization Console"
          >
            <Truck className="w-4 h-4 text-teal-400" />
            <span>Test Dispatch</span>
          </button>
          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="w-full lg:w-auto px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-md shadow-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Batch</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing <strong className="text-slate-800">{filteredBatches.length}</strong> of{' '}
            <strong className="text-slate-800">{batches.length}</strong> registered batches
          </p>
          <DemoBadge label="Synthetic Inventory Store" size="sm" />
        </div>

        <DataTable
          columns={columns}
          data={filteredBatches}
          keyExtractor={(b) => b.id}
          onRowClick={(b) => setInspectedBatch(b)}
        />
      </div>

      {/* Batch Inspect Modal */}
      {inspectedBatch && (
        <Modal
          isOpen={!!inspectedBatch}
          onClose={() => setInspectedBatch(null)}
          title={`Batch Specification — Lot ${inspectedBatch.id}`}
          subtitle={`${inspectedBatch.drugName} (${inspectedBatch.dosageForm})`}
          maxWidth="xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  setEditingBatch(inspectedBatch);
                  setInspectedBatch(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Batch Record</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDispatchBatchId(inspectedBatch.id);
                    setDispatchResult(null);
                    setDispatchError(null);
                    setInspectedBatch(null);
                    setIsDispatchModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded flex items-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5 text-teal-700" />
                  <span>Test Dispatch</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedBatch(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInspectedBatch(null);
                    onNavigate('traceability');
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 rounded hover:bg-teal-800"
                >
                  Inspect Supply Line Traceability →
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 font-medium">Batch ID:</span>
                <p className="font-mono font-bold text-slate-900 text-sm">{inspectedBatch.id}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Product SKU:</span>
                <p className="font-mono font-bold text-slate-800 text-sm">{inspectedBatch.productSku || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Status:</span>
                <div className="mt-0.5">
                  <BatchStatusBadge status={inspectedBatch.status} />
                </div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Batch Size (Received):</span>
                <p className="font-semibold text-slate-800">
                  {inspectedBatch.batchSizeUnits.toLocaleString()} units
                  {inspectedBatch.receivedQuantity && (
                    <span className="text-slate-500 text-[11px] font-normal ml-1">
                      (Recv: {inspectedBatch.receivedQuantity.toLocaleString()})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Mfg Date:</span>
                <p className="font-semibold text-slate-800">{inspectedBatch.manufacturingDate}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Expiry Date:</span>
                <p className="font-semibold text-slate-800">{inspectedBatch.expiryDate}</p>
              </div>
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2">
              <h5 className="font-bold text-slate-900">Manufacturing & Provenance Data</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-700">
                <p>
                  <strong className="text-slate-800">Manufacturer:</strong>{' '}
                  {inspectedBatch.manufacturerName || 'Arogya Formulation Works'}
                </p>
                <p>
                  <strong className="text-slate-800">Manufacturer Lot #:</strong>{' '}
                  <span className="font-mono">{inspectedBatch.manufacturerLotNumber || 'LOT-RECORD-VERIFIED'}</span>
                </p>
                <p>
                  <strong className="text-slate-800">Storage Specification:</strong>{' '}
                  {inspectedBatch.storageCondition}
                </p>
                <p>
                  <strong className="text-slate-800">Warehouse Location:</strong>{' '}
                  {inspectedBatch.currentWarehouse}
                </p>
                <p className="md:col-span-2">
                  <strong className="text-slate-800">Active Pharmaceutical Ingredient:</strong>{' '}
                  {inspectedBatch.activeIngredients}
                </p>
                {inspectedBatch.barcodeValue && (
                  <p className="md:col-span-2 flex items-center gap-1.5">
                    <Barcode className="w-3.5 h-3.5 text-slate-500" />
                    <strong className="text-slate-800">Associated Barcode / EAN:</strong>{' '}
                    <span className="font-mono">{inspectedBatch.barcodeValue}</span>
                  </p>
                )}
                {inspectedBatch.registeredAt && (
                  <p className="text-slate-500 text-[11px]">
                    <strong>Registration Timestamp:</strong> {inspectedBatch.registeredAt}
                  </p>
                )}
                {inspectedBatch.notes && (
                  <p className="md:col-span-2 text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                    <strong>Receiving Notes:</strong> {inspectedBatch.notes}
                  </p>
                )}
              </div>
            </div>

            {inspectedBatch.id === 'B2231' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">Precautionary Investigation Notice (Cypher 2026 PS 7)</p>
                  <p className="text-[11px] text-rose-800 mt-0.5">
                    Batch B2231 has a simulated temperature anomaly alert (28.4°C for 210 mins). Precautionary dock hold recommended for qualified QA review. Sensor reading alone does not establish product degradation. Tracing scope: 180 warehouse units, 640 dispatched across 25 customers. Potential replacement Batch B2240 (400 units) identified.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Test Dispatch Modal */}
      {isDispatchModalOpen && (
        <Modal
          isOpen={isDispatchModalOpen}
          onClose={() => {
            setIsDispatchModalOpen(false);
            setDispatchResult(null);
            setDispatchError(null);
          }}
          title="Test Dispatch Authorization (Simulation Console)"
          subtitle="Verify dispatch status checks against real-time batch inventory & QA regulatory hold status"
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-slate-500 italic">
                * Simulated verification console — no actual inventory deducted
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDispatchModalOpen(false);
                    setDispatchResult(null);
                    setDispatchError(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleExecuteTestDispatch}
                  disabled={isDispatching}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Truck className="w-3.5 h-3.5 text-teal-400" />
                  <span>{isDispatching ? 'Validating...' : 'Execute Test Dispatch'}</span>
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Simulation Notice Banner */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 flex items-start gap-2.5">
              <DemoBadge label="SIMULATION MODE" size="sm" />
              <div className="text-[11px]">
                <span className="font-bold">Operator Guidance:</span> This console directly calls{' '}
                <code className="bg-purple-100 px-1 py-0.5 rounded font-mono">pharmacyService.canDispatchBatch()</code> and{' '}
                <code className="bg-purple-100 px-1 py-0.5 rounded font-mono">pharmacyService.dispatchBatch()</code>. Select any lot to verify dispatch hold enforcement.
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Select Batch to Dispatch:</label>
                <select
                  value={dispatchBatchId}
                  onChange={(e) => {
                    setDispatchBatchId(e.target.value);
                    setDispatchResult(null);
                    setDispatchError(null);
                  }}
                  className="w-full p-2 text-xs rounded border border-slate-300 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} — {b.drugName} ({(b.status || 'RELEASED').toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Dispatch Quantity (Units):</label>
                <input
                  type="number"
                  min="1"
                  value={dispatchQuantity}
                  onChange={(e) => setDispatchQuantity(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-2 text-xs rounded border border-slate-300 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono font-semibold"
                />
              </div>
            </div>

            {/* Error Message */}
            {dispatchError && (
              <p className="text-rose-600 font-bold bg-rose-50 p-2 rounded border border-rose-200">
                {dispatchError}
              </p>
            )}

            {/* Result Display */}
            {dispatchResult && (
              <div
                className={`p-4 rounded-lg border space-y-2 animate-fadeIn ${
                  dispatchResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {dispatchResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span className="font-bold text-sm">
                      {dispatchResult.success ? 'DISPATCH AUTHORIZED' : 'DISPATCH BLOCKED BY REGULATORY HOLD'}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold bg-white/80 px-2 py-0.5 rounded border border-current">
                    Lot {dispatchResult.batchId}
                  </span>
                </div>

                <p className="text-xs leading-relaxed font-medium">{dispatchResult.message}</p>

                <div className="pt-2 border-t border-current/10 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Enforced by: <strong className="font-mono text-slate-800">pharmacyService.canDispatchBatch</strong></span>
                  <span>Evaluated Batch Status: <strong className="uppercase font-bold text-slate-900">{dispatchResult.status || 'N/A'}</strong></span>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Batch Registration Modal (Requirement 1 & 2) */}
      <RegisterBatchModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        existingBatches={batches}
        onSubmit={handleBatchRegistered}
        onSuccess={(newBatch) => {
          setRecentRegisteredBatch(newBatch);
        }}
      />

      {/* Batch Correction Modal (Requirement 6) */}
      {editingBatch && (
        <EditBatchModal
          isOpen={!!editingBatch}
          onClose={() => setEditingBatch(null)}
          batch={editingBatch}
          onSave={handleBatchUpdated}
          onSuccess={() => {
            setEditingBatch(null);
          }}
        />
      )}
    </div>
  );
};

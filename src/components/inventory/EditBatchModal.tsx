import React, { useState } from 'react';
import {
  Edit3,
  Building2,
  Thermometer,
  Layers,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import type { BatchItem, UpdateBatchInput } from '../../types';
import {
  VERIFIED_WAREHOUSES,
  STANDARD_STORAGE_CONDITIONS,
} from '../../data/productMaster';

interface EditBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: BatchItem;
  onSave: (input: UpdateBatchInput) => Promise<BatchItem>;
  onSuccess: (updatedBatch: BatchItem) => void;
}

export const EditBatchModal: React.FC<EditBatchModalProps> = ({
  isOpen,
  onClose,
  batch,
  onSave,
  onSuccess,
}) => {
  const [currentWarehouse, setCurrentWarehouse] = useState<string>(batch.currentWarehouse);
  const [storageCondition, setStorageCondition] = useState<string>(batch.storageCondition);
  const [batchSizeUnits, setBatchSizeUnits] = useState<string>(batch.batchSizeUnits.toString());
  const [manufacturerLotNumber, setManufacturerLotNumber] = useState<string>(
    batch.manufacturerLotNumber || ''
  );
  const [notes, setNotes] = useState<string>(batch.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = Number(batchSizeUnits);
    if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      setError('Quantity units must be a valid positive whole number.');
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = await onSave({
        batchId: batch.id,
        currentWarehouse: currentWarehouse.trim(),
        storageCondition: storageCondition.trim(),
        batchSizeUnits: qty,
        manufacturerLotNumber: manufacturerLotNumber.trim(),
        notes: notes.trim(),
      });
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Correct Batch Record — Lot ${batch.id}`}
      subtitle={`${batch.drugName} • ${batch.dosageForm}`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Corrections...</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>Save Batch Corrections</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-[11px]">{error}</p>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 gap-3">
          <div>
            <span className="text-slate-500 font-medium">Batch ID:</span>
            <p className="font-mono font-bold text-slate-900">{batch.id}</p>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Product SKU:</span>
            <p className="font-mono font-semibold text-slate-800">{batch.productSku || 'N/A'}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              Warehouse Location
            </label>
            <select
              value={currentWarehouse}
              onChange={(e) => setCurrentWarehouse(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
            >
              {VERIFIED_WAREHOUSES.map((wh) => (
                <option key={wh} value={wh}>
                  {wh}
                </option>
              ))}
              {!VERIFIED_WAREHOUSES.includes(currentWarehouse) && (
                <option value={currentWarehouse}>{currentWarehouse}</option>
              )}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-slate-500" />
              Storage Specification
            </label>
            <select
              value={storageCondition}
              onChange={(e) => setStorageCondition(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
            >
              {STANDARD_STORAGE_CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
              {!STANDARD_STORAGE_CONDITIONS.includes(storageCondition) && (
                <option value={storageCondition}>{storageCondition}</option>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-slate-500" />
                Current Batch Units
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={batchSizeUnits}
                onChange={(e) => setBatchSizeUnits(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Manufacturer Lot #
              </label>
              <input
                type="text"
                value={manufacturerLotNumber}
                onChange={(e) => setManufacturerLotNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Correction Notes / QA Rationale
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide reason for location reassignment or quantity adjustment..."
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

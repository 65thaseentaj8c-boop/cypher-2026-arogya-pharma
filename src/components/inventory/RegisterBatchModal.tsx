import React, { useState } from 'react';
import {
  Barcode,
  Package,
  Calendar,
  Building2,
  Thermometer,
  Layers,
  AlertCircle,
  CheckCircle2,
  Info,
  Sparkles,
  RotateCcw,
  ScanLine,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { DemoBadge } from '../common/DemoBadge';
import type {
  BatchItem,
  RegisterBatchInput,
  RegisterBatchValidationErrors,
} from '../../types';
import {
  VERIFIED_PRODUCTS,
  VERIFIED_WAREHOUSES,
  STANDARD_STORAGE_CONDITIONS,
  STANDARD_DOSAGE_FORMS,
} from '../../data/productMaster';
import { validateBatchRegistration } from '../../services/batchValidation';

interface RegisterBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingBatches: BatchItem[];
  onSubmit: (input: RegisterBatchInput) => Promise<BatchItem>;
  onSuccess: (newBatch: BatchItem) => void;
}

export const RegisterBatchModal: React.FC<RegisterBatchModalProps> = ({
  isOpen,
  onClose,
  existingBatches,
  onSubmit,
  onSuccess,
}) => {
  // Product state
  const [productSelection, setProductSelection] = useState<string>('PROD-PCM-1000');
  const [productName, setProductName] = useState<string>(VERIFIED_PRODUCTS[0].name);
  const [productSku, setProductSku] = useState<string>(VERIFIED_PRODUCTS[0].sku);
  const [manufacturerName, setManufacturerName] = useState<string>(
    VERIFIED_PRODUCTS[0].defaultManufacturer
  );
  const [dosageForm, setDosageForm] = useState<string>(VERIFIED_PRODUCTS[0].dosageForm);
  const [strength, setStrength] = useState<string>(VERIFIED_PRODUCTS[0].strength);
  const [activeIngredients, setActiveIngredients] = useState<string>(
    VERIFIED_PRODUCTS[0].activeIngredients
  );

  // Batch specific state
  const [batchId, setBatchId] = useState<string>('');
  const [manufacturerLotNumber, setManufacturerLotNumber] = useState<string>('');
  const [manufacturingDate, setManufacturingDate] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [quantityReceived, setQuantityReceived] = useState<string>('');
  const [currentWarehouse, setCurrentWarehouse] = useState<string>(VERIFIED_WAREHOUSES[0]);
  const [customWarehouse, setCustomWarehouse] = useState<string>('');
  const [storageCondition, setStorageCondition] = useState<string>(
    VERIFIED_PRODUCTS[0].storageCondition
  );
  const [customStorage, setCustomStorage] = useState<string>('');
  const [barcodeValue, setBarcodeValue] = useState<string>(
    VERIFIED_PRODUCTS[0].standardBarcode || ''
  );
  const [notes, setNotes] = useState<string>('');

  // UI state
  const [errors, setErrors] = useState<RegisterBatchValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [scannerFeedback, setScannerFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  // Handle product dropdown change
  const handleProductSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setProductSelection(selectedId);
    setScannerFeedback(null);

    if (selectedId === 'OTHER') {
      setProductName('');
      setProductSku('');
      setManufacturerName('');
      setDosageForm(STANDARD_DOSAGE_FORMS[0]);
      setStrength('');
      setActiveIngredients('');
      setBarcodeValue('');
    } else {
      const prod = VERIFIED_PRODUCTS.find((p) => p.id === selectedId);
      if (prod) {
        setProductName(prod.name);
        setProductSku(prod.sku);
        setManufacturerName(prod.defaultManufacturer);
        setDosageForm(prod.dosageForm);
        setStrength(prod.strength);
        setStorageCondition(prod.storageCondition);
        setActiveIngredients(prod.activeIngredients);
        if (prod.standardBarcode) {
          setBarcodeValue(prod.standardBarcode);
        }
      }
    }
  };

  // Barcode Lookup logic (matching USB/Bluetooth scanner input or manual lookup)
  const handleBarcodeLookup = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      setScannerFeedback({
        type: 'info',
        text: 'Please input or scan a barcode value first.',
      });
      return;
    }

    // Check verified product master first
    const matchedProduct = VERIFIED_PRODUCTS.find(
      (p) =>
        (p.standardBarcode && p.standardBarcode.trim() === trimmed) ||
        p.sku.toUpperCase() === trimmed.toUpperCase()
    );

    if (matchedProduct) {
      setProductSelection(matchedProduct.id);
      setProductName(matchedProduct.name);
      setProductSku(matchedProduct.sku);
      setManufacturerName(matchedProduct.defaultManufacturer);
      setDosageForm(matchedProduct.dosageForm);
      setStrength(matchedProduct.strength);
      setStorageCondition(matchedProduct.storageCondition);
      setActiveIngredients(matchedProduct.activeIngredients);
      setBarcodeValue(trimmed);
      setScannerFeedback({
        type: 'success',
        text: `Scanner match: Verified product "${matchedProduct.name}" (${matchedProduct.sku}) identified and parameters auto-filled.`,
      });
      // Clear productSku error if present
      setErrors((prev) => ({ ...prev, productSku: undefined, productName: undefined }));
      return;
    }

    // Check existing batches
    const matchedBatch = existingBatches.find(
      (b) =>
        (b.barcodeValue && b.barcodeValue.trim() === trimmed) ||
        (b.productSku && b.productSku.toUpperCase() === trimmed.toUpperCase())
    );

    if (matchedBatch) {
      setProductSelection('OTHER');
      setProductName(matchedBatch.drugName);
      setProductSku(matchedBatch.productSku || '');
      setManufacturerName(matchedBatch.manufacturerName || '');
      setDosageForm(matchedBatch.dosageForm);
      setStrength(matchedBatch.strength);
      setStorageCondition(matchedBatch.storageCondition);
      setActiveIngredients(matchedBatch.activeIngredients);
      setBarcodeValue(trimmed);
      setScannerFeedback({
        type: 'success',
        text: `Scanner match: Product specifications populated from batch history for "${matchedBatch.drugName}".`,
      });
      return;
    }

    // Unmatched barcode
    setBarcodeValue(trimmed);
    setScannerFeedback({
      type: 'info',
      text: `Barcode "${trimmed}" captured. No automated catalog match found. Please verify product information manually.`,
    });
  };

  // Dedicated keyboard handler for USB / Bluetooth HID barcode scanners
  const handleBarcodeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleBarcodeLookup(barcodeValue);
    }
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setScannerFeedback(null);

    const warehouseToSave =
      currentWarehouse === 'CUSTOM' ? customWarehouse.trim() : currentWarehouse;
    const storageToSave =
      storageCondition === 'CUSTOM' ? customStorage.trim() : storageCondition;

    const payload: RegisterBatchInput = {
      batchId: batchId.trim().toUpperCase(),
      productName: productName.trim(),
      productSku: productSku.trim().toUpperCase(),
      manufacturerName: manufacturerName.trim(),
      manufacturerLotNumber: manufacturerLotNumber.trim().toUpperCase(),
      dosageForm: dosageForm.trim(),
      strength: strength.trim(),
      manufacturingDate: manufacturingDate.trim(),
      expiryDate: expiryDate.trim(),
      quantityReceived: Number(quantityReceived),
      currentWarehouse: warehouseToSave,
      storageCondition: storageToSave,
      activeIngredients: activeIngredients.trim(),
      barcodeValue: barcodeValue.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    // Client-side validation
    const { isValid, errors: validationErrors } = validateBatchRegistration(
      payload,
      existingBatches
    );

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      const createdBatch = await onSubmit(payload);
      onSuccess(createdBatch);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Batch registration failed.';
      setErrors((prev) => ({ ...prev, general: msg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick helper to fill sample date suggestions
  const handleSetSampleDates = () => {
    setManufacturingDate('2026-09-15');
    setExpiryDate('2028-09-14');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register New Pharmaceutical Batch"
      subtitle="Intake Verification, Provenance Ingestion & Initial Risk Scoring"
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span>Initial Status: <strong>Under Review</strong> (Subject to QA release)</span>
          </div>
          <div className="flex items-center gap-2">
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
                  <span>Validating & Registering...</span>
                </>
              ) : (
                <>
                  <Package className="w-3.5 h-3.5" />
                  <span>Complete Batch Registration</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* Compliance & Demo Banner */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">Pharmaceutical Lot Intake Standard (Cypher 2026)</span>
              <DemoBadge label="In-Memory Store" size="sm" />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Batch records registered here are validated, indexed in the active inventory, and assigned an initial <strong>Under Review</strong> governance status. Records are kept in local memory for demo evaluation and will reset on page reload.
            </p>
          </div>
        </div>

        {/* General Form Error Alert */}
        {errors.general && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs">Registration Validation Failed</p>
              <p className="text-[11px] mt-0.5">{errors.general}</p>
            </div>
          </div>
        )}

        {/* Section 1: Barcode & Hardware Scanner Ingestion */}
        <div className="p-3.5 bg-teal-50/40 border border-teal-200/80 rounded-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Barcode className="w-4 h-4 text-teal-800" />
              <label htmlFor="barcode-scanner-input" className="font-bold text-teal-950 uppercase tracking-wide text-[11px]">
                Hardware Barcode / 2D Scanner Intake
              </label>
            </div>
            <span className="text-[10px] text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded border border-teal-200">
              USB / Bluetooth Keyboard Emulation Supported
            </span>
          </div>

          <p className="text-[11px] text-teal-900 leading-relaxed">
            Scan a secondary pharmaceutical barcode or enter a standardized EAN-13/UPC. When your handheld scanner sends a carriage return (<code>Enter</code>), product specifications are automatically mapped.
          </p>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <ScanLine className="w-3.5 h-3.5 text-teal-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="barcode-scanner-input"
                type="text"
                placeholder="Scan or type barcode (e.g. 8901234567890) and press Enter..."
                value={barcodeValue}
                onChange={(e) => setBarcodeValue(e.target.value)}
                onKeyDown={handleBarcodeInputKeyDown}
                className="w-full pl-8 pr-3 py-1.5 rounded border border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-700 bg-white font-mono text-xs text-slate-800"
              />
            </div>
            <button
              type="button"
              onClick={() => handleBarcodeLookup(barcodeValue)}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded text-xs transition-colors shrink-0 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Lookup
            </button>
          </div>

          {/* Scanner Feedback Notification */}
          {scannerFeedback && (
            <div
              className={`p-2 rounded text-[11px] flex items-center gap-1.5 ${
                scannerFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : scannerFeedback.type === 'error'
                  ? 'bg-rose-50 text-rose-900 border border-rose-200'
                  : 'bg-sky-50 text-sky-900 border border-sky-200'
              }`}
            >
              {scannerFeedback.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              )}
              <span>{scannerFeedback.text}</span>
            </div>
          )}

          <div className="text-[10px] text-slate-500 italic flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-400" />
            <span>Note: Camera-based optical scanning is scheduled for a future release; handheld hardware scanners work directly.</span>
          </div>
        </div>

        {/* Section 2: Product Master Information */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <h4 className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 text-xs">
              <Package className="w-3.5 h-3.5 text-slate-500" />
              1. Product Master Information
            </h4>
            <span className="text-[10px] text-slate-400">* Required Fields</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Verified Product Select */}
            <div>
              <label htmlFor="product-master-select" className="font-semibold text-slate-700 block mb-1">
                Select Pharmaceutical Product <span className="text-rose-600">*</span>
              </label>
              <select
                id="product-master-select"
                value={productSelection}
                onChange={handleProductSelectChange}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600 bg-white"
              >
                {VERIFIED_PRODUCTS.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name} ({prod.dosageForm} • {prod.strength})
                  </option>
                ))}
                <option value="OTHER">+ Other (Specify Custom Formulation)</option>
              </select>
            </div>

            {/* Product SKU */}
            <div>
              <label htmlFor="product-sku-input" className="font-semibold text-slate-700 block mb-1">
                Product SKU / Identifier <span className="text-rose-600">*</span>
              </label>
              <input
                id="product-sku-input"
                type="text"
                placeholder="e.g. SKU-PCM-1000IV"
                value={productSku}
                onChange={(e) => setProductSku(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded border font-mono ${
                  errors.productSku
                    ? 'border-rose-400 bg-rose-50/30'
                    : 'border-slate-300 bg-white'
                } focus:outline-none focus:ring-1 focus:ring-teal-600`}
              />
              {errors.productSku && (
                <p className="text-rose-600 text-[10px] mt-0.5">{errors.productSku}</p>
              )}
            </div>

            {/* Product Name (if OTHER is selected) */}
            {productSelection === 'OTHER' && (
              <div className="md:col-span-2">
                <label htmlFor="product-name-input" className="font-semibold text-slate-700 block mb-1">
                  Product Name <span className="text-rose-600">*</span>
                </label>
                <input
                  id="product-name-input"
                  type="text"
                  placeholder="e.g. Ciprofloxacin Infusion IP"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded border ${
                    errors.productName
                      ? 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-300 bg-white'
                  } focus:outline-none focus:ring-1 focus:ring-teal-600`}
                />
                {errors.productName && (
                  <p className="text-rose-600 text-[10px] mt-0.5">{errors.productName}</p>
                )}
              </div>
            )}

            {/* Manufacturer Name */}
            <div>
              <label htmlFor="manufacturer-name-input" className="font-semibold text-slate-700 block mb-1">
                Manufacturer / Production Facility <span className="text-rose-600">*</span>
              </label>
              <input
                id="manufacturer-name-input"
                type="text"
                placeholder="e.g. Arogya Formulation Works (Ahmedabad)"
                value={manufacturerName}
                onChange={(e) => setManufacturerName(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded border ${
                  errors.manufacturerName
                    ? 'border-rose-400 bg-rose-50/30'
                    : 'border-slate-300 bg-white'
                } focus:outline-none focus:ring-1 focus:ring-teal-600`}
              />
              {errors.manufacturerName && (
                <p className="text-rose-600 text-[10px] mt-0.5">{errors.manufacturerName}</p>
              )}
            </div>

            {/* Dosage Form & Strength */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="dosage-form-input" className="font-semibold text-slate-700 block mb-1">
                  Dosage Form <span className="text-rose-600">*</span>
                </label>
                <input
                  id="dosage-form-input"
                  type="text"
                  placeholder="e.g. IV Infusion"
                  value={dosageForm}
                  onChange={(e) => setDosageForm(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded border ${
                    errors.dosageForm
                      ? 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-300 bg-white'
                  } focus:outline-none focus:ring-1 focus:ring-teal-600`}
                />
                {errors.dosageForm && (
                  <p className="text-rose-600 text-[10px] mt-0.5">{errors.dosageForm}</p>
                )}
              </div>
              <div>
                <label htmlFor="strength-input" className="font-semibold text-slate-700 block mb-1">
                  Strength <span className="text-rose-600">*</span>
                </label>
                <input
                  id="strength-input"
                  type="text"
                  placeholder="e.g. 10 mg/ml"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded border ${
                    errors.strength
                      ? 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-300 bg-white'
                  } focus:outline-none focus:ring-1 focus:ring-teal-600`}
                />
                {errors.strength && (
                  <p className="text-rose-600 text-[10px] mt-0.5">{errors.strength}</p>
                )}
              </div>
            </div>

            {/* Active Pharmaceutical Ingredient (API) */}
            <div className="md:col-span-2">
              <label htmlFor="active-ingredients-input" className="font-semibold text-slate-700 block mb-1">
                Active Pharmaceutical Ingredients (API)
              </label>
              <input
                id="active-ingredients-input"
                type="text"
                placeholder="e.g. Paracetamol IP (High-purity crystalline)"
                value={activeIngredients}
                onChange={(e) => setActiveIngredients(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Batch Specifics & Quantities */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <h4 className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              2. Batch Identification & Physical Quantities
            </h4>
            <button
              type="button"
              onClick={handleSetSampleDates}
              className="text-[10px] text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Sample Dates
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Internal Batch ID */}
            <div>
              <label htmlFor="internal-batch-id-input" className="font-semibold text-slate-700 block mb-1">
                Internal Batch ID <span className="text-rose-600">*</span>
              </label>
              <input
                id="internal-batch-id-input"
                type="text"
                placeholder="e.g. B2241"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value.toUpperCase())}
                className={`w-full px-2.5 py-1.5 rounded border font-mono font-bold text-slate-900 ${
                  errors.batchId
                    ? 'border-rose-400 bg-rose-50/30'
                    : 'border-slate-300 bg-white'
                } focus:outline-none focus:ring-1 focus:ring-teal-600`}
              />
              {errors.batchId && (
                <p className="text-rose-600 text-[10px] mt-0.5">{errors.batchId}</p>
              )}
            </div>

            {/* Manufacturer Lot Number */}
            <div>
              <label htmlFor="mfg-lot-input" className="font-semibold text-slate-700 block mb-1">
                Manufacturer Lot/Batch # <span className="text-rose-600">*</span>
              </label>
              <input
                id="mfg-lot-input"
                type="text"
                placeholder="e.g. LOT-MFG-2026-881"
                value={manufacturerLotNumber}
                onChange={(e) => setManufacturerLotNumber(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded border font-mono ${
                  errors.manufacturerLotNumber
                    ? 'border-rose-400 bg-rose-50/30'
                    : 'border-slate-300 bg-white'
                } focus:outline-none focus:ring-1 focus:ring-teal-600`}
              />
              {errors.manufacturerLotNumber && (
                <p className="text-rose-600 text-[10px] mt-0.5">{errors.manufacturerLotNumber}</p>
              )}
            </div>

            {/* Quantity Received */}
            <div>
              <label htmlFor="quantity-received-input" className="font-semibold text-slate-700 block mb-1">
                Quantity Received (Units) <span className="text-rose-600">*</span>
              </label>
              <input
                id="quantity-received-input"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 50000"
                value={quantityReceived}
                onChange={(e) => setQuantityReceived(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded border font-mono font-bold ${
                  errors.quantityReceived
                    ? 'border-rose-400 bg-rose-50/30'
                    : 'border-slate-300 bg-white'
                } focus:outline-none focus:ring-1 focus:ring-teal-600`}
              />
              {errors.quantityReceived && (
                <p className="text-rose-600 text-[10px] mt-0.5">{errors.quantityReceived}</p>
              )}
            </div>

            {/* Manufacturing Date */}
            <div>
              <label htmlFor="mfg-date-input" className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                Manufacturing Date <span className="text-rose-600">*</span>
              </label>
              <input
                id="mfg-date-input"
                type="date"
                value={manufacturingDate}
                onChange={(e) => setManufacturingDate(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded border ${
                  errors.manufacturingDate
                    ? 'border-rose-400 bg-rose-50/30'
                    : 'border-slate-300 bg-white'
                } focus:outline-none focus:ring-1 focus:ring-teal-600`}
              />
              {errors.manufacturingDate && (
                <p className="text-rose-600 text-[10px] mt-0.5">{errors.manufacturingDate}</p>
              )}
            </div>

            {/* Expiry Date */}
            <div>
              <label htmlFor="exp-date-input" className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                Expiry Date <span className="text-rose-600">*</span>
              </label>
              <input
                id="exp-date-input"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded border ${
                  errors.expiryDate
                    ? 'border-rose-400 bg-rose-50/30'
                    : 'border-slate-300 bg-white'
                } focus:outline-none focus:ring-1 focus:ring-teal-600`}
              />
              {errors.expiryDate && (
                <p className="text-rose-600 text-[10px] mt-0.5">{errors.expiryDate}</p>
              )}
            </div>

            {/* Storage Condition */}
            <div>
              <label htmlFor="storage-condition-select" className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-slate-500" />
                Storage Condition <span className="text-rose-600">*</span>
              </label>
              <select
                id="storage-condition-select"
                value={storageCondition}
                onChange={(e) => setStorageCondition(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600 bg-white text-[11px]"
              >
                {STANDARD_STORAGE_CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
                <option value="CUSTOM">+ Custom Storage Specification</option>
              </select>
              {storageCondition === 'CUSTOM' && (
                <input
                  type="text"
                  placeholder="e.g. -20°C to -10°C in certified cryogenic storage"
                  value={customStorage}
                  onChange={(e) => setCustomStorage(e.target.value)}
                  className="w-full mt-1.5 px-2.5 py-1 rounded border border-slate-300 text-xs"
                />
              )}
              {errors.storageCondition && (
                <p className="text-rose-600 text-[10px] mt-0.5">{errors.storageCondition}</p>
              )}
            </div>

            {/* Current Warehouse */}
            <div className="md:col-span-3">
              <label htmlFor="warehouse-select" className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-500" />
                Receiving Warehouse Depot / Hub <span className="text-rose-600">*</span>
              </label>
              <select
                id="warehouse-select"
                value={currentWarehouse}
                onChange={(e) => setCurrentWarehouse(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600 bg-white"
              >
                {VERIFIED_WAREHOUSES.map((wh) => (
                  <option key={wh} value={wh}>
                    {wh}
                  </option>
                ))}
                <option value="CUSTOM">+ Other Location</option>
              </select>
              {currentWarehouse === 'CUSTOM' && (
                <input
                  type="text"
                  placeholder="e.g. Pune Central Cold Hub WH-PUN-01"
                  value={customWarehouse}
                  onChange={(e) => setCustomWarehouse(e.target.value)}
                  className="w-full mt-1.5 px-2.5 py-1 rounded border border-slate-300 text-xs"
                />
              )}
              {errors.currentWarehouse && (
                <p className="text-rose-600 text-[10px] mt-0.5">{errors.currentWarehouse}</p>
              )}
            </div>

            {/* Notes / Receiving Observations */}
            <div className="md:col-span-3">
              <label htmlFor="receiving-notes-input" className="font-semibold text-slate-700 block mb-1">
                Receiving Observations & Gate Notes (Optional)
              </label>
              <textarea
                id="receiving-notes-input"
                rows={2}
                placeholder="e.g. Received via refrigerated transit container with tamper-evident seal intact. Certificate of Analysis (CoA) verified against monograph standards."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600 bg-white text-xs"
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

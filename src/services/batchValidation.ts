import type {
  BatchItem,
  RegisterBatchInput,
  RegisterBatchValidationErrors,
} from '../types';

/**
 * Default current date for validation in the context of Cypher 2026.
 * Using 2026-10-10 or the active environment date.
 */
export const DEFAULT_CURRENT_DATE = '2026-10-10';

/**
 * Pure validation function for Pharmaceutical Batch Registration
 */
export function validateBatchRegistration(
  input: Partial<RegisterBatchInput>,
  existingBatches: BatchItem[] = [],
  referenceDateStr: string = DEFAULT_CURRENT_DATE
): { isValid: boolean; errors: RegisterBatchValidationErrors } {
  const errors: RegisterBatchValidationErrors = {};

  // 1. Batch ID (Internal)
  const batchId = (input.batchId || '').trim();
  if (!batchId) {
    errors.batchId = 'Internal Batch ID is required (e.g., B2241).';
  } else if (batchId.length < 2) {
    errors.batchId = 'Internal Batch ID must be at least 2 characters.';
  } else if (
    existingBatches.some(
      (b) => b.id.trim().toUpperCase() === batchId.toUpperCase()
    )
  ) {
    errors.batchId = `Internal Batch ID "${batchId}" already exists in inventory. Batch IDs must be unique.`;
  }

  // 2. Product Name
  const productName = (input.productName || '').trim();
  if (!productName) {
    errors.productName = 'Product name is required.';
  }

  // 3. Product SKU / Identifier
  const productSku = (input.productSku || '').trim();
  if (!productSku) {
    errors.productSku =
      'Product SKU or product identifier is required for a valid inventory record.';
  }

  // 4. Manufacturer Name
  const manufacturerName = (input.manufacturerName || '').trim();
  if (!manufacturerName) {
    errors.manufacturerName = 'Manufacturer name is required.';
  }

  // 5. Manufacturer Lot Number
  const manufacturerLotNumber = (input.manufacturerLotNumber || '').trim();
  if (!manufacturerLotNumber) {
    errors.manufacturerLotNumber = "Manufacturer's lot/batch number is required.";
  } else {
    // Check duplicate lot for same product and manufacturer
    const isDuplicateLot = existingBatches.some((b) => {
      const matchLot =
        (b.manufacturerLotNumber || '').trim().toUpperCase() ===
        manufacturerLotNumber.toUpperCase();
      const matchProduct =
        (b.productSku || '').trim().toUpperCase() === productSku.toUpperCase() ||
        b.drugName.trim().toLowerCase() === productName.toLowerCase();
      const matchManufacturer =
        (b.manufacturerName || '').trim().toLowerCase() ===
        manufacturerName.toLowerCase();
      return matchLot && matchProduct && matchManufacturer;
    });

    if (isDuplicateLot) {
      errors.manufacturerLotNumber = `Manufacturer lot "${manufacturerLotNumber}" has already been registered for product "${productName}" from manufacturer "${manufacturerName}".`;
    }
  }

  // 6. Dosage Form
  const dosageForm = (input.dosageForm || '').trim();
  if (!dosageForm) {
    errors.dosageForm = 'Dosage form is required.';
  }

  // 7. Strength
  const strength = (input.strength || '').trim();
  if (!strength) {
    errors.strength = 'Strength specification is required.';
  }

  // 8. Quantity Received
  const qty = input.quantityReceived;
  if (qty === undefined || qty === null || (typeof qty === 'string' && (qty as string).trim() === '')) {
    errors.quantityReceived = 'Quantity received is required.';
  } else {
    const numQty = typeof qty === 'number' ? qty : Number(qty);
    if (isNaN(numQty)) {
      errors.quantityReceived = 'Quantity received must be a valid number.';
    } else if (numQty <= 0) {
      errors.quantityReceived = 'Quantity received must be a positive number greater than zero.';
    } else if (!Number.isInteger(numQty)) {
      errors.quantityReceived = 'Quantity received must be a whole integer number of units.';
    }
  }

  // 9. Manufacturing Date
  const mfgDateStr = (input.manufacturingDate || '').trim();
  let mfgDate: Date | null = null;
  if (!mfgDateStr) {
    errors.manufacturingDate = 'Manufacturing date is required.';
  } else {
    mfgDate = new Date(mfgDateStr);
    if (isNaN(mfgDate.getTime())) {
      errors.manufacturingDate = 'Manufacturing date must be a valid date (YYYY-MM-DD).';
    } else {
      // Check not in future
      const refDate = new Date(referenceDateStr);
      // Set to midnight comparison
      mfgDate.setHours(0, 0, 0, 0);
      refDate.setHours(23, 59, 59, 999);
      if (mfgDate.getTime() > refDate.getTime()) {
        errors.manufacturingDate = 'Manufacturing date cannot be in the future.';
      }
    }
  }

  // 10. Expiry Date
  const expDateStr = (input.expiryDate || '').trim();
  if (!expDateStr) {
    errors.expiryDate = 'Expiry date is required.';
  } else {
    const expDate = new Date(expDateStr);
    if (isNaN(expDate.getTime())) {
      errors.expiryDate = 'Expiry date must be a valid date (YYYY-MM-DD).';
    } else if (mfgDate && !isNaN(mfgDate.getTime())) {
      expDate.setHours(0, 0, 0, 0);
      mfgDate.setHours(0, 0, 0, 0);
      if (expDate.getTime() <= mfgDate.getTime()) {
        errors.expiryDate = 'Expiry date must be later than manufacturing date.';
      }
    }
  }

  // 11. Warehouse
  const warehouse = (input.currentWarehouse || '').trim();
  if (!warehouse) {
    errors.currentWarehouse = 'Warehouse/location is required.';
  }

  // 12. Storage Condition
  const storageCondition = (input.storageCondition || '').trim();
  if (!storageCondition) {
    errors.storageCondition = 'Storage condition specification is required.';
  }

  const isValid = Object.keys(errors).length === 0;
  return { isValid, errors };
}

/**
 * Trims all string properties in a RegisterBatchInput object
 */
export function sanitizeRegisterBatchInput(
  input: RegisterBatchInput
): RegisterBatchInput {
  return {
    batchId: input.batchId.trim().toUpperCase(),
    productName: input.productName.trim(),
    productSku: input.productSku.trim().toUpperCase(),
    manufacturerName: input.manufacturerName.trim(),
    manufacturerLotNumber: input.manufacturerLotNumber.trim().toUpperCase(),
    dosageForm: input.dosageForm.trim(),
    strength: input.strength.trim(),
    manufacturingDate: input.manufacturingDate.trim(),
    expiryDate: input.expiryDate.trim(),
    quantityReceived: Math.floor(Number(input.quantityReceived)),
    currentWarehouse: input.currentWarehouse.trim(),
    storageCondition: input.storageCondition.trim(),
    activeIngredients: input.activeIngredients?.trim(),
    barcodeValue: input.barcodeValue?.trim(),
    notes: input.notes?.trim(),
  };
}

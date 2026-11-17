/**
 * Smart Crop & Aspect Ratio Safeguard for Portrait & Fine-Art Print Ordering
 *
 * Ensures express checkouts and print selections in client galleries do not
 * inadvertently crop essential subject areas (e.g. converting a 2:3 DSLR frame to an 8x10 print).
 */

export interface CropBox {
  topPercent: number;
  leftPercent: number;
  widthPercent: number;
  heightPercent: number;
}

export interface FocalPoint {
  x: number; // 0 to 100%
  y: number; // 0 to 100%
}

export interface CropDimensions {
  targetWidthInches: number;
  targetHeightInches: number;
  label: string;
}

export interface SmartCropResult {
  targetAspectRatio: number; // width / height
  originalAspectRatio: number;
  cropBox: CropBox;
  cropCutoffPercentage: number; // percentage of original image discarded (0-100)
  requiresConfirmation: boolean; // true if >= 10% is discarded
  isSignificantCrop: boolean; // true if >= 15% is discarded
  cropWarningMessage: string | null;
}

/**
 * Clamps crop box percentages to valid [0, 100] bounds.
 */
export function clampCropBox(cropBox: CropBox): CropBox {
  const widthPercent = Math.max(0.1, Math.min(100, cropBox.widthPercent));
  const heightPercent = Math.max(0.1, Math.min(100, cropBox.heightPercent));
  const maxLeft = Math.max(0, 100 - widthPercent);
  const maxTop = Math.max(0, 100 - heightPercent);
  const leftPercent = Math.max(0, Math.min(maxLeft, cropBox.leftPercent));
  const topPercent = Math.max(0, Math.min(maxTop, cropBox.topPercent));

  return {
    topPercent: Math.round(topPercent * 10) / 10,
    leftPercent: Math.round(leftPercent * 10) / 10,
    widthPercent: Math.round(widthPercent * 10) / 10,
    heightPercent: Math.round(heightPercent * 10) / 10,
  };
}

/**
 * Calculates the percentage of the original image area discarded by the crop box.
 */
export function calculateCutoffPercentage(widthPercent: number, heightPercent: number): number {
  const cropArea = (widthPercent * heightPercent) / 100;
  return Math.max(0, Math.min(100, Math.round(100 - cropArea)));
}

/**
 * Returns crop warning feedback based on cutoff threshold.
 * - Discarding >= 15%: Significant warning requiring framing review.
 * - Discarding >= 10%: Minor crop notification.
 * - Discarding < 10%: No warning needed.
 */
export function getCropWarning(
  cutoffPercentage: number,
  printWidthInches?: number,
  printHeightInches?: number,
): { isWarning: boolean; isSignificant: boolean; message: string | null } {
  const isSignificant = cutoffPercentage >= 15;
  const isWarning = cutoffPercentage >= 10;
  const sizePrefix = printWidthInches && printHeightInches ? `${printWidthInches}×${printHeightInches}` : "Selected size";

  let message: string | null = null;
  if (isSignificant) {
    message = `${sizePrefix} print requires significant cropping (${cutoffPercentage}% trimmed). Please verify framing before checkout.`;
  } else if (isWarning) {
    message = `Minor cropping (${cutoffPercentage}%) applied for ${sizePrefix} aspect ratio.`;
  }

  return {
    isWarning,
    isSignificant,
    message,
  };
}

/**
 * Computes the optimal smart crop box centered on a focal point.
 */
export function calculateSmartCrop(
  originalWidth: number,
  originalHeight: number,
  printWidthInches: number,
  printHeightInches: number,
  focalPoint: FocalPoint = { x: 50, y: 40 }, // Default to portrait upper-third center
): SmartCropResult {
  if (originalWidth <= 0 || originalHeight <= 0) {
    return {
      targetAspectRatio: printWidthInches / printHeightInches,
      originalAspectRatio: 1,
      cropBox: { topPercent: 0, leftPercent: 0, widthPercent: 100, heightPercent: 100 },
      cropCutoffPercentage: 0,
      requiresConfirmation: false,
      isSignificantCrop: false,
      cropWarningMessage: null,
    };
  }

  // Normalize orientation: match portrait to portrait, landscape to landscape
  const isOriginalPortrait = originalHeight >= originalWidth;
  const targetW = isOriginalPortrait
    ? Math.min(printWidthInches, printHeightInches)
    : Math.max(printWidthInches, printHeightInches);
  const targetH = isOriginalPortrait
    ? Math.max(printWidthInches, printHeightInches)
    : Math.min(printWidthInches, printHeightInches);

  const originalAspect = originalWidth / originalHeight;
  const targetAspect = targetW / targetH;

  let cropWidthPercent = 100;
  let cropHeightPercent = 100;
  let leftPercent = 0;
  let topPercent = 0;

  if (targetAspect < originalAspect) {
    // Target is taller/narrower than original -> horizontal crop (cut left/right)
    cropWidthPercent = (targetAspect / originalAspect) * 100;
    cropHeightPercent = 100;

    // Center around focal point X, clamped between 0 and (100 - cropWidthPercent)
    const idealLeft = focalPoint.x - cropWidthPercent / 2;
    leftPercent = Math.max(0, Math.min(100 - cropWidthPercent, idealLeft));
    topPercent = 0;
  } else if (targetAspect > originalAspect) {
    // Target is wider than original -> vertical crop (cut top/bottom)
    cropWidthPercent = 100;
    cropHeightPercent = (originalAspect / targetAspect) * 100;

    // Center around focal point Y, clamped between 0 and (100 - cropHeightPercent)
    const idealTop = focalPoint.y - cropHeightPercent / 2;
    topPercent = Math.max(0, Math.min(100 - cropHeightPercent, idealTop));
    leftPercent = 0;
  }

  const cropCutoffPercentage = calculateCutoffPercentage(cropWidthPercent, cropHeightPercent);
  const warning = getCropWarning(cropCutoffPercentage, printWidthInches, printHeightInches);

  return {
    targetAspectRatio: targetAspect,
    originalAspectRatio: originalAspect,
    cropBox: clampCropBox({
      topPercent,
      leftPercent,
      widthPercent: cropWidthPercent,
      heightPercent: cropHeightPercent,
    }),
    cropCutoffPercentage,
    requiresConfirmation: warning.isWarning,
    isSignificantCrop: warning.isSignificant,
    cropWarningMessage: warning.message,
  };
}

/**
 * Computes a crop box from explicit manual position coordinates.
 */
export function calculateManualCrop(
  originalWidth: number,
  originalHeight: number,
  printWidthInches: number,
  printHeightInches: number,
  manualOffset: { leftPercent?: number; topPercent?: number } = {},
): SmartCropResult {
  const base = calculateSmartCrop(originalWidth, originalHeight, printWidthInches, printHeightInches);

  const desiredLeft = typeof manualOffset.leftPercent === "number" ? manualOffset.leftPercent : base.cropBox.leftPercent;
  const desiredTop = typeof manualOffset.topPercent === "number" ? manualOffset.topPercent : base.cropBox.topPercent;

  const clamped = clampCropBox({
    topPercent: desiredTop,
    leftPercent: desiredLeft,
    widthPercent: base.cropBox.widthPercent,
    heightPercent: base.cropBox.heightPercent,
  });

  return {
    ...base,
    cropBox: clamped,
  };
}

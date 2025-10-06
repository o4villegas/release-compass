/**
 * Client-side image validation utilities for artwork uploads
 * Phase 3.2 requirement: Validate 3000x3000px minimum, 1:1 aspect ratio
 */

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

const MINIMUM_DIMENSION = 3000;
const MAXIMUM_FILE_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * Validates an image file for artwork requirements
 * - Minimum 3000x3000px
 * - 1:1 aspect ratio (square)
 * - Maximum 25MB file size
 * - Valid image format (JPEG, PNG, WebP)
 */
export async function validateArtworkImage(
  file: File
): Promise<ImageValidationResult> {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Must be JPEG, PNG, or WebP. Got: ${file.type}`,
    };
  }

  // Validate file size
  if (file.size > MAXIMUM_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 25MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  // Validate dimensions using browser Image API
  try {
    const dimensions = await getImageDimensions(file);

    // Check minimum dimensions
    if (dimensions.width < MINIMUM_DIMENSION || dimensions.height < MINIMUM_DIMENSION) {
      return {
        valid: false,
        error: `Image must be at least ${MINIMUM_DIMENSION}x${MINIMUM_DIMENSION}px. Got: ${dimensions.width}x${dimensions.height}px`,
        dimensions,
      };
    }

    // Check 1:1 aspect ratio (square)
    if (dimensions.width !== dimensions.height) {
      return {
        valid: false,
        error: `Image must have 1:1 aspect ratio (square). Got: ${dimensions.width}x${dimensions.height}px`,
        dimensions,
      };
    }

    return {
      valid: true,
      dimensions,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to read image: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Gets image dimensions using the browser Image API
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Helper function to format validation errors for display
 */
export function formatImageValidationError(result: ImageValidationResult): string {
  if (result.valid) {
    return '';
  }

  return result.error || 'Unknown validation error';
}

/**
 * Helper function to get success message with dimensions
 */
export function formatImageValidationSuccess(result: ImageValidationResult): string {
  if (!result.valid || !result.dimensions) {
    return '';
  }

  return `Valid artwork: ${result.dimensions.width}x${result.dimensions.height}px`;
}

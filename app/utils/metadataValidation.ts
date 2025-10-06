/**
 * Metadata validation utilities for master file uploads
 * Phase 3.2 requirement: Validate ISRC, genre, explicit content flag
 */

export interface MetadataValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * ISRC format: CC-XXX-YY-NNNNN
 * - CC: 2-letter country code
 * - XXX: 3-character registrant code
 * - YY: 2-digit year
 * - NNNNN: 5-digit designation code
 */
const ISRC_REGEX = /^[A-Z]{2}-[A-Z0-9]{3}-\d{2}-\d{5}$/;

/**
 * Valid music genres (matching platform standards)
 */
const VALID_GENRES = [
  'Pop',
  'Rock',
  'Hip-Hop',
  'R&B',
  'Country',
  'Electronic',
  'Jazz',
  'Classical',
  'Metal',
  'Indie',
  'Alternative',
  'Folk',
  'Blues',
  'Reggae',
  'Latin',
  'K-Pop',
  'World',
  'Soundtrack',
  'Other',
] as const;

export type Genre = (typeof VALID_GENRES)[number];

export interface MasterMetadata {
  isrc: string;
  genre: string;
  explicit_content: boolean;
}

/**
 * Validates master file metadata before upload
 */
export function validateMasterMetadata(
  metadata: Partial<MasterMetadata>
): MetadataValidationResult {
  const errors: Record<string, string> = {};

  // Validate ISRC
  if (!metadata.isrc) {
    errors.isrc = 'ISRC is required';
  } else if (!ISRC_REGEX.test(metadata.isrc)) {
    errors.isrc =
      'Invalid ISRC format. Must be: CC-XXX-YY-NNNNN (e.g., US-S1Z-99-00001)';
  }

  // Validate genre
  if (!metadata.genre) {
    errors.genre = 'Genre is required';
  } else if (!VALID_GENRES.includes(metadata.genre as Genre)) {
    errors.genre = `Invalid genre. Must be one of: ${VALID_GENRES.join(', ')}`;
  }

  // Validate explicit content flag
  if (typeof metadata.explicit_content !== 'boolean') {
    errors.explicit_content = 'Explicit content flag is required (true/false)';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Formats ISRC input to correct format (adds hyphens)
 */
export function formatISRC(input: string): string {
  // Remove all non-alphanumeric characters
  const cleaned = input.replace(/[^A-Z0-9]/gi, '').toUpperCase();

  // Format as CC-XXX-YY-NNNNN
  if (cleaned.length >= 12) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 7)}-${cleaned.slice(7, 12)}`;
  }

  return input.toUpperCase();
}

/**
 * Get all valid genres for dropdown/select
 */
export function getValidGenres(): readonly Genre[] {
  return VALID_GENRES;
}

/**
 * Validates individual ISRC field
 */
export function validateISRC(isrc: string): { valid: boolean; error?: string } {
  if (!isrc) {
    return { valid: false, error: 'ISRC is required' };
  }

  if (!ISRC_REGEX.test(isrc)) {
    return {
      valid: false,
      error: 'Invalid ISRC format. Must be: CC-XXX-YY-NNNNN (e.g., US-S1Z-99-00001)',
    };
  }

  return { valid: true };
}

/**
 * Validates individual genre field
 */
export function validateGenre(genre: string): { valid: boolean; error?: string } {
  if (!genre) {
    return { valid: false, error: 'Genre is required' };
  }

  if (!VALID_GENRES.includes(genre as Genre)) {
    return {
      valid: false,
      error: `Invalid genre. Must be one of: ${VALID_GENRES.join(', ')}`,
    };
  }

  return { valid: true };
}

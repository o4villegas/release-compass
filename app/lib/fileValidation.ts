// Client-side file validation (mirrors server-side validation)

export const FILE_SIZE_LIMITS = {
  photo: 10,        // 10MB
  short_video: 50,  // 50MB
  long_video: 100,  // 100MB
  voice_memo: 100,  // 100MB
  live_performance: 100, // 100MB
  team_meeting: 100, // 100MB
} as const;

export type ContentType = keyof typeof FILE_SIZE_LIMITS;

export const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'photo', label: 'Photo' },
  { value: 'short_video', label: 'Short Video (15-60s)' },
  { value: 'long_video', label: 'Long Video (1-5min)' },
  { value: 'voice_memo', label: 'Voice Memo' },
  { value: 'live_performance', label: 'Live Performance' },
  { value: 'team_meeting', label: 'Team Meeting' },
];

export const CAPTURE_CONTEXTS: { value: string; label: string }[] = [
  { value: 'recording_session', label: 'Recording Session' },
  { value: 'mixing_session', label: 'Mixing Session' },
  { value: 'mastering_session', label: 'Mastering Session' },
  { value: 'rehearsal', label: 'Rehearsal' },
  { value: 'live_show', label: 'Live Show' },
  { value: 'team_meeting', label: 'Team Meeting' },
  { value: 'content_day', label: 'Content Day' },
  { value: 'spontaneous', label: 'Spontaneous' },
  { value: 'archive_footage', label: 'Archive Footage' },
];

/**
 * Validate file size before upload (client-side)
 */
export function validateFileSize(
  file: File,
  contentType: ContentType
): { valid: boolean; error?: string } {
  const limitMB = FILE_SIZE_LIMITS[contentType];

  if (!limitMB) {
    return { valid: false, error: 'Unknown content type' };
  }

  const fileSizeMB = file.size / 1024 / 1024;

  if (fileSizeMB > limitMB) {
    return {
      valid: false,
      error: `Your ${contentType.replace('_', ' ')} is ${fileSizeMB.toFixed(1)}MB but the limit is ${limitMB}MB. Please compress before uploading.`,
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  if (mb < 1) {
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  }
  return `${mb.toFixed(1)} MB`;
}

/**
 * Get accepted file types for input element
 */
export function getAcceptedFileTypes(contentType: ContentType): string {
  if (contentType === 'photo') {
    return 'image/jpeg,image/png,image/webp,image/jpg';
  }

  if (contentType.includes('video') || contentType === 'live_performance' || contentType === 'team_meeting') {
    return 'video/mp4,video/quicktime,video/webm';
  }

  if (contentType === 'voice_memo') {
    return 'audio/wav,audio/mpeg,audio/mp3,audio/m4a';
  }

  return '*';
}

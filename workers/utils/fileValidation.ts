// File size limits (in bytes) based on Cloudflare free tier constraints
export const FILE_SIZE_LIMITS = {
  photo: 10 * 1024 * 1024,        // 10MB
  short_video: 50 * 1024 * 1024,  // 50MB
  long_video: 100 * 1024 * 1024,  // 100MB (WARNING: at Cloudflare limit)
  voice_memo: 100 * 1024 * 1024,  // 100MB (WARNING: at Cloudflare limit)
  live_performance: 100 * 1024 * 1024, // 100MB
  team_meeting: 100 * 1024 * 1024, // 100MB
} as const;

export type ContentType = keyof typeof FILE_SIZE_LIMITS;

// Content types for validation
export const CONTENT_TYPES: ContentType[] = [
  'photo',
  'short_video',
  'long_video',
  'voice_memo',
  'live_performance',
  'team_meeting',
];

// Capture contexts
export const CAPTURE_CONTEXTS = [
  'recording_session',
  'mixing_session',
  'mastering_session',
  'rehearsal',
  'live_show',
  'team_meeting',
  'content_day',
  'spontaneous',
  'archive_footage',
] as const;

export type CaptureContext = typeof CAPTURE_CONTEXTS[number];

// File type validation
export const FILE_TYPE_VALIDATION: Record<string, string[]> = {
  photo: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  audio: ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/m4a'],
};

/**
 * Validate file size against content type limits
 */
export function validateFileSize(
  fileSize: number,
  contentType: ContentType
): { valid: boolean; error?: string; limitMB?: number } {
  const limit = FILE_SIZE_LIMITS[contentType];

  if (!limit) {
    return { valid: false, error: 'Unknown content type' };
  }

  const fileSizeMB = fileSize / 1024 / 1024;
  const limitMB = limit / 1024 / 1024;

  if (fileSize > limit) {
    return {
      valid: false,
      error: `File size ${fileSizeMB.toFixed(1)}MB exceeds ${limitMB}MB limit. Please compress before uploading.`,
      limitMB
    };
  }

  return { valid: true, limitMB };
}

/**
 * Validate file MIME type
 */
export function validateFileMimeType(
  mimeType: string,
  contentType: ContentType
): { valid: boolean; error?: string } {
  if (contentType === 'photo') {
    if (FILE_TYPE_VALIDATION.photo.includes(mimeType)) {
      return { valid: true };
    }
    return { valid: false, error: 'Invalid photo format. Use JPEG, PNG, or WebP.' };
  }

  if (contentType.includes('video') || contentType === 'live_performance' || contentType === 'team_meeting') {
    if (FILE_TYPE_VALIDATION.video.includes(mimeType)) {
      return { valid: true };
    }
    return { valid: false, error: 'Invalid video format. Use MP4, MOV, or WebM.' };
  }

  if (contentType === 'voice_memo') {
    if (FILE_TYPE_VALIDATION.audio.includes(mimeType)) {
      return { valid: true };
    }
    return { valid: false, error: 'Invalid audio format. Use WAV, MP3, or M4A.' };
  }

  return { valid: true };
}

/**
 * Get content type display name
 */
export function getContentTypeDisplay(contentType: ContentType): string {
  const displayNames: Record<ContentType, string> = {
    photo: 'Photo',
    short_video: 'Short Video (15-60s)',
    long_video: 'Long Video (1-5min)',
    voice_memo: 'Voice Memo',
    live_performance: 'Live Performance',
    team_meeting: 'Team Meeting',
  };

  return displayNames[contentType] || contentType;
}

/**
 * Get capture context display name
 */
export function getCaptureContextDisplay(context: CaptureContext): string {
  const displayNames: Record<CaptureContext, string> = {
    recording_session: 'Recording Session',
    mixing_session: 'Mixing Session',
    mastering_session: 'Mastering Session',
    rehearsal: 'Rehearsal',
    live_show: 'Live Show',
    team_meeting: 'Team Meeting',
    content_day: 'Content Day',
    spontaneous: 'Spontaneous',
    archive_footage: 'Archive Footage',
  };

  return displayNames[context] || context;
}

import type { D1Database } from '@cloudflare/workers-types';

export interface FileItem {
  id: string;
  project_id: string;
  file_type: 'master_audio' | 'stems' | 'artwork' | 'receipt' | 'proof' | 'other';
  file_name: string;
  storage_key: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  notes_acknowledged?: number;
}

export interface FilesResponse {
  files: FileItem[];
  count: number;
}

/**
 * Get all files for a project, optionally filtered by file type
 */
export async function getProjectFiles(
  db: D1Database,
  projectId: string,
  fileType?: string
): Promise<FilesResponse> {
  let query = 'SELECT * FROM files WHERE project_id = ?';
  const params: string[] = [projectId];

  if (fileType) {
    query += ' AND file_type = ?';
    params.push(fileType);
  }

  query += ' ORDER BY uploaded_at DESC';

  const result = await db.prepare(query).bind(...params).all();

  return {
    files: result.results as FileItem[],
    count: result.results.length,
  };
}

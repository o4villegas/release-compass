import type { Route } from "./+types/project.$id.files";
import { useLoaderData, Link } from 'react-router';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Alert } from '~/components/ui/alert';
import { Progress } from '~/components/ui/progress';
import { AudioPlayer } from '~/components/AudioPlayer';
import { Badge } from '~/components/ui/badge';

type FileType = 'master' | 'stems' | 'artwork' | 'contracts' | 'receipts';

interface FileItem {
  id: string;
  file_type: FileType;
  storage_key: string;
  uploaded_at: string;
  uploaded_by: string;
  notes_acknowledged: number;
}

const FILE_SIZE_LIMITS: Record<FileType, number> = {
  master: 100,
  stems: 100,
  artwork: 10,
  contracts: 10,
  receipts: 10,
};

const FILE_TYPE_LABELS: Record<FileType, string> = {
  master: 'Master Audio',
  stems: 'Stems',
  artwork: 'Artwork',
  contracts: 'Contracts',
  receipts: 'Receipts',
};

export async function loader({ params, request }: Route.LoaderArgs) {
  const { id } = params;
  const url = new URL(request.url);
  const apiUrl = `${url.origin}/api`;

  // Fetch project details
  const projectRes = await fetch(`${apiUrl}/projects/${id}`);
  if (!projectRes.ok) throw new Error('Failed to fetch project');
  const projectData = await projectRes.json();

  // Fetch files for this project
  const filesRes = await fetch(`${apiUrl}/projects/${id}/files`);
  if (!filesRes.ok) throw new Error('Failed to fetch files');
  const filesData = await filesRes.json();

  return {
    project: projectData.project,
    files: filesData.files as FileItem[],
  };
}

export default function ProjectFiles() {
  const { project, files } = useLoaderData<typeof loader>();
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>('master');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<any>(null);

  const userUuid = typeof window !== 'undefined' ? localStorage.getItem('user_uuid') || crypto.randomUUID() : '';
  if (typeof window !== 'undefined' && !localStorage.getItem('user_uuid')) {
    localStorage.setItem('user_uuid', userUuid);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      setError('');
      return;
    }

    const sizeLimitMB = FILE_SIZE_LIMITS[fileType];
    const fileSizeMB = selectedFile.size / 1024 / 1024;

    if (fileSizeMB > sizeLimitMB) {
      setError(`File size ${fileSizeMB.toFixed(1)}MB exceeds limit of ${sizeLimitMB}MB. Please compress before uploading.`);
      setFile(null);
      return;
    }

    setError('');
    setFile(selectedFile);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', project.id);
    formData.append('file_type', fileType);
    formData.append('user_uuid', userUuid);

    setUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      // Reset form and reload
      setFile(null);
      setUploadProgress(0);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const loadFileDetails = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`);
      if (!response.ok) throw new Error('Failed to load file');
      const data = await response.json();
      setFileDetails(data);
      setSelectedFileId(fileId);
    } catch (err) {
      console.error('Error loading file:', err);
      setError('Failed to load file details');
    }
  };

  const masterFiles = files.filter((f) => f.file_type === 'master');
  const stemFiles = files.filter((f) => f.file_type === 'stems');
  const artworkFiles = files.filter((f) => f.file_type === 'artwork');
  const otherFiles = files.filter((f) => !['master', 'stems', 'artwork'].includes(f.file_type));

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <Link to={`/project/${project.id}`} className="text-sm text-muted-foreground hover:text-primary">
          ← Back to Project
        </Link>
        <h1 className="text-4xl font-bold mt-2">Production Files</h1>
        <p className="text-muted-foreground">
          {project.artist_name} - {project.release_title}
        </p>
      </div>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Upload master audio, stems, artwork, or other production files</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="file-type">File Type *</Label>
                <Select value={fileType} onValueChange={(value) => setFileType(value as FileType)}>
                  <SelectTrigger id="file-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FILE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label} ({FILE_SIZE_LIMITS[value as FileType]}MB max)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">File *</Label>
                <Input id="file" type="file" onChange={handleFileChange} disabled={uploading} />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
                  </p>
                )}
              </div>
            </div>

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-center text-muted-foreground">Uploading... {uploadProgress}%</p>
              </div>
            )}

            {error && (
              <Alert className="border-destructive text-destructive">{error}</Alert>
            )}

            <Button type="submit" disabled={!file || uploading} className="w-full">
              {uploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Master Files */}
      {masterFiles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Master Audio Files</h2>
          {masterFiles.map((fileItem) => (
            <div key={fileItem.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {fileItem.storage_key.split('/').pop()}
                      </CardTitle>
                      <CardDescription>
                        Uploaded {new Date(fileItem.uploaded_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {fileItem.notes_acknowledged === 1 && (
                        <Badge variant="default">✓ Acknowledged</Badge>
                      )}
                      <Button onClick={() => loadFileDetails(fileItem.id)} variant="outline" size="sm">
                        {selectedFileId === fileItem.id ? 'Hide Player' : 'Show Player'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              {selectedFileId === fileItem.id && fileDetails && (
                <div className="mt-4">
                  <AudioPlayer
                    fileId={fileItem.id}
                    audioUrl={fileDetails.download_url}
                    userUuid={userUuid}
                    uploadedBy={fileItem.uploaded_by}
                    notesAcknowledged={fileItem.notes_acknowledged === 1}
                    onAcknowledge={() => window.location.reload()}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stems Files */}
      {stemFiles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Stems</h2>
          {stemFiles.map((fileItem) => (
            <div key={fileItem.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {fileItem.storage_key.split('/').pop()}
                      </CardTitle>
                      <CardDescription>
                        Uploaded {new Date(fileItem.uploaded_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {fileItem.notes_acknowledged === 1 && (
                        <Badge variant="default">✓ Acknowledged</Badge>
                      )}
                      <Button onClick={() => loadFileDetails(fileItem.id)} variant="outline" size="sm">
                        {selectedFileId === fileItem.id ? 'Hide Player' : 'Show Player'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              {selectedFileId === fileItem.id && fileDetails && (
                <div className="mt-4">
                  <AudioPlayer
                    fileId={fileItem.id}
                    audioUrl={fileDetails.download_url}
                    userUuid={userUuid}
                    uploadedBy={fileItem.uploaded_by}
                    notesAcknowledged={fileItem.notes_acknowledged === 1}
                    onAcknowledge={() => window.location.reload()}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Artwork & Other Files */}
      {(artworkFiles.length > 0 || otherFiles.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Other Files</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...artworkFiles, ...otherFiles].map((fileItem) => (
              <Card key={fileItem.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {FILE_TYPE_LABELS[fileItem.file_type]}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {fileItem.storage_key.split('/').pop()}
                    <br />
                    Uploaded {new Date(fileItem.uploaded_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {files.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No files uploaded yet. Upload your first file above.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

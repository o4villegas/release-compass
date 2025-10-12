import type { Route } from "./+types/project.$id.master";
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { useLoaderData, Link, useRevalidator } from 'react-router';
import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Alert } from '~/components/ui/alert';
import { Progress } from '~/components/ui/progress';
import { AudioPlayer } from '~/components/AudioPlayer';
import { Badge } from '~/components/ui/badge';
import { Checkbox } from '~/components/ui/checkbox';
import { BackButton } from '~/components/BackButton';
import { CheckCircle, XCircle } from 'lucide-react';
import {
  validateArtworkImage,
  formatImageValidationError,
  formatImageValidationSuccess,
} from '~/utils/imageValidation';
import {
  validateMasterMetadata,
  formatISRC,
  getValidGenres,
  type Genre,
  type MasterMetadata,
} from '~/utils/metadataValidation';

interface FileItem {
  id: string;
  file_type: 'master' | 'stems' | 'artwork' | 'contracts' | 'receipts';
  storage_key: string;
  uploaded_at: string;
  uploaded_by: string;
  notes_acknowledged: number;
  metadata_json?: string;
  metadata_complete?: number;
}

interface Project {
  id: string;
  artist_name: string;
  release_title: string;
  release_type: string;
  target_release_date: string;
}

export async function loader({ params, context }: Route.LoaderArgs) {
  // Use direct DB access instead of HTTP fetch to avoid SSR issues
  const env = context.cloudflare as { env: { DB: D1Database; BUCKET: R2Bucket } };

  const { getProjectDetails } = await import("../../workers/api-handlers/projects");
  const { getProjectFiles } = await import("../../workers/api-handlers/files");

  const projectData = await getProjectDetails(env.env.DB, params.id);
  const filesData = await getProjectFiles(env.env.DB, params.id);

  if (!projectData) {
    throw new Response("Project not found", { status: 404 });
  }

  return {
    project: projectData.project as Project,
    files: filesData.files as FileItem[],
  };
}

export default function ProjectMaster() {
  const { project, files } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  // File upload state
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Metadata state
  const [isrc, setIsrc] = useState('');
  const [genre, setGenre] = useState<Genre | ''>('');
  const [explicitContent, setExplicitContent] = useState(false);

  // Validation state
  const [artworkValidation, setArtworkValidation] = useState('');
  const [metadataErrors, setMetadataErrors] = useState<Record<string, string>>({});
  const [isrcValidation, setIsrcValidation] = useState<'typing' | 'valid' | 'invalid' | ''>('');

  // File preview state
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<any>(null);

  // Uploaded file keys (for form submission)
  const [uploadedMasterKey, setUploadedMasterKey] = useState('');
  const [uploadedArtworkKey, setUploadedArtworkKey] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const artworkInputRef = useRef<HTMLInputElement>(null);

  const userUuid =
    typeof window !== 'undefined' ? localStorage.getItem('user_uuid') || crypto.randomUUID() : '';
  if (typeof window !== 'undefined' && !localStorage.getItem('user_uuid')) {
    localStorage.setItem('user_uuid', userUuid);
  }

  const masterFiles = files.filter((f) => f.file_type === 'master');
  const artworkFiles = files.filter((f) => f.file_type === 'artwork');

  // Handle master audio file selection
  const handleMasterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setMasterFile(null);
      setError('');
      return;
    }

    const sizeLimitMB = 100;
    const fileSizeMB = selectedFile.size / 1024 / 1024;

    if (fileSizeMB > sizeLimitMB) {
      setError(
        `Audio file size ${fileSizeMB.toFixed(1)}MB exceeds limit of ${sizeLimitMB}MB. Please compress before uploading.`
      );
      setMasterFile(null);
      return;
    }

    setError('');
    setMasterFile(selectedFile);
  };

  // Handle artwork file selection with validation
  const handleArtworkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setArtworkFile(null);
      setArtworkValidation('');
      return;
    }

    setArtworkValidation('Validating artwork...');

    const validation = await validateArtworkImage(selectedFile);

    if (!validation.valid) {
      setArtworkValidation(formatImageValidationError(validation));
      setArtworkFile(null);
      return;
    }

    setArtworkValidation(formatImageValidationSuccess(validation));
    setArtworkFile(selectedFile);
  };

  // Handle ISRC input with auto-formatting and real-time validation
  const handleIsrcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatISRC(e.target.value);
    setIsrc(formatted);

    // Real-time validation feedback
    if (formatted.length === 0) {
      setIsrcValidation('');
    } else if (formatted.length === 15) {
      // Check if valid ISRC format
      const isValid = /^[A-Z]{2}-[A-Z0-9]{3}-\d{2}-\d{5}$/.test(formatted);
      setIsrcValidation(isValid ? 'valid' : 'invalid');
    } else {
      setIsrcValidation('typing');
    }
  };

  // Upload master audio file
  const handleMasterUpload = async () => {
    if (!masterFile) {
      setError('Please select a master audio file');
      return;
    }

    const formData = new FormData();
    formData.append('file', masterFile);
    formData.append('project_id', project.id);
    formData.append('file_type', 'master');
    formData.append('user_uuid', userUuid);

    setUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Master upload failed');
      }

      const data = await response.json() as { file: { id: string } };
      setUploadedMasterKey(data.file.id);
      setSuccess('Master audio uploaded successfully');
      setMasterFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Master upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Upload artwork file
  const handleArtworkUpload = async () => {
    if (!artworkFile) {
      setError('Please select an artwork file');
      return;
    }

    const formData = new FormData();
    formData.append('file', artworkFile);
    formData.append('project_id', project.id);
    formData.append('file_type', 'artwork');
    formData.append('user_uuid', userUuid);

    setUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Artwork upload failed');
      }

      const data = await response.json() as { file: { id: string } };
      setUploadedArtworkKey(data.file.id);
      setSuccess('Artwork uploaded successfully');
      setArtworkFile(null);
      setArtworkValidation('');
      if (artworkInputRef.current) artworkInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Artwork upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Submit metadata
  const handleMetadataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setMetadataErrors({});

    if (!uploadedMasterKey) {
      setError('Please upload master audio file first');
      return;
    }

    // Validate metadata
    const metadata: Partial<MasterMetadata> = {
      isrc,
      genre,
      explicit_content: explicitContent,
    };

    const validation = validateMasterMetadata(metadata);

    if (!validation.valid) {
      setMetadataErrors(validation.errors);
      setError('Please fix validation errors');
      return;
    }

    try {
      const response = await fetch(`/api/files/${uploadedMasterKey}/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isrc,
          genre,
          explicit_content: explicitContent,
          user_uuid: userUuid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Metadata submission failed');
      }

      setSuccess('Master file complete! Metadata saved and ready for distribution.');
      setIsrc('');
      setGenre('');
      setExplicitContent(false);
      setUploadedMasterKey('');
      setUploadedArtworkKey('');

      // Reload data
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Metadata submission failed');
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

  const isFormComplete = uploadedMasterKey && uploadedArtworkKey && isrc && genre;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <BackButton to={`/project/${project.id}`} label="Back to Project" />
        <h1 className="text-4xl font-bold mt-2">Master & Artwork Upload</h1>
        <p className="text-muted-foreground">
          {project.artist_name} - {project.release_title}
        </p>
      </div>

      {/* Instructions */}
      <Alert>
        <div className="space-y-2">
          <p className="font-semibold">Upload Requirements:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Master audio: WAV or FLAC format, maximum 100MB</li>
            <li>Artwork: Minimum 3000x3000px, 1:1 aspect ratio (square), maximum 25MB</li>
            <li>Metadata: ISRC code, genre, and explicit content flag required</li>
          </ul>
        </div>
      </Alert>

      {/* Upload Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Master Audio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                1
              </span>
              Master Audio
            </CardTitle>
            <CardDescription>Upload your final mixed and mastered audio file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="master-file">Audio File *</Label>
              <Input
                ref={fileInputRef}
                id="master-file"
                type="file"
                accept="audio/*"
                onChange={handleMasterFileChange}
                disabled={uploading || !!uploadedMasterKey}
              />
              {masterFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {masterFile.name} ({(masterFile.size / 1024 / 1024).toFixed(2)}MB)
                </p>
              )}
            </div>

            <Button
              onClick={handleMasterUpload}
              disabled={!masterFile || uploading || !!uploadedMasterKey}
              className="w-full flex items-center gap-2 justify-center"
            >
              {uploadedMasterKey ? <><CheckCircle className="h-4 w-4" /> Master Uploaded</> : 'Upload Master'}
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Artwork */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                2
              </span>
              Artwork
            </CardTitle>
            <CardDescription>Upload your album/single artwork (3000x3000px minimum)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="artwork-file">Artwork File *</Label>
              <Input
                ref={artworkInputRef}
                id="artwork-file"
                type="file"
                accept="image/*"
                onChange={handleArtworkFileChange}
                disabled={uploading || !!uploadedArtworkKey}
              />
              {artworkValidation && (
                <p
                  className={`text-sm ${
                    artworkValidation.includes('Valid')
                      ? 'text-green-600'
                      : 'text-destructive'
                  }`}
                >
                  {artworkValidation}
                </p>
              )}
            </div>

            <Button
              onClick={handleArtworkUpload}
              disabled={!artworkFile || uploading || !!uploadedArtworkKey}
              className="w-full flex items-center gap-2 justify-center"
            >
              {uploadedArtworkKey ? <><CheckCircle className="h-4 w-4" /> Artwork Uploaded</> : 'Upload Artwork'}
            </Button>
          </CardContent>
        </Card>

        {/* Step 3: Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                3
              </span>
              Metadata
            </CardTitle>
            <CardDescription>Provide required metadata for distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMetadataSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="isrc">ISRC Code *</Label>
                <Input
                  id="isrc"
                  type="text"
                  placeholder="US-S1Z-99-00001"
                  value={isrc}
                  onChange={handleIsrcChange}
                  maxLength={17}
                  disabled={!uploadedMasterKey}
                  className={
                    isrcValidation === 'invalid'
                      ? 'border-destructive'
                      : isrcValidation === 'valid'
                      ? 'border-green-500'
                      : ''
                  }
                />
                {metadataErrors.isrc && (
                  <p className="text-sm text-destructive">{metadataErrors.isrc}</p>
                )}
                {isrcValidation === 'typing' && (
                  <p className="text-xs text-muted-foreground">Continue typing...</p>
                )}
                {isrcValidation === 'valid' && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Valid ISRC format
                  </p>
                )}
                {isrcValidation === 'invalid' && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Invalid ISRC format (must be CC-XXX-YY-NNNNN)
                  </p>
                )}
                {!isrcValidation && !metadataErrors.isrc && (
                  <p className="text-xs text-muted-foreground">Format: CC-XXX-YY-NNNNN</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="genre">Genre *</Label>
                <Select
                  value={genre}
                  onValueChange={(value) => setGenre(value as Genre)}
                  disabled={!uploadedMasterKey}
                >
                  <SelectTrigger id="genre">
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {getValidGenres().map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {metadataErrors.genre && (
                  <p className="text-sm text-destructive">{metadataErrors.genre}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="explicit"
                  checked={explicitContent}
                  onCheckedChange={(checked) => setExplicitContent(checked === true)}
                  disabled={!uploadedMasterKey}
                />
                <Label htmlFor="explicit" className="text-sm font-normal cursor-pointer">
                  Contains explicit content
                </Label>
              </div>

              <Button type="submit" disabled={!isFormComplete || uploading} className="w-full">
                Complete Master Upload
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-muted-foreground">
                Uploading... {uploadProgress}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error/Success Messages */}
      {error && (
        <Alert className="border-destructive text-destructive">{error}</Alert>
      )}

      {success && (
        <Alert className="border-green-600 text-green-600">{success}</Alert>
      )}

      {/* Existing Master Files */}
      {masterFiles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Uploaded Masters</h2>
          {masterFiles.map((fileItem) => (
            <div key={fileItem.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {fileItem.storage_key.split('/').pop()}
                      </CardTitle>
                      <CardDescription>
                        Uploaded {new Date(fileItem.uploaded_at).toLocaleDateString()}
                      </CardDescription>
                      {fileItem.metadata_json && (() => {
                        try {
                          const metadata = JSON.parse(fileItem.metadata_json);
                          return (
                            <div className="flex gap-2 mt-2">
                              {metadata.isrc && <Badge variant="outline">ISRC: {metadata.isrc}</Badge>}
                              {metadata.genre && <Badge variant="outline">{metadata.genre}</Badge>}
                              {metadata.explicit_content && (
                                <Badge variant="destructive">Explicit</Badge>
                              )}
                            </div>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                    <div className="flex gap-2">
                      {fileItem.notes_acknowledged === 1 && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Acknowledged
                        </Badge>
                      )}
                      <Button
                        onClick={() => loadFileDetails(fileItem.id)}
                        variant="outline"
                        size="sm"
                      >
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
                    onAcknowledge={() => revalidator.revalidate()}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Existing Artwork Files */}
      {artworkFiles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Uploaded Artwork</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {artworkFiles.map((fileItem) => (
              <Card key={fileItem.id}>
                <CardHeader>
                  <CardDescription className="text-xs">
                    {fileItem.storage_key.split('/').pop()}
                    <br />
                    {new Date(fileItem.uploaded_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Alert } from '~/components/ui/alert';
import { Progress } from '~/components/ui/progress';
import {
  validateFileSize,
  formatFileSize,
  getAcceptedFileTypes,
  CONTENT_TYPES,
  CAPTURE_CONTEXTS,
  type ContentType,
} from '~/lib/fileValidation';

interface ContentUploadProps {
  projectId: string;
  milestoneId?: string;
  onUploadComplete?: (contentId: string) => void;
}

export function ContentUpload({ projectId, milestoneId, onUploadComplete }: ContentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState<ContentType>('photo');
  const [captureContext, setCaptureContext] = useState('');
  const [captionDraft, setCaptionDraft] = useState('');
  const [intendedPlatforms, setIntendedPlatforms] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationError, setValidationError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      setValidationError('');
      return;
    }

    // Validate file size
    const validation = validateFileSize(selectedFile, contentType);
    if (!validation.valid) {
      setValidationError(validation.error || 'File validation failed');
      setFile(null);
      return;
    }

    setValidationError('');
    setFile(selectedFile);
  };

  const handleContentTypeChange = (value: string) => {
    setContentType(value as ContentType);
    // Re-validate file if one is selected
    if (file) {
      const validation = validateFileSize(file, value as ContentType);
      if (!validation.valid) {
        setValidationError(validation.error || 'File validation failed');
        setFile(null);
      } else {
        setValidationError('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!file || !contentType || !captureContext) {
      setError('Please fill in all required fields');
      return;
    }

    // Get user UUID from localStorage
    const userUuid = localStorage.getItem('user_uuid') || crypto.randomUUID();
    localStorage.setItem('user_uuid', userUuid);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId);
    if (milestoneId) {
      formData.append('milestone_id', milestoneId);
    }
    formData.append('content_type', contentType);
    formData.append('capture_context', captureContext);
    formData.append('user_uuid', userUuid);
    if (captionDraft) {
      formData.append('caption_draft', captionDraft);
    }
    if (intendedPlatforms) {
      formData.append('intended_platforms', intendedPlatforms);
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/content/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      // Reset form
      setFile(null);
      setCaptionDraft('');
      setIntendedPlatforms('');
      setUploadProgress(0);

      // Notify parent component
      if (onUploadComplete && data.content?.id) {
        onUploadComplete(data.content.id);
      }

      // Show quota status if available
      if (data.quota_status) {
        if (data.quota_status.quota_met) {
          setSuccess('✅ Upload successful! All content requirements met for this milestone.');
        } else {
          const unmetRequirements = data.quota_status.requirements
            .filter((r: any) => !r.met)
            .map((r: any) => `${r.content_type.replace('_', ' ')}: ${r.missing} more`)
            .join(', ');
          setSuccess(`✅ Upload successful! Still needed: ${unmetRequirements}`);
        }
      } else {
        setSuccess('✅ Upload successful!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Content</CardTitle>
        <CardDescription>
          Upload photos, videos, or audio to track your content creation progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Content Type */}
          <div className="space-y-2">
            <Label htmlFor="content-type">Content Type *</Label>
            <Select value={contentType} onValueChange={handleContentTypeChange}>
              <SelectTrigger id="content-type">
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="file">File *</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              accept={getAcceptedFileTypes(contentType)}
              disabled={uploading}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({formatFileSize(file.size)})
              </p>
            )}
            {validationError && (
              <Alert className="border-destructive text-destructive">
                {validationError}
              </Alert>
            )}
          </div>

          {/* Capture Context */}
          <div className="space-y-2">
            <Label htmlFor="capture-context">Capture Context *</Label>
            <Select value={captureContext} onValueChange={setCaptureContext}>
              <SelectTrigger id="capture-context">
                <SelectValue placeholder="Where was this captured?" />
              </SelectTrigger>
              <SelectContent>
                {CAPTURE_CONTEXTS.map((context) => (
                  <SelectItem key={context.value} value={context.value}>
                    {context.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Caption Draft (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption Draft (Optional)</Label>
            <Input
              id="caption"
              placeholder="Draft your caption or notes..."
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              disabled={uploading}
            />
          </div>

          {/* Intended Platforms (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="platforms">Intended Platforms (Optional)</Label>
            <Input
              id="platforms"
              placeholder="e.g., Instagram, TikTok, YouTube"
              value={intendedPlatforms}
              onChange={(e) => setIntendedPlatforms(e.target.value)}
              disabled={uploading}
            />
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-muted-foreground">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Success Display */}
          {success && (
            <Alert className="border-green-600 bg-green-50 text-green-800">
              {success}
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert className="border-destructive text-destructive">
              {error}
            </Alert>
          )}

          {/* Submit Button */}
          <Button type="submit" disabled={!file || !captureContext || uploading} className="w-full">
            {uploading ? 'Uploading...' : 'Upload Content'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Alert } from '~/components/ui/alert';
import { Camera, Video, Mic, Drama, Folder } from 'lucide-react';

interface ContentItem {
  id: string;
  content_type: string;
  capture_context: string;
  storage_key: string;
  caption_draft: string | null;
  intended_platforms: string | null;
  created_at: string;
}

interface ContentLightboxProps {
  allContent: ContentItem[];
  currentIndex: number;
  open: boolean;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

export function ContentLightbox({
  allContent,
  currentIndex,
  open,
  onClose,
  onNavigate
}: ContentLightboxProps) {
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentItem = allContent[currentIndex];
  const totalItems = allContent.length;

  useEffect(() => {
    if (open && currentItem) {
      setLoading(true);
      setError('');
      setMediaUrl('');

      // Fetch presigned URL for current content
      fetch(`/api/content/${currentItem.id}/url`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to load content');
          return res.json();
        })
        .then(data => {
          const typedData = data as { url: string };
          setMediaUrl(typedData.url);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching media URL:', err);
          setError(err instanceof Error ? err.message : 'Failed to load content');
          setLoading(false);
        });
    }
  }, [open, currentItem?.id]);

  // Arrow key navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        onNavigate(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < totalItems - 1) {
        e.preventDefault();
        onNavigate(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, totalItems, onNavigate]);

  if (!currentItem) return null;

  const getContentIcon = (contentType: string) => {
    if (contentType === 'photo') return <Camera className="h-6 w-6" />;
    if (contentType.includes('video')) return <Video className="h-6 w-6" />;
    if (contentType === 'voice_memo') return <Mic className="h-6 w-6" />;
    if (contentType === 'live_performance') return <Drama className="h-6 w-6" />;
    return <Folder className="h-6 w-6" />;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getContentIcon(currentItem.content_type)}
              <DialogTitle>Content Preview</DialogTitle>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {currentIndex + 1} / {totalItems}
            </Badge>
          </div>
        </DialogHeader>

        {/* Media Display */}
        <div className="relative bg-black rounded-lg overflow-hidden min-h-[500px] flex items-center justify-center">
          {loading && (
            <div className="text-white flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Loading preview...</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <Alert className="border-destructive bg-destructive/10 text-destructive max-w-md">
                <p className="font-semibold">Failed to load preview</p>
                <p className="text-sm mt-1">{error}</p>
              </Alert>
            </div>
          )}

          {!loading && !error && mediaUrl && (
            <>
              {currentItem.content_type === 'photo' && (
                <img
                  src={mediaUrl}
                  alt="Content preview"
                  className="max-w-full max-h-[700px] object-contain"
                />
              )}
              {currentItem.content_type.includes('video') && (
                <video
                  src={mediaUrl}
                  controls
                  className="max-w-full max-h-[700px]"
                  autoPlay
                />
              )}
              {currentItem.content_type === 'voice_memo' && (
                <div className="w-full max-w-2xl p-8">
                  <audio src={mediaUrl} controls className="w-full" />
                  <p className="text-white text-center mt-4 text-sm flex items-center justify-center gap-2">
                    <Mic className="h-4 w-4" /> Voice Memo
                  </p>
                </div>
              )}
              {currentItem.content_type === 'live_performance' && (
                <video
                  src={mediaUrl}
                  controls
                  className="max-w-full max-h-[700px]"
                  autoPlay
                />
              )}
            </>
          )}

          {/* Navigation Arrows */}
          {!loading && currentIndex > 0 && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100 w-12 h-12 shadow-lg"
              onClick={() => onNavigate(currentIndex - 1)}
              title="Previous (←)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
          )}
          {!loading && currentIndex < totalItems - 1 && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100 w-12 h-12 shadow-lg"
              onClick={() => onNavigate(currentIndex + 1)}
              title="Next (→)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-3 text-sm bg-card p-4 rounded-lg border border-border">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize">
              {currentItem.content_type.replace('_', ' ')}
            </Badge>
            <Badge variant="secondary" className="capitalize">
              {currentItem.capture_context.replace('_', ' ')}
            </Badge>
          </div>

          {currentItem.caption_draft && (
            <div>
              <p className="font-semibold text-xs text-muted-foreground mb-1">Caption Draft:</p>
              <p className="text-foreground">{currentItem.caption_draft}</p>
            </div>
          )}

          {currentItem.intended_platforms && (
            <div>
              <p className="font-semibold text-xs text-muted-foreground mb-1">Intended Platforms:</p>
              <div className="flex gap-1.5 flex-wrap">
                {currentItem.intended_platforms.split(',').map((platform, idx) => (
                  <Badge key={idx} variant="default" className="text-xs">
                    {platform.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground">
              Uploaded: {new Date(currentItem.created_at).toLocaleDateString()} at{' '}
              {new Date(currentItem.created_at).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            Use arrow keys (← →) to navigate
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close (Esc)
            </Button>
            {mediaUrl && (
              <Button variant="default" asChild>
                <a href={mediaUrl} download target="_blank" rel="noopener noreferrer">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

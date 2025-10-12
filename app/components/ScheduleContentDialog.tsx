import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Badge } from '~/components/ui/badge';
import { Calendar, Camera, Video, Mic, Drama, Folder } from 'lucide-react';

interface ScheduleContentDialogProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (data: ScheduleData) => Promise<void>;
  contentItem?: {
    id: string;
    content_type: string;
    caption_draft: string | null;
  } | null;
  prefilledDate?: string;
}

interface ScheduleData {
  contentId: string;
  scheduledDate: string;
  platforms: string;
  notes: string;
}

export function ScheduleContentDialog({
  open,
  onClose,
  onSchedule,
  contentItem,
  prefilledDate = ''
}: ScheduleContentDialogProps) {
  const [scheduledDate, setScheduledDate] = useState(prefilledDate);
  const [platforms, setPlatforms] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update scheduledDate when prefilledDate changes
  useEffect(() => {
    if (prefilledDate) {
      setScheduledDate(prefilledDate);
    }
  }, [prefilledDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contentItem || !scheduledDate) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSchedule({
        contentId: contentItem.id,
        scheduledDate,
        platforms,
        notes
      });

      // Reset form fields only (date will be reset by useEffect on next open)
      setPlatforms('');
      setNotes('');
      // Don't call onClose() here - let the parent handle it via success state
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Content for Posting
          </DialogTitle>
          <DialogDescription>
            Choose when to post this content and on which platforms
          </DialogDescription>
        </DialogHeader>

        {contentItem && (
          <div className="mb-4 p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {contentItem.content_type === 'photo' ? <Camera className="h-8 w-8" /> :
                 contentItem.content_type.includes('short') ? <Video className="h-8 w-8" /> :
                 contentItem.content_type.includes('long') ? <Video className="h-8 w-8" /> :
                 contentItem.content_type.includes('voice') ? <Mic className="h-8 w-8" /> :
                 contentItem.content_type.includes('live') ? <Drama className="h-8 w-8" /> : <Folder className="h-8 w-8" />}
              </div>
              <div>
                <Badge variant="outline" className="mb-1 capitalize">
                  {contentItem.content_type.replace('_', ' ')}
                </Badge>
                {contentItem.caption_draft && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {contentItem.caption_draft}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scheduled-date">Scheduled Date *</Label>
            <Input
              id="scheduled-date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="platforms">Platforms</Label>
            <Input
              id="platforms"
              type="text"
              placeholder="e.g., Instagram, TikTok, YouTube"
              value={platforms}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlatforms(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of platforms
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Scheduling Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about timing, hashtags, or posting strategy..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !contentItem}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Content'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { useState } from 'react';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Camera, Video, Mic, Drama, Folder } from 'lucide-react';

interface ContentItem {
  id: string;
  content_type: string;
  caption_draft: string | null;
}

interface ContentPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (content: ContentItem) => void;
  availableContent: ContentItem[];
  selectedDate: string;
}

const getContentTypeIcon = (contentType: string) => {
  if (contentType === 'photo') return <Camera className="h-8 w-8" />;
  if (contentType.includes('short')) return <Video className="h-8 w-8" />;
  if (contentType.includes('long')) return <Video className="h-8 w-8" />;
  if (contentType.includes('voice')) return <Mic className="h-8 w-8" />;
  if (contentType.includes('live')) return <Drama className="h-8 w-8" />;
  return <Folder className="h-8 w-8" />;
};

export function ContentPickerDialog({
  open,
  onClose,
  onSelect,
  availableContent,
  selectedDate
}: ContentPickerDialogProps) {
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!selectedContentId) return;

    const content = availableContent.find(c => c.id === selectedContentId);
    if (content) {
      onSelect(content);
    }
  };

  const formattedDate = selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }) : '';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Select Content to Schedule</DialogTitle>
          <DialogDescription>
            Choose which content to post on {formattedDate}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-2">
            {availableContent.map((content) => (
              <button
                key={content.id}
                type="button"
                onClick={() => setSelectedContentId(content.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedContentId === content.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {getContentTypeIcon(content.content_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="capitalize">
                        {content.content_type.replace('_', ' ')}
                      </Badge>
                      {selectedContentId === content.id && (
                        <Badge variant="default" className="text-xs">
                          Selected
                        </Badge>
                      )}
                    </div>
                    {content.caption_draft && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {content.caption_draft}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedContentId}>
            Continue to Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

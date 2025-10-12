import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Badge } from '~/components/ui/badge';

// This replicates ScheduleContentDialog structure to find the bug
export function TestScheduleFormDialog() {
  const [open, setOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('2025-10-15');
  const [platforms, setPlatforms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulate contentItem prop
  const contentItem = {
    id: 'test-id',
    content_type: 'photo',
    caption_draft: 'Test caption'
  };

  // Update scheduledDate when dialog opens (like useEffect in real component)
  useEffect(() => {
    if (open && scheduledDate) {
      console.log('useEffect: scheduledDate set to:', scheduledDate);
    }
  }, [open, scheduledDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('=== TEST FORM SUBMIT CALLED ===');
    console.log('contentItem:', contentItem);
    console.log('scheduledDate:', scheduledDate);

    e.preventDefault();

    if (!contentItem) {
      console.log('No contentItem');
      return;
    }

    if (!scheduledDate) {
      console.log('No scheduledDate');
      return;
    }

    setIsSubmitting(true);

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));

    alert('Form submitted successfully!');
    setIsSubmitting(false);
    setOpen(false);
  };

  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>Open Test Schedule Dialog</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Test Schedule Form</DialogTitle>
            <DialogDescription>
              This replicates ScheduleContentDialog structure
            </DialogDescription>
          </DialogHeader>

          {/* Conditional content display (like in real component) */}
          {contentItem && (
            <div className="mb-4 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📷</span>
                <div>
                  <Badge variant="outline" className="mb-1 capitalize">
                    {contentItem.content_type}
                  </Badge>
                  {contentItem.caption_draft && (
                    <p className="text-sm text-muted-foreground">
                      {contentItem.caption_draft}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form with exact same structure */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-scheduled-date">Scheduled Date *</Label>
              <Input
                id="test-scheduled-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-platforms">Platforms</Label>
              <Input
                id="test-platforms"
                type="text"
                placeholder="e.g., Instagram, TikTok"
                value={platforms}
                onChange={(e) => setPlatforms(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
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
    </div>
  );
}

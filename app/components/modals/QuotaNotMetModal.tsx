import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Link } from "react-router";

type QuotaRequirement = {
  content_type: string;
  required: number;
  actual: number;
  missing: number;
  met: boolean;
};

type QuotaNotMetModalProps = {
  open: boolean;
  onClose: () => void;
  requirements: QuotaRequirement[];
  projectId: string;
};

export function QuotaNotMetModal({ open, onClose, requirements, projectId }: QuotaNotMetModalProps) {
  const unmetRequirements = requirements.filter(r => !r.met);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">Content Quota Not Met</DialogTitle>
          <DialogDescription>
            This milestone requires specific content to be uploaded before completion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {unmetRequirements.map((req) => (
            <div key={req.content_type} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium capitalize">
                  {req.content_type.replace('_', ' ')}
                </span>
                <span className="text-destructive font-semibold">
                  {req.actual} / {req.required} ({req.missing} missing)
                </span>
              </div>
              <Progress value={(req.actual / req.required) * 100} className="h-2" />
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button asChild>
            <Link to={`/project/${projectId}/content`}>
              Upload Content
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

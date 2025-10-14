import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Link } from "react-router";

type TeaserRequirementModalProps = {
  open: boolean;
  onClose: () => void;
  required: number;
  actual: number;
  missing: number;
  projectId: string;
};

export function TeaserRequirementModal({ open, onClose, required, actual, missing, projectId }: TeaserRequirementModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">Teaser Requirement Not Met</DialogTitle>
          <DialogDescription>
            This milestone requires at least {required} teaser posts before completion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Teaser Posts</span>
              <span className="text-destructive font-semibold">
                {actual} / {required} ({missing} missing)
              </span>
            </div>
            <Progress value={(actual / required) * 100} className="h-2" />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Teasers help build anticipation. Post snippets, behind-the-scenes content, or countdowns to engage your audience.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button asChild>
            <Link to={`/project/${projectId}/social`}>
              Create Teasers
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";

type NotesNotAcknowledgedModalProps = {
  open: boolean;
  onClose: () => void;
  fileId: string;
  projectId: string;
};

export function NotesNotAcknowledgedModal({ open, onClose, fileId, projectId }: NotesNotAcknowledgedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-yellow-600">Master File Notes Require Acknowledgment</DialogTitle>
          <DialogDescription>
            The master audio file has unacknowledged feedback notes. You must review and acknowledge all notes before completing this milestone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Why this matters:</strong> Acknowledging notes ensures all production feedback has been reviewed before moving forward.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button asChild className="bg-yellow-600 hover:bg-yellow-700">
            <Link to={`/project/${projectId}/master`}>
              Review Notes
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

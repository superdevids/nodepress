"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Copy, Archive, Send, Download, Tags } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface BulkActionsProps {
  selectedCount: number;
  onAction: (action: string, ids?: string[]) => void;
  disabled?: boolean;
  selectedIds?: string[];
  totalCount?: number;
}

export function BulkActions({
  selectedCount,
  onAction,
  disabled,
  selectedIds,
  totalCount,
}: BulkActionsProps) {
  const { success, error: showError } = useToast();
  const [action, setAction] = React.useState("");
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState("");
  const [progress, setProgress] = React.useState(0);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const destructiveActions = ["trash", "delete"];

  const handleApply = () => {
    if (!action) return;
    if (destructiveActions.includes(action)) {
      setConfirmAction(action);
      setShowConfirm(true);
    } else {
      executeAction(action);
    }
  };

  const executeAction = async (act: string) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const isLarge = totalCount && totalCount > 100;
      if (isLarge) {
        const interval = setInterval(() => {
          setProgress((p) => {
            const next = Math.min(p + Math.random() * 15, 95);
            return next;
          });
        }, 300);
        await new Promise((r) => setTimeout(r, 1500));
        clearInterval(interval);
        setProgress(100);
        await new Promise((r) => setTimeout(r, 500));
      } else {
        await new Promise((r) => setTimeout(r, 500));
      }

      success(
        `Bulk action completed`,
        `${selectedCount} item(s) ${act === "publish" ? "published" : act === "trash" ? "trashed" : act === "delete" ? "deleted permanently" : act === "draft" ? "moved to draft" : "processed"}.`,
      );
      onAction(act, selectedIds);
      setAction("");
    } catch {
      showError("Action failed", "Please try again.");
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Select
          value={action}
          onValueChange={setAction}
          disabled={disabled || selectedCount === 0 || isProcessing}
        >
          <SelectTrigger className="w-44">
            <SelectValue
              placeholder={
                selectedCount > 0
                  ? `${selectedCount} selected`
                  : "Bulk Actions"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="publish">
              <span className="flex items-center gap-2">
                <Send className="h-3.5 w-3.5" /> Publish
              </span>
            </SelectItem>
            <SelectItem value="draft">
              <span className="flex items-center gap-2">
                <Archive className="h-3.5 w-3.5" /> Move to Draft
              </span>
            </SelectItem>
            <SelectItem value="copy">
              <span className="flex items-center gap-2">
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </span>
            </SelectItem>
            <SelectItem value="trash" className="text-destructive">
              <span className="flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5" /> Move to Trash
              </span>
            </SelectItem>
            <SelectItem value="delete" className="text-destructive">
              <span className="flex items-center gap-2">
                <Trash2 className="h-3.5 w-3.5" /> Delete Permanently
              </span>
            </SelectItem>
            <SelectItem value="assign-taxonomy">
              <span className="flex items-center gap-2">
                <Tags className="h-3.5 w-3.5" /> Assign Taxonomy
              </span>
            </SelectItem>
            <SelectItem value="export">
              <span className="flex items-center gap-2">
                <Download className="h-3.5 w-3.5" /> Export Selected
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={handleApply}
          disabled={!action || selectedCount === 0 || isProcessing}
        >
          {isProcessing ? "Processing..." : "Apply"}
        </Button>
      </div>

      {/* Progress bar for large operations */}
      {isProcessing && progress > 0 && (
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Confirmation dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "trash" ? "Move to Trash" : "Delete Permanently"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "trash"
                ? `Are you sure you want to move ${selectedCount} item(s) to trash?`
                : `Are you sure you want to permanently delete ${selectedCount} item(s)? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction === "delete" ? "destructive" : "default"}
              onClick={() => executeAction(confirmAction)}
            >
              {confirmAction === "trash" ? "Move to Trash" : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

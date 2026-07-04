'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trash2, Copy, Archive, Send, Download, Tags } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';

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
  const { post } = useApi();
  const { success, error: showError } = useToast();
  const [action, setAction] = React.useState('');
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState('');
  const [progress, setProgress] = React.useState(0);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const destructiveActions = ['trash', 'delete'];

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
    setProgress(10);

    try {
      setProgress(30);

      // Call the real backend endpoint
      const result = await post<{
        success: boolean;
        message: string;
        details: { success: number; failed: number; errors: string[] };
      }>('/api/content/bulk', { action: act, ids: selectedIds });

      setProgress(90);

      const { details } = result.data;

      if (details.failed > 0) {
        // Partial success — show warning with error details
        const summary = `${details.success} succeeded, ${details.failed} failed.`;
        showError(
          `Bulk action completed with errors`,
          `${summary}\n${details.errors.slice(0, 3).join('\n')}${details.errors.length > 3 ? `\n…and ${details.errors.length - 3} more` : ''}`,
        );
      } else {
        success(
          `Bulk action completed`,
          `${details.success} item(s) ${act === 'publish' ? 'published' : act === 'unpublish' ? 'unpublished' : act === 'trash' ? 'trashed' : act === 'delete' ? 'deleted permanently' : act === 'restore' ? 'restored' : act === 'draft' ? 'moved to draft' : 'processed'}.`,
        );
      }

      setProgress(100);

      // Signal parent to refresh
      onAction(act, selectedIds);
      setAction('');
    } catch {
      showError('Action failed', 'The bulk action could not be completed. Please try again.');
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
              placeholder={selectedCount > 0 ? `${selectedCount} selected` : 'Bulk Actions'}
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
          {isProcessing ? 'Processing...' : 'Apply'}
        </Button>
      </div>

      {/* Progress bar for large operations */}
      {isProcessing && progress > 0 && (
        <div className="bg-muted h-2 w-full rounded-full">
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
              {confirmAction === 'trash' ? 'Move to Trash' : 'Delete Permanently'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'trash'
                ? `Are you sure you want to move ${selectedCount} item(s) to trash?`
                : `Are you sure you want to permanently delete ${selectedCount} item(s)? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction === 'delete' ? 'destructive' : 'default'}
              onClick={() => executeAction(confirmAction)}
            >
              {confirmAction === 'trash' ? 'Move to Trash' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

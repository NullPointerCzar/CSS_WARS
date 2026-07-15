import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm',
            'data-[starting-style]:animate-fade-in data-[ending-style]:opacity-0',
            'transition-opacity duration-200',
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            'fixed left-1/2 top-1/2 z-[91] w-[420px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-border bg-card p-5 shadow-soft-lg',
            'data-[starting-style]:animate-scale-in data-[ending-style]:opacity-0',
            'transition-all duration-200',
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <DialogPrimitive.Title className="text-base font-semibold text-foreground">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          {description && (
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              {description}
            </DialogPrimitive.Description>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            <DialogPrimitive.Close
              render={(props) => (
                <Button variant="outline" size="sm" {...props}>
                  {cancelLabel}
                </Button>
              )}
            />
            <Button
              variant={destructive ? 'destructive' : 'default'}
              size="sm"
              onClick={onConfirm}
              disabled={loading}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

import * as React from 'react';
import { Toast } from '@base-ui/react/toast';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toast — global feedback system.
 *
 * Setup:
 *   - Wrap app with <ToastProvider>
 *   - Call useToast() anywhere to fire toasts
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast.success('Copied #FF0000');
 *   toast.error('Submission failed');
 */

type ToastVariant = 'success' | 'info' | 'warning' | 'error';

interface ToastApi {
  success: (title: string, opts?: { description?: React.ReactNode; duration?: number }) => void;
  info: (title: string, opts?: { description?: React.ReactNode; duration?: number }) => void;
  warning: (title: string, opts?: { description?: React.ReactNode; duration?: number }) => void;
  error: (title: string, opts?: { description?: React.ReactNode; duration?: number }) => void;
}

const ToastContext = React.createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return {
      success: () => {},
      info: () => {},
      warning: () => {},
      error: () => {},
    };
  }
  return ctx;
}

const variantIcon: Record<ToastVariant, React.FC<{ className?: string }>> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const variantClasses: Record<ToastVariant, { icon: string; bar: string }> = {
  success: { icon: 'text-success', bar: 'bg-success' },
  info: { icon: 'text-info', bar: 'bg-info' },
  warning: { icon: 'text-warning', bar: 'bg-warning' },
  error: { icon: 'text-destructive', bar: 'bg-destructive' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider timeout={5000} limit={5}>
      <ToastInner>{children}</ToastInner>
    </Toast.Provider>
  );
}

/**
 * Lives *inside* <Toast.Provider> so it can access the toast manager.
 * It exposes our ergonomic useToast() API and renders the viewport.
 */
function ToastInner({ children }: { children: React.ReactNode }) {
  const manager = Toast.useToastManager();

  const api = React.useMemo<ToastApi>(
    () => ({
      success: (title, opts) =>
        manager.add({
          title,
          type: 'success',
          timeout: opts?.duration ?? 2400,
          description: opts?.description,
        }),
      info: (title, opts) =>
        manager.add({
          title,
          type: 'info',
          timeout: opts?.duration ?? 3200,
          description: opts?.description,
        }),
      warning: (title, opts) =>
        manager.add({
          title,
          type: 'warning',
          timeout: opts?.duration ?? 4000,
          description: opts?.description,
        }),
      error: (title, opts) =>
        manager.add({
          title,
          type: 'error',
          timeout: opts?.duration ?? 5000,
          description: opts?.description,
        }),
    }),
    [manager],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastRenderer />
    </ToastContext.Provider>
  );
}

/**
 * Renders the active list of toasts. <Toast.Root> must be nested inside
 * <Toast.Viewport>, which is why the viewport wraps the mapped toasts here.
 */
function ToastRenderer() {
  const { toasts } = Toast.useToastManager();
  return (
    <Toast.Viewport className="fixed bottom-0 right-0 z-[100] m-4 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </Toast.Viewport>
  );
}

interface ToastItemProps {
  toast: Toast.Root.ToastObject<Record<string, unknown>>;
}

function ToastItem({ toast }: ToastItemProps) {
  const type = (toast.type as ToastVariant | undefined) ?? 'info';
  const Icon = variantIcon[type];
  const styles = variantClasses[type];

  return (
    <Toast.Root
      toast={toast}
      className={cn(
        'relative flex w-[380px] max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-md',
        'border border-border bg-card px-3.5 py-3 shadow-soft-lg',
        'data-[starting-style]:animate-slide-up data-[ending-style]:opacity-0 data-[ending-style]:translate-y-1',
        'transition-all duration-200',
      )}
    >
      <span className={cn('mt-0.5 shrink-0', styles.icon)}>
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <Toast.Title className="text-sm font-medium text-foreground">
          {toast.title}
        </Toast.Title>
        {toast.description && (
          <Toast.Description className="mt-0.5 text-xs text-muted-foreground">
            {toast.description}
          </Toast.Description>
        )}
      </div>

      <Toast.Close
        aria-label="Dismiss"
        className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-3.5 w-3.5" />
      </Toast.Close>

      <span
        className={cn('absolute left-0 top-0 h-full w-0.5', styles.bar)}
        aria-hidden
      />
    </Toast.Root>
  );
}

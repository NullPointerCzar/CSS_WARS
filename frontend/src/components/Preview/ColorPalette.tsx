import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { extractPalette, type PaletteColor } from '../../lib/colorExtraction.js';
import { useToast } from '../ui/toast.js';

interface ColorPaletteProps {
  imageUrl: string;
}

export function ColorPalette({ imageUrl }: ColorPaletteProps) {
  const [colors, setColors] = useState<PaletteColor[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    let cancelled = false;
    setColors([]);
    extractPalette(imageUrl)
      .then((result) => {
        if (!cancelled) setColors(result);
      })
      .catch(() => {
        if (!cancelled) setColors([]);
      });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  const handleCopy = (hex: string) => {
    // Normalize to uppercase HEX for a consistent clipboard value.
    const normalized = hex.toUpperCase();
    const write = navigator.clipboard?.writeText(normalized);
    if (write) {
      write
        .then(() => {
          setCopied(normalized);
          toastSuccess(`Copied ${normalized}`);
          window.setTimeout(
            () => setCopied((c) => (c === normalized ? null : c)),
            1200,
          );
        })
        .catch(() => toastError('Could not copy color'));
    } else {
      setCopied(normalized);
      toastSuccess(`Copied ${normalized}`);
    }
  };

  if (colors.length === 0) {
    return <div className="flex-1 min-h-0" />;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {colors.map((c) => {
          const isCopied = copied === c.hex;
          return (
            <button
              key={c.hex}
              type="button"
              onClick={() => handleCopy(c.hex)}
              title={`${c.hex} · ${(c.ratio * 100).toFixed(1)}% (click to copy)`}
              className="group flex flex-col items-center gap-0.5 rounded-md p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors hover:bg-surface-3"
            >
              <span className="relative w-full aspect-square rounded-md border border-border shadow-soft-sm overflow-hidden">
                <span
                  className="absolute inset-0"
                  style={{ backgroundColor: c.hex }}
                />
                {isCopied && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="text-[8px] leading-tight font-mono text-muted-foreground group-hover:text-foreground tabular-nums">
                {isCopied ? 'Copied' : c.hex.replace('#', '')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

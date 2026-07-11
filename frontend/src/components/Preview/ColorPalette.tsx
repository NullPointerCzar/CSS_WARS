import { useEffect, useState } from 'react';
import { extractPalette, type PaletteColor } from '../../lib/colorExtraction.js';

interface ColorPaletteProps {
  imageUrl: string;
}

export function ColorPalette({ imageUrl }: ColorPaletteProps) {
  const [colors, setColors] = useState<PaletteColor[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

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
    navigator.clipboard?.writeText(hex).then(
      () => {
        setCopied(hex);
        setTimeout(() => setCopied((c) => (c === hex ? null : c)), 1000);
      },
      () => {},
    );
  };

  if (colors.length === 0) {
    return <div className="flex-1 min-h-0" />;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {colors.map((c) => (
          <button
            key={c.hex}
            type="button"
            onClick={() => handleCopy(c.hex)}
            title={`${c.hex} · ${(c.ratio * 100).toFixed(1)}% (click to copy)`}
            className="group flex flex-col items-center gap-0.5 focus:outline-none"
          >
            <span
              className="w-full aspect-square rounded-md border border-slate-700/60 shadow-sm"
              style={{ backgroundColor: c.hex }}
            />
            <span className="text-[8px] leading-tight font-mono text-slate-400 group-hover:text-slate-200">
              {copied === c.hex ? 'copied' : c.hex.replace('#', '')}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

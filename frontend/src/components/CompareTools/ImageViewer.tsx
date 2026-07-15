import { useState, useRef, useCallback, useEffect, type WheelEvent, type MouseEvent } from 'react';

interface ImageViewerProps {
  src: string;
  alt: string;
  background?: 'white' | 'black' | 'checkerboard';
  showGrid?: boolean;
  className?: string;
  onLoad?: () => void;
}

export function ImageViewer({
  src,
  alt,
  background = 'white',
  showGrid = false,
  className = '',
  onLoad,
}: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const backgroundClasses: Record<string, string> = {
    white: 'bg-white',
    black: 'bg-black',
    checkerboard:
      "bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22%3E%3Crect width=%2210%22 height=%2210%22 fill=%22%23ccc%22/%3E%3Crect x=%2210%22 y=%2210%22 width=%2210%22 height=%2210%22 fill=%22%23ccc%22/%3E%3Crect x=%2210%22 width=%2210%22 height=%2210%22 fill=%22%23fff%22/%3E%3Crect y=%2210%22 width=%2210%22 height=%2210%22 fill=%22%23fff%22/%3E%3C/svg%3E')]",
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.max(0.1, Math.min(20, s + delta)));
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = translate;
  }, [translate]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning) return;
    setTranslate({
      x: translateStart.current.x + (e.clientX - panStart.current.x),
      y: translateStart.current.y + (e.clientY - panStart.current.y),
    });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsPanning(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${backgroundClasses[background]} ${className}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
    >
      {/* Pixel grid overlay */}
      {showGrid && scale >= 4 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(0,0,0,0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0,0,0,0.12) 1px, transparent 1px)
            `,
            backgroundSize: `${scale}px ${scale}px`,
            backgroundPosition: `${translate.x % scale}px ${translate.y % scale}px`,
          }}
        />
      )}
      {/* Image */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-w-none max-h-none"
          style={{
            imageRendering: 'pixelated',
            boxShadow:
              background === 'white' || background === 'checkerboard'
                ? '0 0 0 1px rgba(0,0,0,0.08)'
                : 'none',
          }}
          onLoad={() => {
            onLoad?.();
          }}
        />
      </div>
      {/* Zoom indicator */}
      <div className="absolute bottom-2 right-2 bg-surface-2 backdrop-blur-sm text-xs text-muted-foreground px-2 py-1 rounded-md font-mono select-none">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}

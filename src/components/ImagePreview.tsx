import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { startDrag } from '@crabnebula/tauri-plugin-drag';

function useImageSrc(filePath: string | null): { src: string | null; error: string | null } {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setSrc(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setSrc(null);
    setError(null);

    invoke<string>('read_file_base64', { path: filePath })
      .then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });

    return () => { cancelled = true; };
  }, [filePath]);

  return { src, error };
}

interface ImagePreviewProps {
  originalPath: string;
  optimizedPath: string | null;
  originalSize: number;
  optimizedSize: number | null;
  originalWidth: number;
  originalHeight: number;
  optimizedWidth: number | null;
  optimizedHeight: number | null;
  filename: string;
}

export function ImagePreview({
  originalPath, optimizedPath, originalSize, optimizedSize,
  originalWidth, originalHeight, optimizedWidth, optimizedHeight,
  filename
}: ImagePreviewProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  const isSvg = originalPath.toLowerCase().endsWith('.svg');
  const displayPath = showOriginal || !optimizedPath ? originalPath : optimizedPath;
  const displaySize = showOriginal || !optimizedSize ? originalSize : optimizedSize;
  const isOriginal = showOriginal || !optimizedPath;
  const label = isOriginal ? 'Original' : 'Optimized';
  const { src: imageSrc, error } = useImageSrc(displayPath);

  const displayWidth = isOriginal ? originalWidth : (optimizedWidth ?? originalWidth);
  const displayHeight = isOriginal ? originalHeight : (optimizedHeight ?? originalHeight);

  const savings = optimizedSize != null
    ? Math.round((1 - optimizedSize / originalSize) * 100)
    : null;

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    const dragPath = optimizedPath || originalPath;
    startDrag({ item: [dragPath], icon: dragPath });
  };

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="relative cursor-pointer rounded-lg overflow-hidden"
        onClick={() => optimizedPath && setShowOriginal(!showOriginal)}
        draggable
        onDragStart={handleDragStart}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={filename}
            className={`max-w-full max-h-[60vh] object-contain ${isSvg ? 'min-w-[300px] min-h-[200px] bg-white/5 p-4' : ''}`}
            draggable={false}
          />
        ) : (
          <div className="w-64 h-48 flex items-center justify-center bg-gray-800 text-gray-500 text-sm">
            {error || 'Loading...'}
          </div>
        )}
        <div className={`absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded text-sm ${
          isOriginal ? 'text-white' : 'text-green-400'
        }`}>
          {label} &middot; {formatBytes(displaySize)} &middot; {displayWidth}&times;{displayHeight}
          {savings != null && !isOriginal && (
            <span className="ml-2">-{savings}%</span>
          )}
        </div>
        {optimizedPath && (
          <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-gray-300">
            Click to toggle
          </div>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-400 truncate max-w-full">{filename}</p>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

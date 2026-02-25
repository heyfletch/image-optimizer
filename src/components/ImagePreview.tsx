import { useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

interface ImagePreviewProps {
  originalPath: string;
  optimizedPath: string | null;
  originalSize: number;
  optimizedSize: number | null;
  filename: string;
}

export function ImagePreview({
  originalPath, optimizedPath, originalSize, optimizedSize, filename
}: ImagePreviewProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  const displayPath = showOriginal || !optimizedPath ? originalPath : optimizedPath;
  const displaySize = showOriginal || !optimizedSize ? originalSize : optimizedSize;
  const label = showOriginal || !optimizedPath ? 'Original' : 'Optimized';

  const savings = optimizedSize != null
    ? Math.round((1 - optimizedSize / originalSize) * 100)
    : null;

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="relative cursor-pointer rounded-lg overflow-hidden"
        onClick={() => optimizedPath && setShowOriginal(!showOriginal)}
      >
        <img
          src={convertFileSrc(displayPath)}
          alt={filename}
          className="max-w-full max-h-[60vh] object-contain"
        />
        <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded text-sm">
          {label} &middot; {formatBytes(displaySize)}
          {savings != null && !showOriginal && (
            <span className="ml-2 text-green-400">-{savings}%</span>
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

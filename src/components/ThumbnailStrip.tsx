import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { startDrag } from '@crabnebula/tauri-plugin-drag';

type OptimizationStatus = 'pending' | 'processing' | 'done';

interface ThumbnailStripProps {
  images: Array<{
    path: string;
    filename: string;
    format: string;
    status: OptimizationStatus;
    optimizedPath: string | null;
  }>;
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function Thumbnail({ path, format }: { path: string; format: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (format === 'svg') return;
    let cancelled = false;
    invoke<string>('read_file_base64', { path })
      .then((dataUrl) => { if (!cancelled) setSrc(dataUrl); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [path, format]);

  if (format === 'svg') {
    return (
      <div className="w-full h-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-400">
        SVG
      </div>
    );
  }

  if (!src) return <div className="w-full h-full bg-gray-700" />;
  return <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />;
}

export function ThumbnailStrip({ images, selectedIndex, onSelect }: ThumbnailStripProps) {
  if (images.length <= 1) return null;

  const handleDragStart = (e: React.DragEvent, img: ThumbnailStripProps['images'][number]) => {
    e.preventDefault();
    const dragPath = img.optimizedPath || img.path;
    startDrag({ item: [dragPath], icon: dragPath });
  };

  return (
    <div className="flex gap-2 px-4 py-2 bg-gray-800 border-t border-gray-700 overflow-x-auto">
      {images.map((img, i) => (
        <button
          key={img.path}
          onClick={() => onSelect(i)}
          draggable
          onDragStart={(e) => handleDragStart(e, img)}
          className={`relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
            i === selectedIndex
              ? 'border-blue-500'
              : 'border-transparent hover:border-gray-500'
          }`}
        >
          <Thumbnail path={img.path} format={img.format} />
          <div className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full ${
            img.status === 'done' ? 'bg-green-500' :
            img.status === 'processing' ? 'bg-yellow-500 animate-pulse' :
            'bg-gray-500'
          }`} />
        </button>
      ))}
    </div>
  );
}

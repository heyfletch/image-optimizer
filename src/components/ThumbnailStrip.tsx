import { convertFileSrc } from '@tauri-apps/api/core';

type OptimizationStatus = 'pending' | 'processing' | 'done';

interface ThumbnailStripProps {
  images: Array<{
    path: string;
    filename: string;
    format: string;
    status: OptimizationStatus;
  }>;
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function ThumbnailStrip({ images, selectedIndex, onSelect }: ThumbnailStripProps) {
  if (images.length <= 1) return null;

  return (
    <div className="flex gap-2 px-4 py-2 bg-gray-800 border-t border-gray-700 overflow-x-auto">
      {images.map((img, i) => {
        const isSvg = img.format === 'svg';

        return (
          <button
            key={img.path}
            onClick={() => onSelect(i)}
            className={`relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
              i === selectedIndex
                ? 'border-blue-500'
                : 'border-transparent hover:border-gray-500'
            }`}
          >
            {isSvg ? (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-400">
                SVG
              </div>
            ) : (
              <img
                src={convertFileSrc(img.path)}
                alt={img.filename}
                className="w-full h-full object-cover"
              />
            )}
            {/* Status indicator */}
            <div className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full ${
              img.status === 'done' ? 'bg-green-500' :
              img.status === 'processing' ? 'bg-yellow-500 animate-pulse' :
              'bg-gray-500'
            }`} />
          </button>
        );
      })}
    </div>
  );
}

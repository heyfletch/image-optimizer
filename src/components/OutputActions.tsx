import { useCallback } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { copyFile, rename } from '@tauri-apps/plugin-fs';
import { startDrag } from '@crabnebula/tauri-plugin-drag';

interface OutputActionsProps {
  optimizedPath: string;
  originalPath: string;
  filename: string;
}

export function OutputActions({ optimizedPath, originalPath, filename }: OutputActionsProps) {
  const handleSaveTo = useCallback(async () => {
    const ext = optimizedPath.split('.').pop() || '';
    const dest = await save({
      defaultPath: filename.replace(/\.[^.]+$/, `-optimized.${ext}`),
      filters: [{ name: 'Images', extensions: [ext] }],
    });
    if (dest) {
      await copyFile(optimizedPath, dest);
    }
  }, [optimizedPath, filename]);

  const handleReplace = useCallback(async () => {
    // Move original to .bak, copy optimized to original path
    const bakPath = originalPath + '.bak';
    await rename(originalPath, bakPath);
    await copyFile(optimizedPath, originalPath);
  }, [optimizedPath, originalPath]);

  const handleDragOut = useCallback(async () => {
    await startDrag({ item: [optimizedPath], icon: optimizedPath });
  }, [optimizedPath]);

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      <button
        onClick={handleSaveTo}
        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
      >
        Save to...
      </button>
      <button
        onClick={handleReplace}
        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
      >
        Replace original
      </button>
      <div
        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-md transition-colors cursor-grab active:cursor-grabbing"
        onMouseDown={handleDragOut}
      >
        Drag to export
      </div>
    </div>
  );
}

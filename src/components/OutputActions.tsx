import { useCallback } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { copyFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { startDrag } from '@crabnebula/tauri-plugin-drag';

interface OutputActionsProps {
  optimizedPath: string;
  originalPath: string;
  filename: string;
  allOptimizedPaths: string[];
  onTrashComplete?: () => void;
}

export function OutputActions({ optimizedPath, originalPath, filename, allOptimizedPaths, onTrashComplete }: OutputActionsProps) {
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

  const handleTrashOriginal = useCallback(async () => {
    try {
      await invoke('move_to_trash', { path: originalPath });
      onTrashComplete?.();
    } catch (err) {
      console.error('Failed to trash original:', err);
    }
  }, [originalPath, onTrashComplete]);

  const handleDragAll = useCallback(async () => {
    if (allOptimizedPaths.length > 0) {
      await startDrag({ item: allOptimizedPaths, icon: allOptimizedPaths[0] });
    }
  }, [allOptimizedPaths]);

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      <button
        onClick={handleSaveTo}
        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
      >
        Save to...
      </button>
      <button
        onClick={handleTrashOriginal}
        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-md transition-colors text-red-400"
      >
        Trash original
      </button>
      {allOptimizedPaths.length > 1 && (
        <div
          className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-md transition-colors cursor-grab active:cursor-grabbing"
          onMouseDown={handleDragAll}
        >
          Drag all
        </div>
      )}
    </div>
  );
}

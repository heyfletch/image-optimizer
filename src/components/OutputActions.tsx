import { useCallback } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { copyFile, rename } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { startDrag } from '@crabnebula/tauri-plugin-drag';

interface OutputActionsProps {
  optimizedPath: string;
  originalPath: string;
  filename: string;
  allOptimizedPaths: string[];
}

export function OutputActions({ optimizedPath, originalPath, filename, allOptimizedPaths }: OutputActionsProps) {
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
    // Create backup with .bak.{ext} name, move to trash, then copy optimized to original path
    const ext = originalPath.split('.').pop() || '';
    const dir = originalPath.substring(0, originalPath.lastIndexOf('/'));
    const basename = originalPath.substring(originalPath.lastIndexOf('/') + 1);
    const nameNoExt = basename.substring(0, basename.lastIndexOf('.'));
    const bakPath = `${dir}/${nameNoExt}.bak.${ext}`;

    // Rename original to .bak.ext, then trash it
    await rename(originalPath, bakPath);
    await invoke('move_to_trash', { path: bakPath });
    // Copy optimized to original path
    await copyFile(optimizedPath, originalPath);
  }, [optimizedPath, originalPath]);

  const handleTrashOriginal = useCallback(async () => {
    await invoke('move_to_trash', { path: originalPath });
  }, [originalPath]);

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
        onClick={handleReplace}
        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
      >
        Replace original
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

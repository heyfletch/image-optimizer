import { useState, useEffect } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';

interface DragDropState {
  isDragging: boolean;
  droppedFiles: string[];
}

export function useDragDrop() {
  const [state, setState] = useState<DragDropState>({
    isDragging: false,
    droppedFiles: [],
  });

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === 'enter') {
        setState(prev => ({ ...prev, isDragging: true }));
      } else if (event.payload.type === 'leave') {
        setState(prev => ({ ...prev, isDragging: false }));
      } else if (event.payload.type === 'drop') {
        setState({ isDragging: false, droppedFiles: event.payload.paths });
      }
    }).then(fn => { unlisten = fn; });

    return () => { unlisten?.(); };
  }, []);

  return state;
}

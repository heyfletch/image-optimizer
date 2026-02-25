import { useEffect, useState, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { startSidecar, sendRequest } from "./lib/ipc";
import { useDragDrop } from "./hooks/useDragDrop";
import { useImageProcessor } from "./hooks/useImageProcessor";
import { DropZone } from "./components/DropZone";
import { ImagePreview } from "./components/ImagePreview";
import { SettingsPanel } from "./components/SettingsPanel";
import type { OptimizeSettings } from "../sidecar/src/types";

interface ImageState {
  path: string;
  filename: string;
  size: number;
  width: number;
  height: number;
  format: string;
  optimizedPath: string | null;
  optimizedSize: number | null;
}

const defaultSettings: OptimizeSettings = {
  format: "same",
  quality: 92,
  width: null,
  height: null,
  maintainAspectRatio: true,
  maxFileSize: null,
  svgMode: null,
};

function App() {
  const [sidecarReady, setSidecarReady] = useState(false);
  const [image, setImage] = useState<ImageState | null>(null);
  const [settings, setSettings] = useState<OptimizeSettings>(defaultSettings);
  const { isDragging, droppedFiles } = useDragDrop();
  const { processingState, getInfo, optimize } = useImageProcessor();

  useEffect(() => {
    startSidecar()
      .then(() => sendRequest({ action: "ping", inputPath: "", outputPath: "", settings: defaultSettings }))
      .then((response) => {
        if (response.success) setSidecarReady(true);
      })
      .catch((err) => console.error("Sidecar failed:", err));
  }, []);

  const loadImage = useCallback(async (filePath: string) => {
    const info = await getInfo(filePath);
    if (info) {
      setImage({
        ...info,
        optimizedPath: null,
        optimizedSize: null,
      });
    }
  }, [getInfo]);

  useEffect(() => {
    if (droppedFiles.length > 0) {
      loadImage(droppedFiles[0]);
    }
  }, [droppedFiles, loadImage]);

  const handleBrowse = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "avif", "heic", "heif", "svg"] },
      ],
    });
    if (selected) {
      loadImage(selected);
    }
  }, [loadImage]);

  const handleOptimize = useCallback(async () => {
    if (!image) return;

    const ext = settings.format === "same" ? image.path.split(".").pop() : settings.format;
    const outputPath = image.path.replace(/\.[^.]+$/, `-optimized.${ext}`);

    const result = await optimize(image.path, outputPath, settings);
    if (result) {
      setImage((prev) =>
        prev ? { ...prev, optimizedPath: result.optimizedPath, optimizedSize: result.optimizedSize } : prev
      );
    }
  }, [image, settings, optimize]);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white select-none">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 text-xs text-gray-400">
        <span>Image Optimizer</span>
        <span>{sidecarReady ? "Ready" : "Connecting..."}</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Drop zone / Preview */}
        <div className="flex-1 flex flex-col p-4 min-w-0">
          <DropZone isDragging={isDragging} hasImage={!!image} onBrowse={handleBrowse}>
            {image && (
              <ImagePreview
                originalPath={image.path}
                optimizedPath={image.optimizedPath}
                originalSize={image.size}
                optimizedSize={image.optimizedSize}
                filename={image.filename}
              />
            )}
          </DropZone>
        </div>

        {/* Right: Settings panel */}
        <div className="w-72 border-l border-gray-700 bg-gray-800 overflow-y-auto">
          <SettingsPanel
            settings={settings}
            onSettingsChange={setSettings}
            imageFormat={image?.format || null}
            imageWidth={image?.width || null}
            imageHeight={image?.height || null}
            onOptimize={handleOptimize}
            processing={processingState === 'processing'}
            hasImage={!!image}
          />
        </div>
      </div>
    </div>
  );
}

export default App;

import { useEffect, useState, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { startSidecar, sendRequest } from "./lib/ipc";
import { useDragDrop } from "./hooks/useDragDrop";
import { useImageProcessor } from "./hooks/useImageProcessor";
import { useSettings } from "./hooks/useSettings";
import { DropZone } from "./components/DropZone";
import { ImagePreview } from "./components/ImagePreview";
import { SettingsPanel } from "./components/SettingsPanel";
import { OutputActions } from "./components/OutputActions";
import { ThumbnailStrip } from "./components/ThumbnailStrip";

interface ImageState {
  path: string;
  filename: string;
  size: number;
  width: number;
  height: number;
  format: string;
  optimizedPath: string | null;
  optimizedSize: number | null;
  optimizedWidth: number | null;
  optimizedHeight: number | null;
  optimizedFormat: string | null;
  status: 'pending' | 'processing' | 'done';
}

const defaultSettings = {
  format: "same" as const,
  quality: 92,
  width: null,
  height: null,
  maintainAspectRatio: true,
  maxFileSize: null,
  svgMode: null,
  svgResponsive: false,
};

function App() {
  const [sidecarReady, setSidecarReady] = useState(false);
  const [images, setImages] = useState<ImageState[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { settings, setSettings } = useSettings();
  const [batchProcessing, setBatchProcessing] = useState(false);
  const { isDragging, droppedFiles } = useDragDrop();
  const { processingState, getInfo, optimize } = useImageProcessor();

  const selectedImage = images[selectedIndex] || null;

  // Auto-switch format when image type changes
  useEffect(() => {
    if (!selectedImage) return;
    if (selectedImage.format === 'svg' && settings.format !== 'svg') {
      setSettings({ ...settings, format: 'svg', svgMode: settings.svgMode || 'standard' });
    } else if (selectedImage.format !== 'svg' && settings.format === 'svg') {
      setSettings({ ...settings, format: 'same' });
    }
  }, [selectedImage?.format]);

  useEffect(() => {
    startSidecar()
      .then(() => sendRequest({ action: "ping", inputPath: "", outputPath: "", settings: defaultSettings }))
      .then((response) => {
        if (response.success) setSidecarReady(true);
      })
      .catch((err) => console.error("Sidecar failed:", err));
  }, []);

  const loadImages = useCallback(async (filePaths: string[]) => {
    const newImages: ImageState[] = [];
    for (const filePath of filePaths) {
      const info = await getInfo(filePath);
      if (info) {
        newImages.push({
          ...info,
          optimizedPath: null,
          optimizedSize: null,
          optimizedWidth: null,
          optimizedHeight: null,
          optimizedFormat: null,
          status: 'pending',
        });
      }
    }
    setImages(newImages);
    setSelectedIndex(0);
  }, [getInfo]);

  useEffect(() => {
    if (droppedFiles.length > 0) {
      loadImages(droppedFiles);
    }
  }, [droppedFiles, loadImages]);

  const handleBrowse = useCallback(async () => {
    const selected = await open({
      multiple: true,
      filters: [
        { name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "avif", "heic", "heif", "svg"] },
      ],
    });
    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected];
      loadImages(paths);
    }
  }, [loadImages]);

  const optimizeImage = useCallback(async (index: number) => {
    const img = images[index];
    if (!img) return;

    const ext = settings.format === "same" ? img.path.split(".").pop() : settings.format;
    const outputPath = img.path.replace(/\.[^.]+$/, `-optimized.${ext}`);

    setImages(prev => prev.map((im, i) => i === index ? { ...im, status: 'processing' } : im));

    const result = await optimize(img.path, outputPath, settings);

    if (result) {
      setImages(prev => prev.map((im, i) =>
        i === index ? {
          ...im,
          optimizedPath: result.optimizedPath,
          optimizedSize: result.optimizedSize,
          optimizedWidth: result.optimizedWidth,
          optimizedHeight: result.optimizedHeight,
          optimizedFormat: result.optimizedFormat,
          status: 'done',
        } : im
      ));
    } else {
      setImages(prev => prev.map((im, i) => i === index ? { ...im, status: 'pending' } : im));
    }
  }, [images, settings, optimize]);

  const handleOptimize = useCallback(async () => {
    if (images.length === 0) return;

    if (images.length === 1) {
      await optimizeImage(0);
    } else {
      setBatchProcessing(true);
      for (let i = 0; i < images.length; i++) {
        await optimizeImage(i);
      }
      setBatchProcessing(false);
    }
  }, [images, optimizeImage]);

  const isProcessing = processingState === 'processing' || batchProcessing;

  const handleTrashComplete = useCallback((index: number) => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next;
    });
    setSelectedIndex(prev => {
      const remaining = images.length - 1;
      if (remaining <= 0) return 0;
      if (prev >= remaining) return remaining - 1;
      return prev;
    });
  }, [images.length]);

  const allOptimizedPaths = images
    .filter(img => img.optimizedPath)
    .map(img => img.optimizedPath!);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white select-none">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 text-xs text-gray-400">
        <span>Image Optimizer</span>
        <span>
          {!sidecarReady ? "Connecting..." :
           images.length > 0 ? `${images.length} image${images.length > 1 ? 's' : ''}` :
           "Ready"}
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Drop zone / Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex flex-col p-4">
            <DropZone isDragging={isDragging} hasImage={!!selectedImage} onBrowse={handleBrowse}>
              {selectedImage && (
                <div className="flex flex-col items-center">
                  <ImagePreview
                    originalPath={selectedImage.path}
                    optimizedPath={selectedImage.optimizedPath}
                    originalSize={selectedImage.size}
                    optimizedSize={selectedImage.optimizedSize}
                    originalWidth={selectedImage.width}
                    originalHeight={selectedImage.height}
                    optimizedWidth={selectedImage.optimizedWidth}
                    optimizedHeight={selectedImage.optimizedHeight}
                    optimizedFormat={selectedImage.optimizedFormat}
                    filename={selectedImage.filename}
                  />
                  {selectedImage.optimizedPath && (
                    <OutputActions
                      optimizedPath={selectedImage.optimizedPath}
                      originalPath={selectedImage.path}
                      filename={selectedImage.filename}
                      allOptimizedPaths={allOptimizedPaths}
                      onTrashComplete={() => handleTrashComplete(selectedIndex)}
                    />
                  )}
                </div>
              )}
            </DropZone>
          </div>

          {/* Thumbnail strip */}
          <ThumbnailStrip
            images={images}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
          />
        </div>

        {/* Right: Settings panel */}
        <div className="w-72 border-l border-gray-700 bg-gray-800 overflow-y-auto">
          <SettingsPanel
            settings={settings}
            onSettingsChange={setSettings}
            imageFormat={selectedImage?.format || null}
            imageWidth={selectedImage?.width || null}
            onOptimize={handleOptimize}
            processing={isProcessing}
            hasImage={images.length > 0}
          />
        </div>
      </div>
    </div>
  );
}

export default App;

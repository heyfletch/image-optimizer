interface DimensionControlsProps {
  width: number | null;
  height: number | null;
  maintainAspectRatio: boolean;
  imageWidth: number | null;
  imageHeight: number | null;
  onWidthChange: (width: number | null) => void;
  onHeightChange: (height: number | null) => void;
  onAspectRatioChange: (locked: boolean) => void;
}

const PRESETS = [2400, 1200, 512];

export function DimensionControls({
  width,
  maintainAspectRatio,
  imageWidth,
  imageHeight,
  onWidthChange,
  onHeightChange,
  onAspectRatioChange,
}: DimensionControlsProps) {
  const aspectRatio = imageWidth && imageHeight ? imageHeight / imageWidth : 1;

  const handleWidthChange = (w: number | null) => {
    onWidthChange(w);
    if (maintainAspectRatio && w != null) {
      onHeightChange(Math.round(w * aspectRatio));
    }
  };

  const calculatedHeight = width != null && maintainAspectRatio
    ? Math.round(width * aspectRatio)
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-gray-400">Dimensions</label>
        <button
          onClick={() => onAspectRatioChange(!maintainAspectRatio)}
          className={`text-xs px-2 py-0.5 rounded transition-colors ${
            maintainAspectRatio
              ? 'bg-blue-600/30 text-blue-400'
              : 'bg-gray-700 text-gray-500'
          }`}
          title={maintainAspectRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
        >
          {maintainAspectRatio ? 'Locked' : 'Unlocked'}
        </button>
      </div>

      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <label className="block text-[10px] text-gray-500 mb-1">Width</label>
          <input
            type="number"
            min={1}
            value={width ?? ''}
            placeholder={imageWidth?.toString() ?? 'auto'}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : null;
              handleWidthChange(v);
            }}
            className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5 border border-gray-600"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] text-gray-500 mb-1">Height</label>
          <input
            type="number"
            value={calculatedHeight ?? ''}
            placeholder={imageHeight?.toString() ?? 'auto'}
            disabled={maintainAspectRatio}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : null;
              onHeightChange(v);
            }}
            className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5 border border-gray-600 disabled:opacity-40"
          />
        </div>
      </div>

      <div className="flex gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => handleWidthChange(preset)}
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              width === preset
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {preset}
          </button>
        ))}
        <button
          onClick={() => { onWidthChange(null); onHeightChange(null); }}
          className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
            width == null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          Original
        </button>
      </div>
    </div>
  );
}

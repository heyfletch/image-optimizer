interface DimensionControlsProps {
  width: number | null;
  imageWidth: number | null;
  onWidthChange: (width: number | null) => void;
}

const PRESETS = [2400, 1200, 512];

export function DimensionControls({
  width,
  imageWidth,
  onWidthChange,
}: DimensionControlsProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-2">Resize Width</label>

      <div className="mb-2">
        <input
          type="number"
          min={1}
          value={width ?? ''}
          placeholder={imageWidth?.toString() ?? 'Original'}
          onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : null;
            onWidthChange(v);
          }}
          className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5 border border-gray-600"
        />
      </div>

      <div className="flex gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => onWidthChange(preset)}
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
          onClick={() => onWidthChange(null)}
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

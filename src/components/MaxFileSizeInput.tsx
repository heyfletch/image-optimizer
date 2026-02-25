interface MaxFileSizeInputProps {
  value: number | null;
  onChange: (maxBytes: number | null) => void;
}

export function MaxFileSizeInput({ value, onChange }: MaxFileSizeInputProps) {
  const enabled = value != null;
  const kbValue = value != null ? Math.round(value / 1024) : '';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-gray-400">Max File Size</label>
        <button
          onClick={() => onChange(enabled ? null : 200 * 1024)}
          className={`text-xs px-2 py-0.5 rounded transition-colors ${
            enabled
              ? 'bg-blue-600/30 text-blue-400'
              : 'bg-gray-700 text-gray-500'
          }`}
        >
          {enabled ? 'On' : 'Off'}
        </button>
      </div>
      {enabled && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={kbValue}
            onChange={(e) => {
              const kb = Number(e.target.value);
              if (kb > 0) onChange(kb * 1024);
            }}
            className="w-20 bg-gray-700 text-white text-xs rounded px-2 py-1.5 border border-gray-600"
          />
          <span className="text-xs text-gray-500">KB</span>
        </div>
      )}
    </div>
  );
}

const FORMATS = [
  { value: 'same', label: 'Same' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'svg', label: 'SVG' },
] as const;

interface FormatSelectorProps {
  value: string;
  onChange: (format: string) => void;
  inputFormat: string | null;
}

export function FormatSelector({ value, onChange, inputFormat }: FormatSelectorProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-2">Format</label>
      <div className="flex flex-wrap gap-1">
        {FORMATS.map(({ value: fmt, label }) => {
          // Only show SVG option if input is SVG
          if (fmt === 'svg' && inputFormat !== 'svg') return null;

          return (
            <button
              key={fmt}
              onClick={() => onChange(fmt)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                value === fmt
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

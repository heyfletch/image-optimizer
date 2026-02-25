const FORMATS = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
  { value: 'avif', label: 'AVIF' },
  { value: 'same', label: 'Resize only' },
  { value: 'svg', label: 'SVG' },
] as const;

interface FormatSelectorProps {
  value: string;
  onChange: (format: string) => void;
  inputFormat: string | null;
}

export function FormatSelector({ value, onChange, inputFormat }: FormatSelectorProps) {
  const isSvgInput = inputFormat === 'svg';

  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-2">Convert to</label>
      <div className="flex flex-wrap gap-1">
        {FORMATS.map(({ value: fmt, label }) => {
          // SVG input: hide JPEG and Resize only
          if (isSvgInput && (fmt === 'jpeg' || fmt === 'same')) return null;
          // Non-SVG input: hide SVG option
          if (!isSvgInput && fmt === 'svg') return null;

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

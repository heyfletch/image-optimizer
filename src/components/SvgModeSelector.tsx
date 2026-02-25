const SVG_MODES = [
  { value: 'standard', label: 'Standard', desc: 'Common SVG optimizations' },
  { value: 'safe', label: 'Safe', desc: 'Preserves classes, IDs, attributes' },
] as const;

interface SvgModeSelectorProps {
  value: string | null;
  onChange: (mode: string) => void;
}

export function SvgModeSelector({ value, onChange }: SvgModeSelectorProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-2">SVG Optimization Level</label>
      <div className="space-y-1">
        {SVG_MODES.map(({ value: mode, label, desc }) => (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
              value === mode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span className="font-medium">{label}</span>
            <span className="ml-2 text-gray-400">{desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

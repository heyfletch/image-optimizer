interface QualitySliderProps {
  value: number;
  onChange: (quality: number) => void;
  disabled?: boolean;
}

export function QualitySlider({ value, onChange, disabled }: QualitySliderProps) {
  return (
    <div className={disabled ? 'opacity-40 pointer-events-none' : ''}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-gray-400">Quality</label>
        <input
          type="number"
          min={1}
          max={100}
          value={value}
          onChange={(e) => onChange(Math.min(100, Math.max(1, Number(e.target.value))))}
          className="w-12 bg-gray-700 text-white text-xs text-center rounded px-1 py-0.5 border border-gray-600"
        />
      </div>
      <input
        type="range"
        min={1}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
    </div>
  );
}

import { FormatSelector } from './FormatSelector';
import { QualitySlider } from './QualitySlider';
import { DimensionControls } from './DimensionControls';
import { MaxFileSizeInput } from './MaxFileSizeInput';
import { SvgModeSelector } from './SvgModeSelector';
import type { OptimizeSettings } from '../../sidecar/src/types';

interface SettingsPanelProps {
  settings: OptimizeSettings;
  onSettingsChange: (settings: OptimizeSettings) => void;
  imageFormat: string | null;
  imageWidth: number | null;
  onOptimize: () => void;
  processing: boolean;
  hasImage: boolean;
}

export function SettingsPanel({
  settings,
  onSettingsChange,
  imageFormat,
  imageWidth,
  onOptimize,
  processing,
  hasImage,
}: SettingsPanelProps) {
  const update = (partial: Partial<OptimizeSettings>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  const isSvg = imageFormat === 'svg' || settings.format === 'svg';
  const isPng = settings.format === 'png' || (settings.format === 'same' && imageFormat === 'png');
  const qualityDisabled = isPng || isSvg;

  return (
    <div className="p-4 space-y-5">
      <FormatSelector
        value={settings.format}
        onChange={(format) => update({ format: format as OptimizeSettings['format'] })}
        inputFormat={imageFormat}
      />

      <QualitySlider
        value={settings.quality}
        onChange={(quality) => update({ quality })}
        disabled={qualityDisabled}
      />

      {!isSvg && (
        <DimensionControls
          width={settings.width}
          imageWidth={imageWidth}
          onWidthChange={(width) => update({ width, height: null, maintainAspectRatio: true })}
        />
      )}

      {!isPng && !isSvg && (
        <MaxFileSizeInput
          value={settings.maxFileSize}
          onChange={(maxFileSize) => update({ maxFileSize })}
        />
      )}

      {isSvg && (
        <SvgModeSelector
          value={settings.svgMode}
          onChange={(svgMode) => update({ svgMode: svgMode as OptimizeSettings['svgMode'] })}
        />
      )}

      <button
        onClick={onOptimize}
        disabled={!hasImage || processing}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
          !hasImage || processing
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-500 text-white'
        }`}
      >
        {processing ? 'Optimizing...' : 'Optimize'}
      </button>
    </div>
  );
}

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

  const isSvgInput = imageFormat === 'svg';
  const isSvgOutput = settings.format === 'svg';
  const isPng = settings.format === 'png' || (settings.format === 'same' && imageFormat === 'png');
  const showQuality = !isSvgInput;
  const showDimensions = !isSvgOutput || isSvgInput;
  const dimensionsDisabled = isSvgOutput && settings.svgResponsive;
  const showMaxFileSize = !isPng && !isSvgInput;
  const showSvgMode = isSvgOutput;

  return (
    <div className="p-4 space-y-5">
      <FormatSelector
        value={settings.format}
        onChange={(format) => update({ format: format as OptimizeSettings['format'] })}
        inputFormat={imageFormat}
      />

      {showQuality && (
        <QualitySlider
          value={settings.quality}
          onChange={(quality) => update({ quality })}
          disabled={false}
        />
      )}

      {showDimensions && (
        <DimensionControls
          width={settings.width}
          imageWidth={imageWidth}
          onWidthChange={(width) => update({ width, height: null, maintainAspectRatio: true })}
          disabled={dimensionsDisabled}
        />
      )}

      {showMaxFileSize && (
        <MaxFileSizeInput
          value={settings.maxFileSize}
          onChange={(maxFileSize) => update({ maxFileSize })}
        />
      )}

      {showSvgMode && (
        <SvgModeSelector
          value={settings.svgMode}
          onChange={(svgMode) => update({ svgMode: svgMode as OptimizeSettings['svgMode'] })}
          svgResponsive={settings.svgResponsive}
          onResponsiveChange={(svgResponsive) => update({ svgResponsive })}
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

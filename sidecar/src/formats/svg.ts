import { optimize, type Config } from 'svgo';

type SvgMode = 'safe' | 'standard';

const safeConfig: Config = {
  plugins: [
    'removeDoctype',
    'removeXMLProcInst',
    'removeComments',
    'removeMetadata',
    'removeEditorsNSData',
    'removeEmptyAttrs',
    'removeEmptyContainers',
    'removeEmptyText',
    'removeDesc',
    'removeTitle',
  ],
};

const standardConfig: Config = {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeViewBox: false,
        },
      },
    } as any,
  ],
};

const configs: Record<SvgMode, Config> = {
  'safe': safeConfig,
  'standard': standardConfig,
};

export function optimizeSvg(svgString: string, mode: SvgMode): string {
  const result = optimize(svgString, configs[mode]);
  return result.data;
}

export function resizeSvg(
  svgContent: string,
  targetWidth: number,
  originalWidth: number,
  originalHeight: number
): { content: string; width: number; height: number } {
  const scale = targetWidth / originalWidth;
  const newWidth = Math.round(targetWidth);
  const newHeight = Math.round(originalHeight * scale);

  let result = svgContent;

  // Replace existing width attribute or inject one
  if (/(<svg[^>]*)\swidth="[^"]*"/.test(result)) {
    result = result.replace(/(<svg[^>]*)\swidth="[^"]*"/, `$1 width="${newWidth}"`);
  } else {
    result = result.replace(/(<svg)(\s|>)/, `$1 width="${newWidth}"$2`);
  }

  // Replace existing height attribute or inject one
  if (/(<svg[^>]*)\sheight="[^"]*"/.test(result)) {
    result = result.replace(/(<svg[^>]*)\sheight="[^"]*"/, `$1 height="${newHeight}"`);
  } else {
    result = result.replace(/(<svg)(\s|>)/, `$1 height="${newHeight}"$2`);
  }

  return { content: result, width: newWidth, height: newHeight };
}

export function makeSvgResponsive(
  svgContent: string,
  fallbackWidth: number,
  fallbackHeight: number
): string {
  let result = svgContent;

  // Ensure viewBox exists before removing width/height
  if (!/viewBox=/i.test(result)) {
    result = result.replace(
      /(<svg)(\s|>)/,
      `$1 viewBox="0 0 ${fallbackWidth} ${fallbackHeight}"$2`
    );
  }

  // Remove width and height attributes from the <svg> element
  result = result.replace(/(<svg[^>]*)\swidth="[^"]*"/, '$1');
  result = result.replace(/(<svg[^>]*)\sheight="[^"]*"/, '$1');

  return result;
}

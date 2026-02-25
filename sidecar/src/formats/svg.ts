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

import { optimize, type Config } from 'svgo';

type SvgMode = 'safe' | 'bricks-safe' | 'efficient';

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
    { name: 'removeTitle', params: {} },
  ],
};

const bricksSafeConfig: Config = {
  plugins: [
    ...(safeConfig.plugins as any[]),
    'mergePaths',
    'removeUselessDefs',
    {
      name: 'removeAttrs',
      params: {
        attrs: [],  // Don't remove any attrs — preserve data-bricks-*, classes, IDs
      },
    },
  ],
};

const efficientConfig: Config = {
  plugins: [
    {
      name: 'preset-default',
    },
    'removeStyleElement',
    {
      name: 'removeAttrs',
      params: {
        attrs: ['class', 'data-.*'],
        preserveCurrentColor: true,
      },
    },
  ],
};

const configs: Record<SvgMode, Config> = {
  'safe': safeConfig,
  'bricks-safe': bricksSafeConfig,
  'efficient': efficientConfig,
};

export function optimizeSvg(svgString: string, mode: SvgMode): string {
  const result = optimize(svgString, configs[mode]);
  return result.data;
}

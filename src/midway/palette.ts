import { theme } from '../carnival';

const { colors } = theme;

/**
 * The midway map's Halloween-night palette. Tent reds, creams and golds come from the
 * carnival theme; the sky, grass, paths and other scenery shades only the map
 * uses live here.
 */
export const palette = {
  sky: '#3a2459',
  skyHigh: '#0d0820',
  cloud: '#4a3d63',
  cloudShade: '#3a2f50',
  haze: '#4a3a5e',

  grass: '#4f5a2a',
  grassDark: '#424c22',
  grassEdge: '#363e1b',
  grassLight: '#5e6a33',
  path: '#8a7a5c',
  pathShade: '#746548',
  hedge: '#2f4a2a',
  hedgeDark: '#24391f',
  hedgeLight: '#3c5c33',
  shadow: 'rgba(10, 5, 20, 0.4)',

  red: colors.stripeA,
  redShade: '#c24e00',
  cream: colors.stripeB,
  creamShade: '#5a2d8f',
  gold: colors.accent,
  goldShade: '#d98e00',
  blue: '#3b4fa0',
  blueShade: '#2a3878',
  sky2: colors.water,
  pink: '#8bd346',
  pinkShade: '#6aa832',
  wood: colors.wood,
  woodDark: '#6b4429',
  woodLight: '#b7834f',
  board: '#c8955b',
  metal: '#c9c3d6',
  metalShade: '#8f86a3',
  ink: colors.background,
  opening: '#1a0f0f',
  closed: '#5a4f6e',
  closedShade: '#463c58',
  white: '#ffffff',
  moon: '#f4ecc2',
  moonShade: '#ddd2a0',
  moonGlow: 'rgba(244, 236, 194, 0.12)',
  bat: '#0a0612',

  skins: ['#f1c27d', '#c68642', '#8d5524', '#e0ac69', '#ffdbac'],
  hairs: ['#3b2219', '#1b1035', '#a55728', '#e6c35c', '#6b4429'],
  shirts: [colors.water, '#8bd346', '#b48ee0', colors.danger, colors.stripeA, '#2d2d2d'],
  pants: ['#2d3a6b', '#3b2a4f', '#5a4a3a'],
  bunting: [colors.stripeA, '#1a1a1a', colors.stripeB, colors.accent],
  balloons: [colors.stripeA, colors.stripeB, '#8bd346', colors.accent, '#2d2d2d'],
} as const;

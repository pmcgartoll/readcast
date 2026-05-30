import { useColorScheme } from 'react-native';

export type Palette = {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentText: string;
  success: string;
  warning: string;
  danger: string;
  overlay: string;
};

const light: Palette = {
  background: '#FBF7F0',
  surface: '#FFFFFF',
  surfaceMuted: '#F1EBE0',
  border: '#E6DDCE',
  text: '#1F1B16',
  textMuted: '#6B6256',
  textFaint: '#9A9283',
  accent: '#C75D3A',
  accentText: '#FFFFFF',
  success: '#3E7C5A',
  warning: '#B7791F',
  danger: '#B23A48',
  overlay: 'rgba(31,27,22,0.45)',
};

const dark: Palette = {
  background: '#15120E',
  surface: '#211C16',
  surfaceMuted: '#2B251D',
  border: '#39312766',
  text: '#F4EEE3',
  textMuted: '#B9AF9E',
  textFaint: '#867E70',
  accent: '#E0764F',
  accentText: '#1A140F',
  success: '#6FB48C',
  warning: '#E0B05A',
  danger: '#E07A86',
  overlay: 'rgba(0,0,0,0.6)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const fonts = {
  serif: 'DMSerifDisplay_400Regular',
  body: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
} as const;

export type Theme = {
  colors: Palette;
  spacing: typeof spacing;
  radii: typeof radii;
  fonts: typeof fonts;
  isDark: boolean;
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    colors: isDark ? dark : light,
    spacing,
    radii,
    fonts,
    isDark,
  };
}

export const palettes = { light, dark };

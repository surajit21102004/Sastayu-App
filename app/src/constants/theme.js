import { Platform } from 'react-native';

export const BrandColors = {
  primaryBlue: '#1E40AF', // Main brand colour, buttons, backgrounds
  accentYellow: '#FBBF24', // Accent: the S pipe, tags, highlights
  navyText: '#0F172A', // Text on light backgrounds, text on yellow
  white: '#FFFFFF',
  lightGray: '#F1F5F9',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  mutedText: '#64748B',
};

// Explicit light theme always enforced to prevent OS dark mode text/background inversions
export const Colors = {
  light: {
    primary: BrandColors.primaryBlue,
    accent: BrandColors.accentYellow,
    text: BrandColors.navyText,
    background: '#F8FAFC',
    card: '#FFFFFF',
    backgroundElement: '#EFF6FF',
    backgroundSelected: '#DBEAFE',
    textSecondary: BrandColors.mutedText,
    border: BrandColors.border,
    tint: BrandColors.primaryBlue,
  },
  dark: {
    // Keep clean light colors even if dark mode is active on phone
    primary: BrandColors.primaryBlue,
    accent: BrandColors.accentYellow,
    text: BrandColors.navyText,
    background: '#F8FAFC',
    card: '#FFFFFF',
    backgroundElement: '#EFF6FF',
    backgroundSelected: '#DBEAFE',
    textSecondary: BrandColors.mutedText,
    border: BrandColors.border,
    tint: BrandColors.primaryBlue,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
};

export const BottomTabInset = Platform.select({ ios: 60, android: 80 }) ?? 60;
export const MaxContentWidth = 800;

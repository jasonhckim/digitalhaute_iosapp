import { Platform } from "react-native";

export const BrandColors = {
  gold: "#D4AF37",
  goldLight: "#F4D03F",
  goldDark: "#B8960C",
  white: "#FFFFFF",
  surface: "#FAFAFA",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B6B6B",
  textTertiary: "#9B9B9B",
  border: "#E8E8E8",
  error: "#DC2626",
  success: "#059669",
};

export const StatusColors = {
  maybe: "#9B9B9B",
  ordered: "#3B82F6",
  shipped: "#F59E0B",
  delivered: "#10B981",
  received: "#059669",
  cancelled: "#DC2626",
};

export const Colors = {
  light: {
    text: BrandColors.textPrimary,
    textSecondary: BrandColors.textSecondary,
    textTertiary: BrandColors.textTertiary,
    buttonText: "#FFFFFF",
    tabIconDefault: BrandColors.textTertiary,
    tabIconSelected: BrandColors.gold,
    link: BrandColors.gold,
    backgroundRoot: BrandColors.white,
    backgroundDefault: BrandColors.surface,
    backgroundSecondary: "#F5F5F5",
    backgroundTertiary: "#EFEFEF",
    border: BrandColors.border,
    gold: BrandColors.gold,
    goldLight: BrandColors.goldLight,
    error: BrandColors.error,
    success: BrandColors.success,
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#A0A0A0",
    textTertiary: "#707070",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: BrandColors.goldLight,
    link: BrandColors.goldLight,
    backgroundRoot: "#1A1A1A",
    backgroundDefault: "#252525",
    backgroundSecondary: "#303030",
    backgroundTertiary: "#3A3A3A",
    border: "#404040",
    gold: BrandColors.goldLight,
    goldLight: BrandColors.goldLight,
    error: "#EF4444",
    success: "#10B981",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 48,
};

export const BorderRadius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
};

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  fab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
};

export const Typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 34,
  },
  largeTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "700" as const,
  },
  title1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as const,
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  title3: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "600" as const,
  },
  h1: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "600" as const,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400" as const,
  },
  callout: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "400" as const,
  },
  subheadline: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
  },
  caption1: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

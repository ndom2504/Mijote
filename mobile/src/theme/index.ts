import { Platform, type ViewStyle } from "react-native";

export const colors = {
  forest: "#183C32",
  sage: "#8FA78A",
  pale: "#E4EEDC",
  cream: "#F6F5EF",
  white: "#FFFFFF",
  ink: "#26352D",
  muted: "#4D6156",
  line: "#D7E0D4",
  peach: "#FBE9DC",
  heart: "#B5483A",
  danger: "#8D3B32",
  dangerBg: "#F8E8E6",
} as const;

export const fonts = {
  serif: Platform.select({ ios: "Georgia", default: "serif" }) as string,
};

export const radius = { card: 28, tile: 22, input: 16, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const shadow: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: colors.forest,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  default: { elevation: 6, shadowColor: colors.forest },
}) as ViewStyle;

export const softShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: colors.forest,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  default: { elevation: 2, shadowColor: colors.forest },
}) as ViewStyle;

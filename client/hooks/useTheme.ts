import { Colors } from "@/constants/theme";

export function useTheme() {
  // Always use light mode for the luxury white and gold aesthetic
  const theme = Colors.light;

  return {
    theme,
    isDark: false,
  };
}

import Slider, { SliderProps } from "@react-native-community/slider";

import { THEME } from "@/constants/theme";

interface CustomSliderProps extends Omit<
  SliderProps,
  "minimumTrackTintColor" | "maximumTrackTintColor" | "thumbTintColor"
> {
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
}

/**
 * A reusable slider component with consistent styling across the app.
 * Uses the brand saffron color as the default track color.
 */
export function CustomSlider({
  minimumTrackTintColor = THEME.colors.primary,
  maximumTrackTintColor = THEME.colors.surfaceElevated,
  thumbTintColor = "#FFFFFF",
  ...props
}: CustomSliderProps) {
  return (
    <Slider
      minimumTrackTintColor={minimumTrackTintColor}
      maximumTrackTintColor={maximumTrackTintColor}
      thumbTintColor={thumbTintColor}
      {...props}
    />
  );
}

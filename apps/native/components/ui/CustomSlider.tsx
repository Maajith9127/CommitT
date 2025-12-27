import Slider, { SliderProps } from "@react-native-community/slider";

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
 * Uses the blue color (#4FA0FF) as the default track color.
 */
export function CustomSlider({
  minimumTrackTintColor = "#4FA0FF",
  maximumTrackTintColor = "#3A3A3C",
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

import Slider, { SliderProps } from "@react-native-community/slider";
import * as Haptics from "expo-haptics";

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
  maximumTrackTintColor = "#3A3A3C",
  thumbTintColor = "#FFFFFF",
  ...props
}: CustomSliderProps) {
  const handleValueChange = (val: number) => {
    if (props.onValueChange) {
      Haptics.selectionAsync();
      props.onValueChange(val);
    }
  };

  return (
    <Slider
      minimumTrackTintColor={minimumTrackTintColor}
      maximumTrackTintColor={maximumTrackTintColor}
      thumbTintColor={thumbTintColor}
      {...props}
      onValueChange={handleValueChange}
    />
  );
}

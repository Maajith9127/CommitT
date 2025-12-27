import { TouchableOpacity, Animated } from "react-native";
import { withUniwind } from "uniwind";

const UAnimatedView = withUniwind(Animated.View);

type DimmingOverlayProps = {
  opacity: Animated.Value;
  visible: boolean;
  onPress: () => void;
  className?: string;
};

export function DimmingOverlay({ opacity, visible, onPress, className = "" }: DimmingOverlayProps) {
  return (
    <UAnimatedView
      style={{ opacity }}
      className={`absolute top-0 bottom-0 left-0 right-0 bg-black/60 ${className}`}
      pointerEvents={visible ? "auto" : "none"}
    >
      <TouchableOpacity style={{ flex: 1 }} onPress={onPress} activeOpacity={1} />
    </UAnimatedView>
  );
}

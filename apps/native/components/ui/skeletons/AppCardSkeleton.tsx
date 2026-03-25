import { View } from "react-native";
import { withUniwind } from "uniwind";
import { SkeletonBlock } from "./SkeletonBlock";

const UView = withUniwind(View);

/**
 * AppCardSkeleton
 *
 * A loading skeleton that perfectly matches the layout of `SelectableListItem`.
 * Used during the native app fetching process to prevent UI jumping and provide
 * a premium, native-feeling loading experience instead of standard spinners.
 */
export function AppCardSkeleton() {
  return (
    <UView className="flex-row items-center py-3 border-b border-[#2A2A2A] -mx-4 px-4">
      <UView className="flex-row items-center flex-1">
        {/* Icon Skeleton (10x10 rem/unit, matching w-10 h-10 => 40px) */}
        <SkeletonBlock width={40} height={40} className="mr-3" borderRadius={8} />
        {/* Label Skeleton (matching AuthTitle placement) */}
        <SkeletonBlock height={16} width={150} borderRadius={4} />
      </UView>

      {/* Checkbox Skeleton (matching size={22}) */}
      <SkeletonBlock width={22} height={22} borderRadius={4} />
    </UView>
  );
}

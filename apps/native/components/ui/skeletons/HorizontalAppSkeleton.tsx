import { View } from "react-native";
import { withUniwind } from "uniwind";
import { SkeletonBlock } from "./SkeletonBlock";

const UView = withUniwind(View);

/**
 * HorizontalAppSkeleton
 *
 * A specialized loading placeholder designed for the horizontal app list
 * within the DigitalCommitItem cards. It prevents "snapping" UI by matching
 * the geometry of the real icon/label pairing.
 */
export function HorizontalAppSkeleton() {
  return (
    <UView className="flex-row items-center mr-5">
      {/* Icon Placeholder (matching 32x32 size in DigitalCommitItem) */}
      <SkeletonBlock width={32} height={32} borderRadius={8} />
      {/* Label Placeholder (shorter width to simulate varied app names) */}
      <UView className="ml-3">
        <SkeletonBlock height={14} width={80} borderRadius={4} />
      </UView>
    </UView>
  );
}

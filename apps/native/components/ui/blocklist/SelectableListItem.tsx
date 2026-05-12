import { View, Pressable, Image } from "react-native";
import { withUniwind } from "uniwind";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthTitle } from "@/components/ui/text";
import { THEME } from "@/constants/theme";

const UView = withUniwind(View);
const UPress = withUniwind(Pressable);

/**
 * Props for the SelectableListItem component.
 *
 * ICON RENDERING PRIORITY (highest → lowest):
 *   1. `imageUri` — If provided, renders the actual app icon image (Base64).
 *   2. `icon: "cellphone"` — Falls back to a generic phone icon in a dark box.
 *   3. `icon: "web"` — Renders a globe icon for website entries.
 */
type SelectableListItemProps = {
  /** Determines the fallback icon type when no `imageUri` is available. */
  icon: "cellphone" | "web";
  /** Display name shown next to the icon (e.g. "Chrome" or "instagram.com"). */
  label: string;
  /** Optional Base64 data URI (`data:image/png;base64,...`) for the real app icon.
   *  Sourced from the native AppListerModule. Null triggers fallback to `icon`. */
  imageUri?: string | null;
  /** Whether this item is currently selected/checked in the blocklist. */
  selected: boolean;
  /** Callback fired when the user taps anywhere on the row. */
  onToggle: () => void;
};

/**
 * SelectableListItem — A single row in the blocklist.
 *
 * Renders a pressable row with:
 *   - Left: App icon (real image or fallback) + label text
 *   - Right: Checkbox indicator (filled blue when selected)
 *
 * Used in both the Apps tab (with native icons) and Webs tab (with globe icons).
 *
 * @example
 * <SelectableListItem
 *   icon="cellphone"
 *   imageUri="data:image/png;base64,iVBOR..."
 *   label="Chrome"
 *   selected={true}
 *   onToggle={() => toggleApp("com.google.chrome")}
 * />
 */
export function SelectableListItem({ icon, label, imageUri, selected, onToggle }: SelectableListItemProps) {
  return (
    <UPress onPress={onToggle}>
      <UView className="border-b" style={{ borderColor: THEME.colors.surfaceElevated }}>
        <UView className="flex-row items-center py-3 px-4">
          <UView className="flex-row items-center flex-1">
            {/* Priority 1: Real app icon from native Base64 extraction */}
            {imageUri ? (
              <UView className="w-10 h-10 mr-3 overflow-hidden rounded-lg items-center justify-center">
                <Image source={{ uri: imageUri }} style={{ width: 40, height: 40, resizeMode: "cover" }} />
              </UView>
            ) : icon === "cellphone" ? (
              /* Priority 2: Generic phone icon fallback (apps without extractable icons) */
              <UView className="w-10 h-10 mr-3 rounded-lg items-center justify-center" style={{ backgroundColor: THEME.colors.surfaceElevated }}>
                <MaterialCommunityIcons name="cellphone" size={20} color={THEME.colors.primary} />
              </UView>
            ) : (
              /* Priority 3: Globe icon for website entries */
              <MaterialCommunityIcons
                name="web"
                size={20}
                color={THEME.colors.primary}
                style={{ marginRight: 12 }}
              />
            )}
            <AuthTitle className="mb-0 text-base font-normal" style={{ color: THEME.colors.textMain }}>{label}</AuthTitle>
          </UView>

          {/* Right side: selection checkbox */}
          <MaterialCommunityIcons
            name={selected ? "checkbox-marked" : "checkbox-blank-outline"}
            size={22}
            color={selected ? THEME.colors.primary : THEME.colors.textMuted}
          />
        </UView>
      </UView>
    </UPress>
  );
}

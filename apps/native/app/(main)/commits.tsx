import { FlatList, View } from "react-native";
import { withUniwind } from "uniwind";

import { HeaderTitle, ScreenHeader } from "@/components/ui";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { VerificationCard } from "@/components/ui/commits/VerificationCard";
import { CommitCard } from "@/components/ui/commits/CommitCard";
import { AddButton } from "@/components/ui/button";
import { useRouter } from "expo-router";

const UView = withUniwind(View);

export default function CommitsScreen() {
  const router = useRouter();

  const DATA = [
    { type: "quick", key: "quick" },
    { type: "schedules_title", key: "schedules_title" },
    { type: "schedules_content", key: "schedules_content" },
    { type: "templates_title", key: "templates_title" },
    { type: "templates_content", key: "templates_content" },
               ];

  const stickyHeaders = [0, 1, 3];

  const renderItem = ({ item }) => {
    switch (item.type) {
      // -------------------------------------------------------
      // QUICK HEADER + VERIFICATION CARD
      // -------------------------------------------------------
      case "quick":
        return (
          <>
            <ScreenHeader>
              <UView className="flex-row items-center gap-2">
                <MaterialCommunityIcons
                  name="rotate-orbit"
                  size={33}
                  color="white"
                />
                <HeaderTitle className="text-2xl text-white">
                  CommitT
                </HeaderTitle>
              </UView>

              <VerificationCard className="mt-3" />
            </ScreenHeader>
          </>
        );

      // -------------------------------------------------------
      // SCHEDULES TITLE ROW
      // -------------------------------------------------------
      case "schedules_title":
        return (
          <ScreenHeader className="border-b bg-black pb-1 border-gray-800">
            <UView className="flex-row items-center justify-between w-full">
              <HeaderTitle>CommitTs</HeaderTitle>

              {/* Add button navigates to the creation flow */}
              <AddButton
                onPress={() => router.push("/(create-commit)/conditions")}
              />
            </UView>
          </ScreenHeader>
        );

      // -------------------------------------------------------
      // SCHEDULES CONTENT (Commit Cards)
      // -------------------------------------------------------
      case "schedules_content":
        return (
          <UView className="bg-[#000000] px-4 py-4 gap-4">
            <CommitCard
              title="Focus"
              conditions={2}
              iconName="target"
              statusLabel="Active"
            />

            <CommitCard
              title="Study"
              conditions={3}
              iconName="book-open-page-variant"
              statusLabel="Active"
            />

            <CommitCard
              title="Gym"
              conditions={1}
              iconName="dumbbell"
              statusLabel="Active"
            />
          </UView>
        );

      // -------------------------------------------------------
      // TEMPLATES TITLE
      // -------------------------------------------------------
      case "templates_title":
        return (
          <ScreenHeader className="border-b border-gray-800">
            <HeaderTitle>Templates</HeaderTitle>
          </ScreenHeader>
        );

      // -------------------------------------------------------
      // TEMPLATES CONTENT
      // -------------------------------------------------------
      case "templates_content":
        return (
          <UView className="bg-[#000000] px-4 py-4 gap-4">
            <HeaderTitle className="text-gray-300 text-lg">
              Template A
            </HeaderTitle>
            <HeaderTitle className="text-gray-300 text-lg">
              Template B
            </HeaderTitle>
            <HeaderTitle className="text-gray-300 text-lg">
              Template C
            </HeaderTitle>
          </UView>
        );
    }
  };

  return (
    <FlatList
      data={DATA}
      renderItem={renderItem}
      stickyHeaderIndices={stickyHeaders}
      contentContainerStyle={{ paddingBottom: 80 }}
    />
  );
}

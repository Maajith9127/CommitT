import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FlatList, View, Pressable, Text } from "react-native";
import { withUniwind } from "uniwind";
import { useQuery } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";

import { HeaderTitle } from "@/components/ui/text";
import { ScreenHeader } from "@/components/ui/ScreenContainer";
import { AddButton } from "@/components/ui/button";
import { CommitCard } from "@/components/ui/commits/CommitCard";
import { VerificationCard } from "@/components/ui/commits/VerificationCard";

import { authClient } from "@/lib/auth-client";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";

const UView = withUniwind(View);
const UText = withUniwind(Text); // Added UText
const UPressable = withUniwind(Pressable); // Added UPressable

export default function CommitsScreen() {
  const router = useRouter();
  
  // Auth & State
  const { data: session } = authClient.useSession();
  const setAssigner = useTaskDraftStore((state: any) => state.setAssigner);
  const setAssignee = useTaskDraftStore((state: any) => state.setAssignee);
  const resetDraft = useTaskDraftStore((state: any) => state.resetDraft);
  const setDraft = useTaskDraftStore((state: any) => state.setDraft);

  // Fetch real tasks from backend
  const tasks = useQuery(api.tasks.list);

  const DATA = [
    { type: "quick", key: "quick" },
    { type: "schedules_title", key: "schedules_title" },
    { type: "schedules_content", key: "schedules_content" },
    { type: "templates_title", key: "templates_title" },
    { type: "templates_content", key: "templates_content" },
  ];

  const stickyHeaders = [0, 1, 3];

  const renderItem = ({ item }: { item: { type: string } }) => {
    switch (item.type) {
      // -------------------------------------------------------
      // QUICK HEADER + VERIFICATION CARD
      // -------------------------------------------------------
      case "quick":
        return (
          <ScreenHeader>
            <UView className="flex-row items-center gap-2">
              <MaterialCommunityIcons name="rotate-orbit" size={33} color="white" />
              <HeaderTitle className="text-2xl text-white">CommitT</HeaderTitle>
            </UView>

            <VerificationCard className="mt-3" onPress={() => router.push("/(verify-commit)")} />
          </ScreenHeader>
        );

      // -------------------------------------------------------
      // SCHEDULES TITLE ROW
      // -------------------------------------------------------
      case "schedules_title":
        return (
          <ScreenHeader className="bg-black pb-1">
            <UView className="w-full flex-row items-center justify-between">
             <HeaderTitle>CommitTs</HeaderTitle>

              <AddButton
                onPress={() => {
                  if (session?.user?.id) {
                    resetDraft();
                    setAssigner(session.user.id);
                    setAssignee(session.user.id);
                    router.push("/(create-commit)/final");
                  }
                }}
              />
            </UView>
          </ScreenHeader>
        );

      // -------------------------------------------------------
      // SCHEDULES CONTENT (FROM BACKEND)
      // -------------------------------------------------------
      case "schedules_content":
        return (
          <UView className="gap-4 bg-black px-4 py-4">
            {tasks?.map((task: any) => (
              <CommitCard
                key={task._id}
                title={task.title}
                conditions={task.conditions?.length || 0}
                iconName="book"
                statusLabel="Active"
                onPress={() => {
                  setDraft({
                    ...task,
                    id: task._id,
                  });
                  router.push("/(create-commit)/final");
                }}
              />
            ))}
            {(!tasks || tasks.length === 0) && (
              <HeaderTitle>No active commitments found.</HeaderTitle>
            )}
          </UView>
        );

      // -------------------------------------------------------
      // TEMPLATES TITLE
      // -------------------------------------------------------
      case "templates_title":
        return (
          <ScreenHeader className="border-gray-800 border-b">
            <HeaderTitle>Templates</HeaderTitle>
          </ScreenHeader>
        );

      // -------------------------------------------------------
      // TEMPLATES CONTENT
      // -------------------------------------------------------
      case "templates_content":
        return (
          <UView className="gap-4 bg-black px-4 py-4">
            <HeaderTitle className="text-gray-300 text-lg">Template A</HeaderTitle>
            <HeaderTitle className="text-gray-300 text-lg">Template B</HeaderTitle>
            <HeaderTitle className="text-gray-300 text-lg">Template C</HeaderTitle>
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

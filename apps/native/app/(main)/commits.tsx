import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, View, Pressable, Text, Alert } from "react-native";
import { withUniwind } from "uniwind";
import { useQuery, useMutation } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";

import { HeaderTitle } from "@/components/ui/text";
import { ScreenHeader } from "@/components/ui/ScreenContainer";
import { AddButton } from "@/components/ui/button";
import { CommitCard } from "@/components/ui/commits/CommitCard";
import { VerificationCard } from "@/components/ui/commits/VerificationCard";
import { ActionMenu } from "@/components/ui/commits/ActionMenu";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";

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
  const removeTask = useMutation(api.tasks.remove);

  // Action Menu state
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Prepare FlatList data
  const hasTasks = tasks && tasks.length > 0;
  
  const DATA = [
    { type: "quick", subId: "quick" },
    { type: "schedules_title", subId: "title" },
    // Inject tasks directly into the flatlist data
    ...(hasTasks 
      ? tasks.map((t: any) => ({ type: "task_item", subId: t._id, data: t })) 
      : [{ type: "schedules_empty", subId: "empty" }]
    ),
    { type: "templates_title", subId: "templates_title" },
    { type: "templates_content", subId: "templates_content" },
  ];

  const stickyHeaders = [1, hasTasks ? tasks.length + 2 : 3];

  const renderItem = ({ item }: { item: any }) => {
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
          <ScreenHeader className="bg-black ">
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
      // TASK ITEM (Virtualised)
      // -------------------------------------------------------
      case "task_item":
        const task = item.data;
        return (
          <UView className="bg-black px-4 pb-4">
             <CommitCard
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
                onOptionsPress={(position) => {
                  setSelectedTask(task);
                  setMenuPosition(position);
                  setMenuVisible(true);
                }}
              />
          </UView>
        );

      // -------------------------------------------------------
      // EMPTY STATE
      // -------------------------------------------------------
      case "schedules_empty":
        return (
          <UView className="bg-black px-4 py-8">
             <HeaderTitle className="text-gray-500 text-center">
               {tasks === undefined ? "Loading..." : "No active commitments found."}
             </HeaderTitle>
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
    return null;
  };

  return (
    <>
      <FlatList
        data={DATA}
        renderItem={renderItem}
        stickyHeaderIndices={stickyHeaders}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Action Menu for Commit Cards */}
      <ActionMenu
        visible={menuVisible}
        onClose={() => {
          setMenuVisible(false);
        }}
        anchorPosition={menuPosition}
        items={[
          {
            icon: "pause-circle-outline",
            label: "Pause",
            onPress: () => {
              console.log("Pause task:", selectedTask?._id);
              // TODO: Implement pause functionality
            },
          },
          {
            icon: "content-copy",
            label: "Duplicate",
            onPress: () => {
              console.log("Duplicate task:", selectedTask?._id);
              // TODO: Implement duplicate functionality
            },
          },
          {
            icon: "delete-outline",
            label: "Delete",
            color: "#FF3B30",
            onPress: () => {
              // Hide menu and show modal
              setMenuVisible(false);
              setDeleteModalVisible(true);
            },
          },
        ]}
      />
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete this commitment?"
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="#FF3B30"
        onConfirm={async () => {
          if (selectedTask?._id) {
             await removeTask({ id: selectedTask._id });
          }
          setDeleteModalVisible(false);
          setSelectedTask(null);
        }}
        onCancel={() => {
          setDeleteModalVisible(false);
        }}
      />
    </>
  );
}

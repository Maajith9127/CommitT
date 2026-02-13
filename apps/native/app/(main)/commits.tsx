import React, { useCallback, useMemo } from "react";
import { View, FlatList, Pressable, Text } from "react-native";
import { useRouter } from "expo-router"; // Essential for navigation
import Animated from 'react-native-reanimated';
import { withUniwind } from "uniwind";

// UI Components
import { HeaderTitle } from "@/components/ui/text";
import { ScreenHeader } from "@/components/ui/ScreenContainer";
import { AddButton } from "@/components/ui/button";
import { CommitCard } from "@/components/ui/commits/CommitCard";
import { VerificationCard } from "@/components/ui/commits/VerificationCard";
import { ActionMenu, ActionMenuItem } from "@/components/ui/commits/ActionMenu";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";
import { CommitCardSkeleton } from '@/components/ui/skeletons/CommitCardSkeleton';
import { SkeletonBlock } from '@/components/ui/skeletons/SkeletonBlock';

// Extracted Domain Logic Hooks
import { useTasks, Task } from "@/hooks/commits/useTasks";
import { useTaskActions } from "@/hooks/commits/useTaskActions";
import { useTaskSelection, AnchorPosition } from "@/hooks/commits/useTaskSelection";
import { useSkeletonAnimation } from "@/hooks/calendar/useSkeletonAnimation";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration & Stylings
// ─────────────────────────────────────────────────────────────────────────────

const UView = withUniwind(View);

const COLORS = {
  primary: "#4FA0FF",
  danger: "#FF3B30",
  success: "#4CD964",
} as const;

const LAYOUT = {
  bottomPadding: 80,
} as const;

/** Union type for all list item types */
type ListItemType =
  | "quick"
  | "schedules_title"
  | "task_item"
  | "schedules_empty"
  | "templates_title"
  | "templates_content";

/** Unified list item structure for FlatList */
interface ListItem {
  type: ListItemType;
  subId: string;
  data?: Task;
}

/** Unique key generator for FlatList items */
function getItemKey(item: ListItem): string {
  return `${item.type}-${item.subId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component: CommitsScreen
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Commits Screen
 * 
 * Displays the user's list of active commitments (tasks).
 * 
 * Architecture:
 * - Data Fetching: Delegated to `useTasks` hook.
 * - Actions/Mutations: Delegated to `useTaskActions` hook.
 * - UI State (Selection/Menus): Delegated to `useTaskSelection` hook.
 * - Visual State (Loading): Delegated to `useSkeletonAnimation` hook.
 * 
 * This separation ensures the component remains focused on layout and composition.
 */
export default function CommitsScreen() {
  const router = useRouter();

  // 1. Data Layer
  const { tasks: sortedTasks, isLoading, hasTasks, session } = useTasks();

  // 2. Action Layer
  const { handleCreateNew, handleEditTask, deleteTask } = useTaskActions();

  // 3. UI State Layer
  const {
    selectedTask,
    menuVisible,
    menuPosition,
    deleteModalVisible,
    openMenu,
    closeMenu,
    requestDelete,
    cancelDelete,
    clearSelection,
  } = useTaskSelection();

  // 4. Visual Layer (Skeleton Animation)
  const { showSkeleton, animatedOverlayStyle } = useSkeletonAnimation(2000);

  // ─────────────────────────────────────────────────────────────────────────
  // Computations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Prepare data for FlatList.
   * Transforms raw tasks into a heterogeneous list for section rendering.
   */
  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [
      { type: "quick", subId: "quick" },
      { type: "schedules_title", subId: "title" },
    ];

    if (hasTasks) {
      sortedTasks.forEach((task) => {
        items.push({
          type: "task_item",
          subId: task._id,
          data: task,
        });
      });
    } else {
      items.push({ type: "schedules_empty", subId: "empty" });
    }

    items.push(
      { type: "templates_title", subId: "templates_title" },
      { type: "templates_content", subId: "templates_content" }
    );

    return items;
  }, [hasTasks, sortedTasks]);

  /**
   * Indices for sticky section headers.
   * 1 = CommitTs Header
   * N = Templates Header (dynamic based on task count)
   */
  const stickyHeaderIndices = useMemo(() => {
    return [1, hasTasks ? sortedTasks.length + 2 : 3];
  }, [hasTasks, sortedTasks.length]);

  // ─────────────────────────────────────────────────────────────────────────
  // Action Handlers
  // ─────────────────────────────────────────────────────────────────────────

  /** Defines menu items for the task context menu */
  const actionMenuItems: ActionMenuItem[] = useMemo(
    () => [
      {
        icon: "pause-circle-outline",
        label: "Pause",
        onPress: () => console.log("Pause not implemented"),
      },
      {
        icon: "content-copy",
        label: "Duplicate",
        onPress: () => console.log("Duplicate not implemented"),
      },
      {
        icon: "delete-outline",
        label: "Delete",
        color: COLORS.danger,
        onPress: requestDelete,
      },
    ],
    [requestDelete]
  );

  /** wrapper for confirming deletion */
  const confirmDelete = useCallback(async () => {
    if (selectedTask?._id) {
      await deleteTask(selectedTask._id);
    }
    clearSelection();
  }, [selectedTask, deleteTask, clearSelection]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render Helpers
  // ─────────────────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      switch (item.type) {
        case "quick":
          return (
             <UView className="bg-black px-4 pb-2">
                <VerificationCard className="mt-0" onPress={() => router.push("/verify")} />
            </UView>
          );
        case "schedules_title":
          return (
            <UView className="bg-black px-4 py-2 pb-4">
              <UView className="w-full flex-row items-center justify-between">
                <HeaderTitle>CommitTs</HeaderTitle>
                <AddButton onPress={() => session?.user?.id && handleCreateNew(session.user.id)} />
              </UView>
            </UView>
          );
        case "task_item":
          return item.data ? (
            <UView className="bg-black px-4 pb-4">
              <CommitCard
                title={item.data.title}
                conditions={item.data.conditions?.length ?? 0}
                iconName="book"
                statusLabel="Active"
                onPress={() => handleEditTask(item.data!)}
                onOptionsPress={(pos) => openMenu(item.data!, pos)}
              />
            </UView>
          ) : null;
        case "schedules_empty":
          return (
            <UView className="bg-black px-4 py-8">
              <HeaderTitle className="text-gray-500 text-center">
                {isLoading ? "Loading..." : "No active commitments found."}
              </HeaderTitle>
            </UView>
          );
        case "templates_title":
          return (
            <ScreenHeader className="border-gray-800 border-b">
              <HeaderTitle>Templates</HeaderTitle>
            </ScreenHeader>
          );
        case "templates_content":
          return (
            <UView className="gap-4 bg-black px-4 py-4">
              <HeaderTitle className="text-gray-300 text-lg">Template A</HeaderTitle>
              <HeaderTitle className="text-gray-300 text-lg">Template B</HeaderTitle>
              <HeaderTitle className="text-gray-300 text-lg">Template C</HeaderTitle>
            </UView>
          );
        default:
          return null;
      }
    },
    [session, handleCreateNew, handleEditTask, openMenu, isLoading, router]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <UView className="flex-1 bg-black">
      {/* 1. Main Content List */}
      <FlatList
        data={listData}
        keyExtractor={getItemKey}
        renderItem={renderItem}
        stickyHeaderIndices={stickyHeaderIndices}
        contentContainerStyle={{ paddingBottom: LAYOUT.bottomPadding }}
        showsVerticalScrollIndicator={false}
      />
      
      {/* 2. Skeleton Overlay (Visual State) */}
      {showSkeleton && (
        <Animated.View 
          style={[
            { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 50, backgroundColor: 'black' }, 
            animatedOverlayStyle
          ]}
          pointerEvents="none"
        >
          <UView className="flex-1 px-4 pt-2">
            <SkeletonBlock width="100%" height={140} borderRadius={16} className="mb-6" />
            <UView className="flex-row justify-between mb-4 items-center">
              <SkeletonBlock width={120} height={24} borderRadius={4} />
              <SkeletonBlock width={80} height={36} borderRadius={18} />
            </UView>
            <CommitCardSkeleton />
            <CommitCardSkeleton />
            <CommitCardSkeleton />
          </UView>
        </Animated.View>
      )}

      {/* 3. Global Context Menu */}
      <ActionMenu
        visible={menuVisible}
        onClose={closeMenu}
        anchorPosition={menuPosition}
        items={actionMenuItems}
      />

      {/* 4. Global Modals */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete this commitment?"
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor={COLORS.danger}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </UView>
  );
}

import React, { useCallback, useMemo } from "react";
import { View, FlatList, Pressable, Text } from "react-native";
import { useRouter } from "expo-router"; // Essential for navigation
import { withUniwind } from "uniwind";

// UI Components
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { AddButton } from "@/components/ui/button";
import { CommitCard } from "@/components/ui/commits/CommitCard";
import { VerificationCard } from "@/components/ui/commits/VerificationCard";
import { ActionMenu, ActionMenuItem } from "@/components/ui/commits/ActionMenu";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";
import { CommitCardSkeleton } from '@/components/ui/skeletons/CommitCardSkeleton';

// Extracted Domain Logic Hooks
import { useTasks, Task } from "@/hooks/commits/useTasks";
import { useTaskActions } from "@/hooks/commits/useTaskActions";
import { useTaskSelection, AnchorPosition } from "@/hooks/commits/useTaskSelection";
import { DEFAULT_TASKS } from "@/data/defaults";

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
  | "schedules_empty";

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
 * Commits Screen (`/app/(main)/commits.tsx`)
 * 
 * This is the primary landing screen for the application. It displays the user's list of 
 * active commitments (tasks). 
 * 
 * ARCHITECTURE OVERVIEW:
 * To maintain 60fps scrolling performance, this screen employs a strict "Container/Presentational" 
 * hybrid architecture and utilizes a heterogeneous `FlatList`.
 * 
 * 1. FlatList Optimization:
 *    Instead of rendering a ScrollView with nested `.map()` loops (which destroys memory on long lists),
 *    we flatten all UI elements (Headers, the Verification Quick-Action Card, and the Tasks themselves) 
 *    into a single 1D array of `ListItem` objects. `FlatList` then virtualizes this, only rendering
 *    what is visible on screen.
 * 
 * 2. Hook Extraction (Separation of Concerns):
 *    - Data Fetching: `useTasks` handles all Convex backend subscriptions and local caching.
 *    - Actions/Mutations: `useTaskActions` manages creation, editing, and deletion logic.
 *    - UI State: `useTaskSelection` manages context menus and modal anchors.
 *    By extracting these, this component file remains purely focused on rendering and layout.
 */
export default function CommitsScreen() {
  const router = useRouter();

  // 1. Data Layer
  const { tasks: sortedTasks, isLoading, hasTasks, session } = useTasks();

  // 2. Action Layer
  const { handleCreateNew, handleEditTask, deleteTask, setDraft, resetDraft } = useTaskActions();

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

  // 4. Visual Layer (Skeleton logic moved to list render)

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

    if (isLoading) {
      items.push({ type: "schedules_empty", subId: "loading" });
    } else if (hasTasks) {
      sortedTasks.forEach((task) => {
        items.push({
          type: "task_item",
          subId: task._id,
          data: task,
        });
      });
    } else {
      // Use DEFAULT_TASKS when empty
      DEFAULT_TASKS.forEach((task) => {
        items.push({
          type: "task_item",
          subId: task._id,
          data: task,
        });
      });
    }

    return items;
  }, [hasTasks, sortedTasks]);

  /**
   * Indices for sticky section headers.
   * 1 = CommitTs Header
   * N = Templates Header (dynamic based on task count)
   */
  const stickyHeaderIndices = useMemo(() => {
    return [1];
  }, []);

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
            <UView className="bg-black px-4 p-2">
              <CommitCard
                title={item.data.title}
                conditions={item.data.conditions?.length ?? 0}
                iconName="book"
                statusLabel={item.data.status === "active" ? "Active" : "Done"}
                onPress={() => {
                  if (item.data!._id.startsWith("default_")) {
                    // Treat as template/example: Create new from this
                    if (!session?.user?.id) return;
                    resetDraft();
                    setDraft({
                      ...item.data!,
                      _id: undefined, // Clear fake ID
                      id: undefined,
                      assigner_id: session.user.id,
                      assignee_id: session.user.id,
                    });
                    router.push("/(create-commit)/final");
                  } else {
                    handleEditTask(item.data!);
                  }
                }}
                onOptionsPress={(pos) => openMenu(item.data!, pos)}
              />
            </UView>
          ) : null;
        case "schedules_empty":
          // Only used for loading skeletons now
          return (
            <UView className="w-full px-4 pt-2">
               <CommitCardSkeleton />
               <CommitCardSkeleton />
               <CommitCardSkeleton />
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
      
      {/* 2. Skeleton Overlay (Removed) */}

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

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState, useEffect } from "react";
import { FlatList, View, Pressable, Text } from "react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  runOnJS 
} from 'react-native-reanimated';
import { withUniwind } from "uniwind";
import { useQuery, useMutation } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import type { Doc, Id } from "@commit/backend/convex/_generated/dataModel";

import { HeaderTitle } from "@/components/ui/text";
import { ScreenHeader } from "@/components/ui/ScreenContainer";
import { AddButton } from "@/components/ui/button";
import { CommitCard } from "@/components/ui/commits/CommitCard";
import { VerificationCard } from "@/components/ui/commits/VerificationCard";
import { ActionMenu, ActionMenuItem } from "@/components/ui/commits/ActionMenu";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";
import { authClient } from "@/lib/auth-client";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";
import { CommitCardSkeleton } from '@/components/ui/skeletons/CommitCardSkeleton';
import { SkeletonBlock } from '@/components/ui/skeletons/SkeletonBlock';

// ─────────────────────────────────────────────────────────────────────────────
// Styled Components
// ─────────────────────────────────────────────────────────────────────────────

const UView = withUniwind(View);
const UText = withUniwind(Text);
const UPressable = withUniwind(Pressable);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Task document from backend */
type Task = Doc<"tasks">;

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

/** Position for anchor-based components (menus, tooltips) */
interface AnchorPosition {
  x: number;
  y: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** App color palette */
const COLORS = {
  primary: "#4FA0FF",
  danger: "#FF3B30",
  success: "#4CD964",
  textMuted: "#6B7280",
} as const;

/** FlatList layout constants */
const LAYOUT = {
  bottomPadding: 80,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sort tasks by most recently updated (or created if never updated).
 * Uses `updated_at` as primary sort key, falling back to `created_at`.
 *
 * @param tasks - Array of tasks to sort
 * @returns New array sorted by most recent first
 */
function sortTasksByRecent(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aTime = a.updated_at ?? a.created_at ?? 0;
    const bTime = b.updated_at ?? b.created_at ?? 0;
    return bTime - aTime; // Descending: newest first
  });
}

/**
 * Generate unique key for FlatList items.
 */
function getItemKey(item: ListItem): string {
  return `${item.type}-${item.subId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CommitsScreen() {
  const router = useRouter();

  // ─────────────────────────────────────────────────────────────────────────
  // Auth & Store Selectors
  // ─────────────────────────────────────────────────────────────────────────

  const { data: session } = authClient.useSession();
  const setAssigner = useTaskDraftStore((state) => state.setAssigner);
  const setAssignee = useTaskDraftStore((state) => state.setAssignee);
  const resetDraft = useTaskDraftStore((state) => state.resetDraft);
  const setDraft = useTaskDraftStore((state) => state.setDraft);

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching & Mutations
  // ─────────────────────────────────────────────────────────────────────────

  const tasks = useQuery(api.api.commitments.read.byAssignee, session?.user?.id ? { assignee_id: session.user.id } : "skip");
  const removeTask = useMutation(api.api.commitments.delete.default);

  // ─────────────────────────────────────────────────────────────────────────
  // Local State
  // ─────────────────────────────────────────────────────────────────────────

  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [menuPosition, setMenuPosition] = useState<AnchorPosition>({ x: 0, y: 0 });
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Animated skeleton state
  const [showSkeleton, setShowSkeleton] = useState(true);
  const skeletonOpacity = useSharedValue(1);

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  useEffect(() => {
    // Keep skeleton for 4 seconds, then fade out
    const timer = setTimeout(() => {
      skeletonOpacity.value = withTiming(0, { duration: 800 }, (finished) => {
        if (finished) {
          runOnJS(setShowSkeleton)(false);
        }
      });
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Computed Values
  // ─────────────────────────────────────────────────────────────────────────

  /** Whether we have any tasks to display */
  const hasTasks = Boolean(tasks && tasks.length > 0);

  /** Whether tasks are still loading from backend */
  const isLoading = tasks === undefined;

  /** Tasks sorted by most recently updated/created */
  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    return sortTasksByRecent(tasks);
  }, [tasks]);

  /**
   * Build the FlatList data array with all sections.
   * Tasks are injected as individual items for virtualized rendering.
   */
  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [
      { type: "quick", subId: "quick" },
      { type: "schedules_title", subId: "title" },
    ];

    if (hasTasks) {
      // Add sorted tasks as individual items
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
   * - Index 1: "CommitTs" header (schedules_title)
   * - Last header: "Templates" header
   */
  const stickyHeaderIndices = useMemo(() => {
    const schedulesIndex = 1;
    const templatesIndex = hasTasks ? sortedTasks.length + 2 : 3;
    return [schedulesIndex, templatesIndex];
  }, [hasTasks, sortedTasks.length]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Navigate to create new commitment screen.
   */
  const handleCreateNew = useCallback(() => {
    if (!session?.user?.id) return;

    resetDraft();
    setAssigner(session.user.id);
    setAssignee(session.user.id);
    router.push("/(create-commit)/final");
  }, [session?.user?.id, resetDraft, setAssigner, setAssignee, router]);

  /**
   * Navigate to edit an existing task.
   */
  const handleEditTask = useCallback(
    (task: Task) => {
      setDraft({
        ...task,
        id: task._id,
      });
      router.push("/(create-commit)/final");
    },
    [setDraft, router]
  );

  /**
   * Open action menu for a task.
   */
  const handleOpenMenu = useCallback((task: Task, position: AnchorPosition) => {
    setSelectedTask(task);
    setMenuPosition(position);
    setMenuVisible(true);
  }, []);

  /**
   * Close the action menu.
   */
  const handleCloseMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  /**
   * Show delete confirmation modal.
   */
  const handleDeleteRequest = useCallback(() => {
    setMenuVisible(false);
    setDeleteModalVisible(true);
  }, []);

  /**
   * Confirm and execute task deletion.
   */
  const handleDeleteConfirm = useCallback(async () => {
    if (selectedTask?._id) {
      await removeTask({ id: selectedTask._id });
    }
    setDeleteModalVisible(false);
    setSelectedTask(null);
  }, [selectedTask, removeTask]);

  /**
   * Cancel delete operation.
   */
  const handleDeleteCancel = useCallback(() => {
    setDeleteModalVisible(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Action Menu Configuration
  // ─────────────────────────────────────────────────────────────────────────

  const actionMenuItems: ActionMenuItem[] = useMemo(
    () => [
      {
        icon: "pause-circle-outline",
        label: "Pause",
        onPress: () => {
          // TODO: Implement pause functionality
          console.log("[CommitsScreen] Pause task:", selectedTask?._id);
        },
      },
      {
        icon: "content-copy",
        label: "Duplicate",
        onPress: () => {
          // TODO: Implement duplicate functionality
          console.log("[CommitsScreen] Duplicate task:", selectedTask?._id);
        },
      },
      {
        icon: "delete-outline",
        label: "Delete",
        color: COLORS.danger,
        onPress: handleDeleteRequest,
      },
    ],
    [selectedTask, handleDeleteRequest]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render Functions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Render the app header with branding and verification card.
   */
  /**
   * Render the app header with branding and verification card.
   * REMOVED: Branding is now in _layout.tsx
   */
  const renderQuickSection = useCallback(
    () => (
      <UView className="bg-black px-4 pb-2">
          {/* Header moved to _layout.tsx */}
          <VerificationCard className="mt-0" onPress={() => router.push("/verify")} />
      </UView>
    ),
    [router]
  );

  /**
   * Render the "CommitTs" section header with add button.
   */
  const renderSchedulesHeader = useCallback(
    () => (
      <UView className="bg-black px-4 py-2 pb-4">
        <UView className="w-full flex-row items-center justify-between">
          <HeaderTitle>CommitTs</HeaderTitle>
          <AddButton onPress={handleCreateNew} />
        </UView>
      </UView>
    ),
    [handleCreateNew]
  );

  /**
   * Render an individual task card.
   */
  const renderTaskItem = useCallback(
    (task: Task) => (
      <UView className="bg-black px-4 pb-4">
        <CommitCard
          title={task.title}
          conditions={task.conditions?.length ?? 0}
          iconName="book"
          statusLabel="Active"
          onPress={() => handleEditTask(task)}
          onOptionsPress={(position) => handleOpenMenu(task, position)}
        />
      </UView>
    ),
    [handleEditTask, handleOpenMenu]
  );

  /**
   * Render empty state when no tasks exist.
   */
  const renderEmptyState = useCallback(
    () => (
      <UView className="bg-black px-4 py-8">
        <HeaderTitle className="text-gray-500 text-center">
          {isLoading ? "Loading..." : "No active commitments found."}
        </HeaderTitle>
      </UView>
    ),
    [isLoading]
  );

  /**
   * Render the "Templates" section header.
   */
  const renderTemplatesHeader = useCallback(
    () => (
      <ScreenHeader className="border-gray-800 border-b">
        <HeaderTitle>Templates</HeaderTitle>
      </ScreenHeader>
    ),
    []
  );

  /**
   * Render the templates content (placeholder for now).
   */
  const renderTemplatesContent = useCallback(
    () => (
      <UView className="gap-4 bg-black px-4 py-4">
        <HeaderTitle className="text-gray-300 text-lg">Template A</HeaderTitle>
        <HeaderTitle className="text-gray-300 text-lg">Template B</HeaderTitle>
        <HeaderTitle className="text-gray-300 text-lg">Template C</HeaderTitle>
      </UView>
    ),
    []
  );

  /**
   * Main render function for FlatList items.
   */
  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      switch (item.type) {
        case "quick":
          return renderQuickSection();
        case "schedules_title":
          return renderSchedulesHeader();
        case "task_item":
          return item.data ? renderTaskItem(item.data) : null;
        case "schedules_empty":
          return renderEmptyState();
        case "templates_title":
          return renderTemplatesHeader();
        case "templates_content":
          return renderTemplatesContent();
        default:
          return null;
      }
    },
    [
      renderQuickSection,
      renderSchedulesHeader,
      renderTaskItem,
      renderEmptyState,
      renderTemplatesHeader,
      renderTemplatesContent,
    ]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <UView className="flex-1 bg-black">
      {/* Main Content List */}
      <FlatList
        data={listData}
        keyExtractor={getItemKey}
        renderItem={renderItem}
        stickyHeaderIndices={stickyHeaderIndices}
        contentContainerStyle={{ paddingBottom: LAYOUT.bottomPadding }}
        showsVerticalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Skeleton Overlay */}
      {showSkeleton && (
        <Animated.View 
          style={[
            { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 50, backgroundColor: 'black' }, 
            animatedOverlayStyle
          ]}
          pointerEvents="none"
        >
          <UView className="flex-1 px-4 pt-2">
            {/* Quick Section Skeleton */}
            <SkeletonBlock width="100%" height={140} borderRadius={16} className="mb-6" />

            {/* CommitTs Header Skeleton */}
            <UView className="flex-row justify-between mb-4 items-center">
              <SkeletonBlock width={120} height={24} borderRadius={4} />
              <SkeletonBlock width={80} height={36} borderRadius={18} />
            </UView>

            {/* Commit Cards */}
            <CommitCardSkeleton />
            <CommitCardSkeleton />
            <CommitCardSkeleton />
          </UView>
        </Animated.View>
      )}

      {/* Context Menu for Task Actions */}
      <ActionMenu
        visible={menuVisible}
        onClose={handleCloseMenu}
        anchorPosition={menuPosition}
        items={actionMenuItems}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete this commitment?"
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor={COLORS.danger}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </UView>
  );
}

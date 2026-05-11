import React, { useCallback, useMemo, useState, useEffect } from "react";
import { View, FlatList, Pressable, Text, ScrollView, LayoutAnimation, Platform, UIManager } from "react-native";
import { useRouter } from "expo-router"; // Essential for navigation
import { withUniwind } from "uniwind";
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { THEME } from "@/constants/theme";

// UI Components
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { AddButton } from "@/components/ui/button";
import { CommitCard } from "@/components/ui/commits/CommitCard";
import { VerificationCard } from "@/components/ui/commits/VerificationCard";
import { ActionMenu, ActionMenuItem } from "@/components/ui/commits/ActionMenu";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";
import { CommitCardSkeleton } from '@/components/ui/skeletons/CommitCardSkeleton';
import { ConditionCard } from "@/components/ui/commits/ConditionCard";


// Extracted Domain Logic Hooks
import { useTasks, Task } from "@/hooks/commits/useTasks";
import { useTaskActions } from "@/hooks/commits/useTaskActions";
import { useTaskSelection, AnchorPosition } from "@/hooks/commits/useTaskSelection";
import { useAccountabilityPrefill } from "@/hooks/useAccountabilityPrefill";
import { useAppDiscovery } from "@/hooks/useAppDiscovery";
import { usePermissions } from "@/hooks/usePermissions";
import { DEFAULT_TASKS } from "@/data/defaults";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration & Stylings
// ─────────────────────────────────────────────────────────────────────────────

const UView = withUniwind(View);
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  | "permission_missing"
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

  // 4. Persistence & Pre-fill Layer
  // 5. App Discovery Trigger
  // Triggers the background fetch of installed apps + PNG icons
  useAppDiscovery();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isWarmupComplete, setIsWarmupComplete] = useState(false);

  // 5. Permission Observation (Debug Log)
  const { permissions, isLoading: isPermissionsLoading } = usePermissions();

  /** 
   * Warmup Logic:
   * Waits for 3 seconds before allowing the "Permissions Missing" card to appear.
   * This prevents UI jank/flashing during the initial boot & audit.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsWarmupComplete(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log("[DEBUG] Current Hardware Permissions Manifest:", JSON.stringify(permissions, null, 2));
  }, [permissions]);

  // 4. Visual Layer (Skeleton logic moved to list render)

  // ─────────────────────────────────────────────────────────────────────────
  // Computations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Prepare data for FlatList.
   * Transforms raw tasks into a heterogeneous list for section rendering.
   */
  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];

    // Check for critical missing permissions (Only After Warmup)
    const isReady =
      permissions.location &&
      permissions.camera &&
      permissions.notifications &&
      permissions.alarms &&
      permissions.overlay &&
      permissions.accessibility &&
      permissions.battery &&
      permissions.admin;

    if (!isReady && isWarmupComplete && !isPermissionsLoading) {
      items.push({ type: "permission_missing" as const, subId: "permissions" });
    }

    items.push(
      { type: "quick", subId: "quick" },
      { type: "schedules_title", subId: "title" }
    );

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
  }, [isLoading, hasTasks, sortedTasks, permissions, isWarmupComplete, isPermissionsLoading]);

  /** 
   * Transition Logic:
   * Reanimated `entering`/`exiting` props handle the internal card fade and slide.
   * `layout={LinearTransition}` is also applied at the loop level.
   */

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
        icon: "delete-outline",
        label: "Delete",
        color: COLORS.danger,
        onPress: requestDelete,
      },
      {
        icon: "lock-outline",
        label: "Lock (Strict Mode)",
        onPress: () => {
          if (selectedTask) {
             router.push({
               pathname: "/(strict-mode)/setup",
               params: { taskId: selectedTask._id, title: selectedTask.title }
             });
          }
          closeMenu();
        },
      },
      {
        icon: "content-copy",
        label: "Duplicate",
        onPress: () => console.log("Duplicate not implemented"),
      },
      {
        icon: "content-copy",
        label: "Copy to...",
        onPress: () => console.log("Copy to not implemented"),
      },
      {
        icon: "help-circle-outline",
        label: "Help & feedback",
        onPress: () => console.log("Help not implemented"),
      },
    ],
    [requestDelete, selectedTask, router]
  );

  const confirmDelete = useCallback(async () => {
    if (selectedTask?._id) {
      setIsDeleting(true);
      try {
        await deleteTask(selectedTask._id);
        clearSelection();
      } finally {
        setIsDeleting(false);
      }
    }
  }, [selectedTask, deleteTask, clearSelection]);



  // ─────────────────────────────────────────────────────────────────────────
  // Render Helpers
  // ─────────────────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      // Check for permission presence to adjust layout spacing
      const hasPermissionWarning = listData.some(i => i.type === "permission_missing");

      switch (item.type) {
        case "permission_missing":
          return (
            <Animated.View 
              entering={FadeInUp.springify().damping(20).stiffness(200).mass(0.8)}
              exiting={FadeOutUp.duration(200)}
              style={{ overflow: 'hidden' }}
            >
              <UView className="px-4 pt-0 pb-0" style={{ backgroundColor: THEME.colors.pureBlack }}>
                <ConditionCard
                  icon="alert-circle-outline"
                  title="Permissions Missing"
                  subtitle="CommitT enforcement is disabled. Tap to fix."
                  iconColor={COLORS.danger}
                  className="border-[3px] border-[#FF3B30] bg-[#1A1A1A]"
                  onPress={() => router.navigate("/(settings)/permissions")}
                  showArrow={true}
                />
              </UView>
            </Animated.View>
          );
        case "quick":
          return (
             <UView className={`px-4 pb-2 ${hasPermissionWarning ? "pt-0" : "pt-4"}`} style={{ backgroundColor: THEME.colors.pureBlack }}>
                <VerificationCard className="mt-0" onPress={() => router.push("/verify")} />
            </UView>
          );
        case "schedules_title":
          return (
            <UView className="px-4 py-2 pb-1" style={{ backgroundColor: THEME.colors.pureBlack }}>
              <UView className="w-full flex-row items-center justify-between">
                <HeaderTitle>CommitTs</HeaderTitle>
                <AddButton onPress={() => session?.user?.id && handleCreateNew(session.user.id)} />
              </UView>
            </UView>
          );
        case "task_item":
          return item.data ? (
            <UView className="px-4 p-2" style={{ backgroundColor: THEME.colors.pureBlack }}>
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
    [session, handleCreateNew, handleEditTask, openMenu, isLoading, router, listData, permissions]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <UView className="flex-1" style={{ backgroundColor: THEME.colors.pureBlack }}>
      {/* 1. Main Content List (Unified Scroll Element) */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: LAYOUT.bottomPadding }}
      >
        {listData.map((item: ListItem) => (
          <Animated.View 
            key={getItemKey(item)}
            layout={LinearTransition.springify().damping(22).stiffness(200).mass(0.5)}
          >
            {renderItem({ item })}
          </Animated.View>
        ))}
      </ScrollView>
      
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
        isLoading={isDeleting}
      />

    </UView>
  );
}


import "@/global.css";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { HeroUINativeProvider } from "heroui-native";
import { Pressable, Text, Alert, ScrollView, Modal, View } from "react-native";
import { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { LOCAL_DB_NAME, migrateDbIfNeeded } from "@/lib/local-db";
import { env } from "@commit/env/native";
import { showTasksToast } from "@/modules/alarm-module";

const convexUrl = env.EXPO_PUBLIC_CONVEX_URL;
const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

function StackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
        animationDuration: 250,
      }}
    >
      <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
      <Stack.Screen name="(penalties)" options={{ animation: "fade" }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
    </Stack>
  );
}

/** 🔍 Floating debug button — shows local DB contents */
function DbDebugFab() {
  const db = useSQLiteContext();
  const [visible, setVisible] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [orphanedInstances, setOrphanedInstances] = useState<any[]>([]);

  const inspect = async () => {
    try {
      const allTasks = await db.getAllAsync('SELECT * FROM local_tasks');
      // @ts-ignore
      const enhancedTasks = await Promise.all(
        (allTasks as any[]).map(async (task) => {
          const instances = await db.getAllAsync(
            'SELECT * FROM task_instances WHERE task_id = ? ORDER BY start_time ASC',
            [task.id]
          );
          return { ...task, instances };
        })
      );

      // Find orphaned instances (edited instances that survived task deletion)
      const orphans = await db.getAllAsync(
        `SELECT * FROM task_instances 
         WHERE task_id NOT IN (SELECT id FROM local_tasks) 
         ORDER BY start_time DESC`
      );

      setRows(enhancedTasks);
      setOrphanedInstances(orphans as any[]);
      setVisible(true);
      console.log(`📦 Local DB: ${enhancedTasks.length} tasks, ${(orphans as any[]).length} orphaned (preserved) instances`);
    } catch (e) {
      Alert.alert('DB Error', String(e));
    }
  };

  return (
    <>
      <Pressable
        onPress={inspect}
        style={{
          position: 'absolute',
          bottom: 160,
          right: 16,
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: '#FF9500',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        }}
      >
        <Text style={{ fontSize: 20 }}>🔍</Text>
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', paddingTop: 60, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: '#FF9500', fontSize: 18, fontWeight: 'bold' }}>
              📦 local_tasks ({rows.length})
            </Text>
            <Pressable onPress={() => setVisible(false)}>
              <Text style={{ color: '#FF3B30', fontSize: 16, fontWeight: 'bold' }}>Close ✕</Text>
            </Pressable>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {rows.length === 0 ? (
              <Text style={{ color: '#888', fontSize: 14 }}>No rows in local_tasks</Text>
            ) : (
              rows.map((row: any, i: number) => {
                const prettyJson = (raw: string) => {
                  try { return JSON.stringify(JSON.parse(raw), null, 2); }
                  catch { return raw; }
                };
                return (
                <View
                  key={row.id || i}
                  style={{
                    backgroundColor: '#1a1a1a',
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 10,
                    borderLeftWidth: 3,
                    borderLeftColor: '#4FA0FF',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15, marginBottom: 6 }}>
                    {row.title}
                  </Text>

                  <View style={{ flexDirection: 'row', marginBottom: 3 }}>
                    <Text style={{ color: '#FF9500', fontSize: 11, fontWeight: '600' }}>convex_id  </Text>
                    <Text style={{ color: '#ccc', fontSize: 11, flex: 1 }} selectable>{row.convex_id}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', marginBottom: 3 }}>
                    <Text style={{ color: '#FF9500', fontSize: 11, fontWeight: '600' }}>visibility </Text>
                    <Text style={{ color: '#ccc', fontSize: 11 }}>{row.visibility}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', marginBottom: 3 }}>
                    <Text style={{ color: '#FF9500', fontSize: 11, fontWeight: '600' }}>assigner   </Text>
                    <Text style={{ color: '#ccc', fontSize: 11, flex: 1 }} selectable>{row.assigner_id}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                    <Text style={{ color: '#FF9500', fontSize: 11, fontWeight: '600' }}>assignee   </Text>
                    <Text style={{ color: '#ccc', fontSize: 11, flex: 1 }} selectable>{row.assignee_id}</Text>
                  </View>

                  <Text style={{ color: '#4FA0FF', fontSize: 11, fontWeight: '600', marginBottom: 2 }}>recurrence</Text>
                  <View style={{ backgroundColor: '#111', borderRadius: 6, padding: 8, marginBottom: 6 }}>
                    <Text style={{ color: '#8BC34A', fontSize: 10, fontFamily: 'monospace' }}>
                      {prettyJson(row.recurrence_json)}
                    </Text>
                  </View>

                  <Text style={{ color: '#4FA0FF', fontSize: 11, fontWeight: '600', marginBottom: 2 }}>conditions</Text>
                  <View style={{ backgroundColor: '#111', borderRadius: 6, padding: 8, marginBottom: 6 }}>
                    <Text style={{ color: '#8BC34A', fontSize: 10, fontFamily: 'monospace' }}>
                      {prettyJson(row.conditions_json)}
                    </Text>
                  </View>

                  <Text style={{ color: '#4FA0FF', fontSize: 11, fontWeight: '600', marginBottom: 2 }}>config</Text>
                  <View style={{ backgroundColor: '#111', borderRadius: 6, padding: 8, marginBottom: 6 }}>
                    <Text style={{ color: '#8BC34A', fontSize: 10, fontFamily: 'monospace' }}>
                      {prettyJson(row.config_json)}
                    </Text>
                  </View>

                  {row.instances && row.instances.length > 0 && (
                    <>
                      <Text style={{ color: '#4FA0FF', fontSize: 11, fontWeight: '600', marginBottom: 2 }}>
                        Instances ({row.instances.length} scheduled)
                      </Text>
                      <View style={{ backgroundColor: '#111', borderRadius: 6, padding: 8, marginBottom: 6, maxHeight: 200 }}>
                        <ScrollView nestedScrollEnabled>
                          {row.instances.slice(0, 3).map((inst: any, idx: number) => (
                            <View key={inst.id || idx} style={{ marginBottom: 10 }}>
                              <Text style={{ color: '#8BC34A', fontSize: 10, fontFamily: 'monospace', marginBottom: 4 }}>
                                [{idx + 1}] {row.title} — {new Date(inst.start_time).toLocaleString()}
                              </Text>
                              <View style={{ backgroundColor: '#0a0a0a', padding: 6, borderRadius: 4 }}>
                                <Text style={{ color: '#aaa', fontSize: 9, fontFamily: 'monospace' }}>
                                  {JSON.stringify(inst, null, 2)}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    </>
                  )}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ color: '#555', fontSize: 10 }}>
                      created: {new Date(row.created_at).toLocaleString()}
                    </Text>
                    <Text style={{ color: '#555', fontSize: 10 }}>
                      synced: {row.synced_at ? new Date(row.synced_at).toLocaleString() : 'never'}
                    </Text>
                  </View>
                </View>
                );
              })
            )}

            {/* ── Orphaned (Preserved) Instances ── */}
            {orphanedInstances.length > 0 && (
              <>
                <View style={{ marginTop: 16, marginBottom: 8 }}>
                  <Text style={{ color: '#FF9500', fontSize: 16, fontWeight: 'bold' }}>
                    🛡️ Preserved Instances ({orphanedInstances.length})
                  </Text>
                  <Text style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                    Edited instances that survived task deletion
                  </Text>
                </View>
                {orphanedInstances.map((inst: any, idx: number) => (
                  <View
                    key={inst.id || idx}
                    style={{
                      backgroundColor: '#1a1a1a',
                      borderRadius: 10,
                      padding: 14,
                      marginBottom: 10,
                      borderLeftWidth: 3,
                      borderLeftColor: '#FF9500',
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>
                      {inst.title || 'Untitled'} — {inst.status}
                    </Text>
                    <Text style={{ color: '#FF9500', fontSize: 10, marginBottom: 4 }}>
                      {new Date(inst.start_time).toLocaleString()} → {new Date(inst.end_time).toLocaleString()}
                    </Text>
                    <View style={{ backgroundColor: '#0a0a0a', padding: 6, borderRadius: 4 }}>
                      <Text style={{ color: '#aaa', fontSize: 9, fontFamily: 'monospace' }}>
                        {JSON.stringify(inst, null, 2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

/** 🔔 Floating Alarm button — accessible from every screen */
function AlarmFab() {
  const handleAlarmPress = () => {
    console.log("[Alarm] Alarm button pressed!");
    try {
      showTasksToast();
    } catch (e) {
      console.error("[Alarm] Error calling native module:", e);
      Alert.alert("AlarmModule Error", String(e));
    }
  };

  return (
    <Pressable
      onPress={handleAlarmPress}
      style={{
        position: 'absolute',
        bottom: 220,
        right: 16,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#4FA0FF',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      }}
    >
      <Text style={{ fontSize: 20 }}>🔔</Text>
    </Pressable>
  );
}

export default function Layout() {
  return (
    <SQLiteProvider databaseName={LOCAL_DB_NAME} onInit={migrateDbIfNeeded}>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <AppThemeProvider>
              <HeroUINativeProvider>
                <StackLayout />
                <DbDebugFab />
                <AlarmFab />
              </HeroUINativeProvider>
            </AppThemeProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </ConvexBetterAuthProvider>
    </SQLiteProvider>
  );
}

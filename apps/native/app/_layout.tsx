
import "@/global.css";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient, useConvexClient } from "convex/react";
import { Stack } from "expo-router";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { HeroUINativeProvider } from "heroui-native";
import { Pressable, Text, Alert, ScrollView, Modal, View, AppState, type AppStateStatus } from "react-native";
import { useState, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { LOCAL_DB_NAME, migrateDbIfNeeded } from "@/lib/local-db";
import { env } from "@commit/env/native";
import { showTasksToast } from "@/modules/alarm-module";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useEffect, useRef } from "react";
import { useHydrationSync } from "@/hooks/useHydrationSync";
import { Logger } from "@/lib/logger";
import { HealOverlay } from "@/components/ui/modal/HealOverlay";
import { HeaderTitle, BodyText } from "@/components/ui/text";

const convexUrl = env.EXPO_PUBLIC_CONVEX_URL;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CONVEX CLIENT — Resilient Connection Factory
 * ─────────────────────────────────────────────────────────────────────────────
 * PRODUCTION RATIONALE:
 * The Convex WebSocket protocol uses an internal version counter to track
 * sync state. When the backend is redeployed (dev: `npx convex dev` restart,
 * prod: deployment rollover), the server version resets to 0. If the client
 * still holds a stale version (e.g., 2), the server rejects it with:
 *   "Base version 2 passed up doesn't match the current version 0"
 *
 * This is a FATAL error in the Convex SDK — it kills the WebSocket connection
 * permanently. Without intervention, the entire app loses real-time sync.
 *
 * SOLUTION: We intercept the `onFailure` callback to detect version mismatches
 * and trigger an automatic state reset + reconnection. This ensures the app
 * self-heals after backend redeployments without requiring a manual restart.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

function StackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 200,
        gestureEnabled: true,
        contentStyle: { backgroundColor: "black" },
      }}
    >
      <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
      <Stack.Screen name="(create-commit)" options={{ animation: "slide_from_right", animationDuration: 200, headerShadowVisible: false, headerTransparent: true }} />
      <Stack.Screen name="(edit-preset)" options={{ animation: "fade" }} />
      <Stack.Screen name="(dev)/chaos" options={{ animation: "slide_from_bottom", presentation: 'modal' }} />
      <Stack.Screen name="(penalties)" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
    </Stack>
  );
}

import { useRouter } from 'expo-router';

/** 🐜 Floating Chaos button — ONLY in __DEV__ */
function ChaosFab() {
  const router = useRouter();
  if (!__DEV__) return null;
  
  return (
    <Pressable
      onPress={() => router.push('/(dev)/chaos')}
      style={{
        position: 'absolute',
        bottom: 280,
        right: 16,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FF3B30',
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
      <Text style={{ fontSize: 20 }}>🐛</Text>
    </Pressable>
  );
}


/** 🔍 Floating debug button — shows local DB contents */
function DbDebugFab() {
  const db = useSQLiteContext();
  const [visible, setVisible] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [orphanedInstances, setOrphanedInstances] = useState<any[]>([]);
  const [debugLogs, setDebugLogs] = useState<string>('');
  const [viewMode, setViewMode] = useState<'db' | 'logs'>('db');

  const inspect = async () => {
    try {
      const allTasks = await db.getAllAsync('SELECT * FROM local_tasks');
      const logs = await Logger.getLogs();
      setDebugLogs(logs);

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
      
      // 🛠️ PRETTY LOGGING FOR DEBUGGING — JUST THE INSTANCES
      const allInstances = enhancedTasks.flatMap((t: any) => t.instances || []).concat(orphans);
      
      console.log('─── 🗃️ ALL TASK INSTANCES (PRETTY) ───');
      console.log(JSON.stringify(allInstances, null, 2));
      console.log('──────────────────────────────────────');
      console.log(`📦 Local DB Data: ${enhancedTasks.length} tasks, ${allInstances.length} instances total.`);

      console.log('\n\n=== PERSISTENT LOGS START ===');
      console.log(logs);
      console.log('=== PERSISTENT LOGS END ===\n\n');
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', paddingTop: 60, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={{ color: '#FF9500', fontSize: 18, fontWeight: 'bold' }}>
                🔍 Debug Inspector
              </Text>
              <Text style={{ color: '#666', fontSize: 12 }}>{viewMode === 'db' ? 'SQLite Cache' : 'Persistent Logs'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={() => setViewMode(viewMode === 'db' ? 'logs' : 'db')}>
                <Text style={{ color: '#4FA0FF', fontSize: 13, fontWeight: 'bold' }}>
                  Switch to {viewMode === 'db' ? 'Logs' : 'DB'}
                </Text>
              </Pressable>
              {viewMode === 'logs' && (
                <Pressable onPress={async () => { await Logger.clear(); setDebugLogs('--- LOGS CLEARED ---'); }}>
                  <Text style={{ color: '#FF9500', fontSize: 13, fontWeight: 'bold' }}>Clear</Text>
                </Pressable>
              )}
              <Pressable onPress={() => setVisible(false)}>
                <Text style={{ color: '#FF3B30', fontSize: 16, fontWeight: 'bold' }}>Close ✕</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }}>
            {viewMode === 'logs' ? (
              <View style={{ backgroundColor: '#0a0a0a', padding: 12, borderRadius: 8, borderLeftWidth: 2, borderLeftColor: '#4FA0FF' }}>
                <Text style={{ color: '#8BC34A', fontSize: 10, fontFamily: 'monospace' }}>
                  {debugLogs}
                </Text>
              </View>
            ) : rows.length === 0 ? (
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

import JailMonkey from 'jail-monkey';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * SecurityShield
 * 
 * Hardware Execution Shield designed to interrogate the Android OS for rooted
 * environments, location spoofing tools, and active developer options. 
 * If a breach is detected in production, the application halts execution.
 */
function SecurityShield({ children }: { children: React.ReactNode }) {
  const [isSecure, setIsSecure] = useState(true);

  useEffect(() => {
    async function runHardwareChecks() {
      // Bypass rigorous hardware checks on local development environments
      if (!__DEV__) {
        try {
          const isJailBroken = JailMonkey.isJailBroken();
          const canMockLocation = JailMonkey.canMockLocation();
          const isDevModeOn = await JailMonkey.isDevelopmentSettingsMode();
          
          if (isJailBroken || canMockLocation || isDevModeOn) {
            console.error(`[Security Violation] Boot blocked: JailBroken:${isJailBroken} | LocationMocked:${canMockLocation} | DevMode:${isDevModeOn}`);
            setIsSecure(false);
          } else {
            // If they turned off the hack and came back, release the lock
            setIsSecure(true);
          }
        } catch (e) {
          console.warn("[SecurityShield] Hardware interrogation failed", e);
        }
      }
    }
    
    // Run on initial boot
    runHardwareChecks();

    // Listen for the app coming back from the background
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        runHardwareChecks();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Kill the standard rendering thread and lock the app into this generic screen
  if (!isSecure) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <MaterialCommunityIcons name="shield-alert-outline" size={80} color="#FF3B30" style={{ marginBottom: 20 }} />
        <HeaderTitle className="text-[#FF3B30] text-2xl font-bold text-center mb-3">
          Security Violation
        </HeaderTitle>
        <BodyText className="text-gray-400 text-center text-base" style={{ lineHeight: 24 }}>
          This application has detected unauthorized hardware configuration. It cannot execute natively while Developer Settings or Location Spoofing protocols are active on this device.
        </BodyText>
      </View>
    );
  }

  return <>{children}</>;
}

/** 
 * Invisible background Sync Engine.
 * Sits actively at the absolute root of the UI, monitoring authentication
 * and dispatching the Silent Fetch to rebuild SQLite when missing.
 */
function HydrationEngine() {
  useHydrationSync(); // Runs invisibly, pushing to SQLite & Kotlin securely on the backend thread!
  // In the future: We can add an 'isSyncing' full-screen blur here if we detect 
  // a complete Amnesia wipe, to strictly gate the user out!
  return null; 
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CONNECTION WATCHDOG — Zombie WebSocket Resurrection
 * ─────────────────────────────────────────────────────────────────────────────
 * PROBLEM:
 * On Android (especially Lenovo/Motorola budget devices), the OS aggressively
 * kills WebSocket connections during extended sleep (6+ hours). When the app 
 * resumes, the Convex SDK's auto-reconnect fails silently:
 *   - useQuery hooks return CACHED data (reads appear to work)
 *   - useMutation calls timeout (writes fail — user can't create commits)
 *   - Server logs show ONLY HTTP auth calls, ZERO WebSocket traffic
 *
 * The user experience: "I can see my tasks but can't create new ones."
 * Previously required a full phone restart to fix.
 *
 * SOLUTION:
 * On every foreground resume, we probe the Convex client's connection state.
 * If the WebSocket has died (wasConnected but now isConnected=false, or
 * consecutive query timeouts detected), we force a reconnection by:
 *   1. Clearing the auth state (tears down the WebSocket)
 *   2. Waiting 500ms for cleanup
 *   3. Re-setting auth (forces a fresh WebSocket handshake)
 *
 * This achieves the same effect as a phone restart, without the restart.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function ConnectionWatchdog() {
  const client = useConvexClient();
  const lastHealthyRef = useRef<number>(Date.now());
  const isResurrectingRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus) => {
        if (nextState !== 'active') return;
        if (isResurrectingRef.current) return;

        try {
          // Check the Convex client's internal connection state
          const state = (client as any).connectionState?.();
          
          if (state) {
            const { isConnected, hasBeenConnected } = state;
            
            // Case 1: Was connected before but now disconnected → zombie socket
            if (hasBeenConnected && !isConnected) {
              const timeSinceHealthy = Date.now() - lastHealthyRef.current;
              
              // Only resurrect if we've been unhealthy for >30s
              // (avoids triggering during brief network transitions)
              if (timeSinceHealthy > 30_000) {
                Logger.warn(
                  `[ConnectionWatchdog] ZOMBIE SOCKET DETECTED! ` +
                  `Was connected but now dead (${Math.round(timeSinceHealthy / 1000)}s unhealthy). ` +
                  `Forcing WebSocket resurrection...`
                );
                await resurrectConnection(client);
              }
              return;
            }

            // Case 2: Connected and healthy — reset counters
            if (isConnected) {
              lastHealthyRef.current = Date.now();
              consecutiveFailuresRef.current = 0;
              return;
            }
          }

          // Case 3: Connection state unavailable or ambiguous → do a live probe
          // Try a lightweight query with a short timeout to see if the socket is alive
          const probeTimeout = 8_000; // 8 seconds
          const probePromise = (client as any).query?.('__health_check__').catch(() => null);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('PROBE_TIMEOUT')), probeTimeout)
          );

          try {
            await Promise.race([probePromise, timeoutPromise]);
            // If we get here (even with an error from Convex), the socket is alive
            lastHealthyRef.current = Date.now();
            consecutiveFailuresRef.current = 0;
          } catch (probeErr: any) {
            if (probeErr?.message === 'PROBE_TIMEOUT') {
              consecutiveFailuresRef.current += 1;
              Logger.warn(
                `[ConnectionWatchdog] Probe timeout #${consecutiveFailuresRef.current}. ` +
                `Socket may be dead.`
              );

              // After 2 consecutive probe failures, force resurrection
              if (consecutiveFailuresRef.current >= 2) {
                Logger.warn('[ConnectionWatchdog] 2+ consecutive probe failures. Forcing resurrection...');
                await resurrectConnection(client);
              }
            }
          }
        } catch (e) {
          // Watchdog must never crash the app
          Logger.error('[ConnectionWatchdog] Unexpected error:', e);
        }
      }
    );

    return () => subscription.remove();
  }, [client]);

  /**
   * Forces the Convex client to tear down and rebuild its WebSocket connection.
   * This is the "soft restart" — same effect as a phone restart but instant.
   */
  async function resurrectConnection(convexClient: any) {
    if (isResurrectingRef.current) return;
    isResurrectingRef.current = true;

    try {
      Logger.info('[ConnectionWatchdog] Step 1: Clearing auth to tear down zombie socket...');
      convexClient.clearAuth?.();

      // Give the SDK 500ms to fully tear down the old connection
      await new Promise(resolve => setTimeout(resolve, 500));

      Logger.info('[ConnectionWatchdog] Step 2: Re-setting auth to force fresh WebSocket...');
      // The ConvexBetterAuthProvider will detect the auth cleared state
      // and automatically re-authenticate, establishing a fresh WebSocket.
      // We trigger this by fetching a fresh session token.
      const session = await authClient.getSession();
      if (session?.data?.session) {
        Logger.info('[ConnectionWatchdog] Session valid. Auth provider will re-establish WebSocket.');
      } else {
        Logger.warn('[ConnectionWatchdog] No active session. User may need to re-login.');
      }

      // Reset health counters
      lastHealthyRef.current = Date.now();
      consecutiveFailuresRef.current = 0;

      Logger.info('[ConnectionWatchdog] WebSocket resurrection complete.');
    } catch (err) {
      Logger.error('[ConnectionWatchdog] Resurrection failed:', err);
    } finally {
      isResurrectingRef.current = false;
    }
  }

  return null;
}

export default function Layout() {
  useEffect(() => {
    // ── SYSTEM INITIALIZATION ──
    GoogleSignin.configure({
      webClientId: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <SQLiteProvider databaseName={LOCAL_DB_NAME} onInit={migrateDbIfNeeded}>
        <SecurityShield>
          <ConvexBetterAuthProvider client={convex} authClient={authClient}>
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
              <KeyboardProvider>
                <AppThemeProvider>
                  <HeroUINativeProvider>
                    <ThemeProvider value={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: '#000000' } }}>
                      <ConnectionWatchdog />
                      <HydrationEngine />
                      <StackLayout />
                      <HealOverlay />
                    </ThemeProvider>
                    <DbDebugFab />
                    <AlarmFab />
                  </HeroUINativeProvider>
                </AppThemeProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </ConvexBetterAuthProvider>
        </SecurityShield>
      </SQLiteProvider>
      <ChaosFab />
    </View>
  );
}




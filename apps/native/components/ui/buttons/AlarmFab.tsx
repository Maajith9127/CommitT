import { Pressable, Text, Alert } from "react-native";
import { showTasksToast } from "@/modules/alarm-module";

/** 🔔 Floating Alarm button — accessible from every screen */
export function AlarmFab() {
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

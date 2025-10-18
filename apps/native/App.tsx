import { MonitoringDashboard } from "monitoring-mobile";
import { View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <MonitoringDashboard />
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
};

// Simple test to verify module exports
const MonitoringMobile = require("./build/index.js");

console.log("Module exports:", Object.keys(MonitoringMobile));

// Test that we can access the main module
console.log("Default export:", typeof MonitoringMobile.default);

// Test component exports
console.log(
  "MonitoringDashboard:",
  typeof MonitoringMobile.MonitoringDashboard
);
console.log(
  "ServiceToggleButton:",
  typeof MonitoringMobile.ServiceToggleButton
);
console.log(
  "ServiceStatusIndicator:",
  typeof MonitoringMobile.ServiceStatusIndicator
);
console.log("PermissionChecker:", typeof MonitoringMobile.PermissionChecker);
console.log("EventLogViewer:", typeof MonitoringMobile.EventLogViewer);

console.log("✅ Module test completed successfully!");

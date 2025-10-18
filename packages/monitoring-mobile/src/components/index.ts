// Main dashboard component

// Types
export type { LogEntry } from "./monitoring/hooks/useEventLogs";
export { useEventLogs } from "./monitoring/hooks/useEventLogs";
// Hooks
export { useMonitoringService } from "./monitoring/hooks/useMonitoringService";
export { usePermissionStatus } from "./monitoring/hooks/usePermissionStatus";
export { EventItem } from "./monitoring/LogViewer/EventItem";

// Log viewer components
export { EventLogViewer } from "./monitoring/LogViewer/EventLogViewer";
export { MonitoringDashboard } from "./monitoring/MonitoringDashboard";
// Permission components
export { PermissionChecker } from "./monitoring/Permissions/PermissionChecker";
export { PermissionRequestButton } from "./monitoring/Permissions/PermissionRequestButton";
export { ServiceStatusIndicator } from "./monitoring/ServiceControl/ServiceStatusIndicator";
// Service control components
export { ServiceToggleButton } from "./monitoring/ServiceControl/ServiceToggleButton";

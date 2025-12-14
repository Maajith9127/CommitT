// Reexport the native module. On web, it will be resolved to MonitoringMobileModule.web.ts
// and on native platforms to MonitoringMobileModule.ts

export * from "./MonitoringMobile.types";
export { default } from "./MonitoringMobileModule";
export { default as MonitoringMobileView } from "./MonitoringMobileView";

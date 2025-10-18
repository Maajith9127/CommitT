import { requireNativeView } from "expo";
import type * as React from "react";

import type { MonitoringMobileViewProps } from "./MonitoringMobile.types";

const NativeView: React.ComponentType<MonitoringMobileViewProps> =
  requireNativeView("MonitoringMobile");

export default function MonitoringMobileView(props: MonitoringMobileViewProps) {
  return <NativeView {...props} />;
}

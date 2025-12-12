import { requireNativeView } from 'expo';
import * as React from 'react';

import { MonitoringMobileViewProps } from './MonitoringMobile.types';

const NativeView: React.ComponentType<MonitoringMobileViewProps> =
  requireNativeView('MonitoringMobile');

export default function MonitoringMobileView(props: MonitoringMobileViewProps) {
  return <NativeView {...props} />;
}

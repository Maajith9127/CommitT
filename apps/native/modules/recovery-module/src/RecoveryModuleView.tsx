import { requireNativeView } from 'expo';
import * as React from 'react';

import { RecoveryModuleViewProps } from './RecoveryModule.types';

const NativeView: React.ComponentType<RecoveryModuleViewProps> =
  requireNativeView('RecoveryModule');

export default function RecoveryModuleView(props: RecoveryModuleViewProps) {
  return <NativeView {...props} />;
}

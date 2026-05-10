import { requireNativeModule } from 'expo-modules-core';

// Import the native module
const RecoveryModule = requireNativeModule('RecoveryModule');

export function nuclearReset() {
  return RecoveryModule.nuclearReset();
}

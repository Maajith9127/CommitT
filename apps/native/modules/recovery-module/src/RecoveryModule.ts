import { NativeModule, requireNativeModule } from 'expo';

import { RecoveryModuleEvents } from './RecoveryModule.types';

declare class RecoveryModule extends NativeModule<RecoveryModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<RecoveryModule>('RecoveryModule');

import { NativeModule, requireNativeModule } from 'expo';

import { MonitoringMobileModuleEvents } from './MonitoringMobile.types';

declare class MonitoringMobileModule extends NativeModule<MonitoringMobileModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<MonitoringMobileModule>('MonitoringMobile');

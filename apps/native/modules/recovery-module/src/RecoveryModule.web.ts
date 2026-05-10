import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './RecoveryModule.types';

type RecoveryModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class RecoveryModule extends NativeModule<RecoveryModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(RecoveryModule, 'RecoveryModule');

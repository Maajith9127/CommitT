import * as React from 'react';

import { RecoveryModuleViewProps } from './RecoveryModule.types';

export default function RecoveryModuleView(props: RecoveryModuleViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}

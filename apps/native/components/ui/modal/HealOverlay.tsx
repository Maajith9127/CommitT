import React from 'react';
import { nuclearReset } from '@/modules/recovery-module';
import { ConfirmationModal } from './ConfirmationModal';
import { useHealStore } from '@/stores/useHealStore';

export function HealOverlay() {
  const { isHealing, message, isCrashed, crashMessage } = useHealStore();

  console.log("[HealOverlay] Component Ping - isHealing:", isHealing);

  if (isHealing) {
    console.log("[HealOverlay]  SPINNING ACTIVE:", message);
  }

  if (isCrashed) {
    return (
      <ConfirmationModal
        visible={isCrashed}
        title={crashMessage}
        singleButton={true}
        confirmText="OK"
        onConfirm={nuclearReset}
        onCancel={nuclearReset}
      />
    );
  }

  return (
    <ConfirmationModal
      visible={isHealing}
      title={message || "Synchronizing device state..."}
      message=""
      isLoading={true}
      singleButton={true}
      confirmText="Syncing..."
      onConfirm={() => {}} 
      onCancel={() => {}}
    />
  );
}

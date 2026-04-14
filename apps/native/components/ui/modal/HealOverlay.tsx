import React from 'react';
import { ConfirmationModal } from './ConfirmationModal';
import { useHealStore } from '@/stores/useHealStore';

export function HealOverlay() {
  const { isHealing, message } = useHealStore();

  console.log("[HealOverlay] Component Ping - isHealing:", isHealing);

  if (isHealing) {
    console.log("[HealOverlay]  SPINNING ACTIVE:", message);
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

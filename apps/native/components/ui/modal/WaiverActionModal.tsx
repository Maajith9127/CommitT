import React from 'react';
import { Modal } from 'react-native';
import { CaptchaWaiverView } from './CaptchaWaiverView';

export function WaiverActionModal({ visible, event, onClose }: { visible: boolean; event: any; onClose: () => void }) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <CaptchaWaiverView event={event} onClose={onClose} />
    </Modal>
  );
}

import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { withUniwind } from 'uniwind';
import { BlocklistView } from './BlocklistView';

const UView = withUniwind(View);

interface BlocklistActionModalProps {
  visible: boolean;
  event: any;
  onClose: () => void;
}

export const BlocklistActionModal = ({ visible, event, onClose }: BlocklistActionModalProps) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <UView className="flex-1 bg-black">
        <BlocklistView 
          event={event} 
          onClose={onClose} 
        />
      </UView>
    </Modal>
  );
};

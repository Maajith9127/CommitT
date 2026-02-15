import React from 'react';
import { Modal, View, StyleSheet, Pressable } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/ui/button';

const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);

interface EventDetailModalProps {
  visible: boolean;
  onClose: () => void;
  event: any;
}

export function EventDetailModal({ visible, onClose, event }: EventDetailModalProps) {
  if (!event) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <UView className="bg-[#1A1A1A] w-full h-[85%] absolute bottom-0 rounded-t-3xl overflow-hidden">
          
          {/* Header with Close and Save/Verify placeholders based on reference style */}
          <UView className="flex-row justify-between items-center px-4 py-4 pt-6">
            <UPressable onPress={onClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color="#D1D5DB" />
            </UPressable>
            
            <PrimaryButton 
                className="w-auto px-4 py-1.5 h-auto rounded-md min-w-[70px]" 
                textClassName="text-sm font-bold"
                onPress={onClose} 
            >
                Save
            </PrimaryButton>
          </UView>

          {/* Empty Body as requested ("plain popup , dotn add anytjin g in there") */}
          <UView className="flex-1 bg-[#1A1A1A]">
            {/* Content removed */}
          </UView>

        </UView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
});

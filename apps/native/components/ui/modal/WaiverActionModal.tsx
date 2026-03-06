import React, { useState } from 'react';
import { Modal, View, TextInput, Pressable, Image, FlatList } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BodyText, HeaderTitle } from '@/components/ui/text';

const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);
const UTextInput = withUniwind(TextInput);

interface ContactSuggestion {
  id: string;
  email: string;
  initial: string;
  color: string;
  image?: string;
}

const SUGGESTIONS: ContactSuggestion[] = [
  { id: '1', email: 'care@cashefree.com', initial: 'C', color: '#D35400' },
  { id: '2', email: 'abdulaleemsaleem@gmail.com', initial: 'A', color: '#8E44AD' },
  { id: '3', email: 'arulkumar.v@vit.ac.in', initial: 'A', color: '#2C3E50', image: 'https://via.placeholder.com/150' },
  { id: '4', email: 'askus@tazapay.com', initial: 'A', color: '#2980B9' },
  { id: '5', email: 'care@cashfree.com', initial: 'C', color: '#AE27AE' },
];

export function WaiverActionModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [search, setSearch] = useState('');

  const renderItem = ({ item }: { item: ContactSuggestion }) => (
    <UPressable className="flex-row items-center px-4 py-3" onPress={() => {}}>
      <UView
        className="w-12 h-12 rounded-full justify-center items-center mr-4 overflow-hidden"
        style={{ backgroundColor: item.color }}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={{ width: 48, height: 48 }} />
        ) : (
          <BodyText className="text-white text-lg font-bold">{item.initial}</BodyText>
        )}
      </UView>
      <UView className="flex-1">
        <BodyText className="text-white text-base">{item.email}</BodyText>
      </UView>
    </UPressable>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <UView className="flex-1 bg-[#121212]">
        {/* Header */}
        <UView className="flex-row items-center px-4 pt-12 pb-4">
          <UPressable onPress={onClose} className="mr-6">
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </UPressable>
          <HeaderTitle className="text-xl text-white">Add people</HeaderTitle>
        </UView>

        {/* Search Bar */}
        <UView className="px-4 mb-6">
          <UView className="flex-row items-center bg-[#2A2A2A] rounded-full px-4 py-2">
            <MaterialCommunityIcons name="magnify" size={24} color="#A0A0A0" />
            <UTextInput
              className="flex-1 ml-2 text-white text-base"
              placeholder="Add people or groups"
              placeholderTextColor="#A0A0A0"
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </UView>
        </UView>

        {/* Suggestions */}
        <UView className="flex-1">
          <BodyText className="px-4 text-gray-400 text-sm mb-2">Suggestions</BodyText>
          <FlatList
            data={SUGGESTIONS}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </UView>
      </UView>
    </Modal>
  );
}

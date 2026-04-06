import React from 'react';
import { View, Text, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { useChaosStore } from '@/stores/useChaosStore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { nukeLocalDb } from '@/lib/local-db-commits';

/**
 *  THE CHAOS ENGINE CONTROL PANEL
 * 
 * This screen is your God-Mode for testing the Saga Pattern.
 * Toggle these on, then go try to save a task. 
 * Watch the terminal to see the "Heal" process.
 */
export default function ChaosScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { 
    faultCloudWrite, faultDiskWrite, faultHardware, 
    faultCloudUndo, faultDiskUndo, 
    toggleFault, resetAll 
  } = useChaosStore();

  const FaultRow = ({ label, value, storeKey, description }: any) => (
    <View style={{ marginBottom: 20, padding: 16, backgroundColor: '#1A1A1A', borderRadius: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>{label}</Text>
          <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>{description}</Text>
        </View>
        <Switch 
          value={value} 
          onValueChange={() => toggleFault(storeKey)}
          trackColor={{ false: "#333", true: "#FF3B30" }}
        />
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000', padding: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 40, marginBottom: 30 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '900', marginLeft: 15 }}>CHAOS ENGINE</Text>
      </View>

      <Text style={{ color: '#FF3B30', fontSize: 12, fontWeight: 'bold', marginBottom: 20, letterSpacing: 1 }}>
        FAULT INJECTION (EXECUTION PHASE)
      </Text>

      <FaultRow 
        label="Kill Cloud Write" 
        storeKey="faultCloudWrite" 
        value={faultCloudWrite}
        description="Fails immediately at Convex step. Nothing saved."
      />

      <FaultRow 
        label="Kill Disk Write" 
        storeKey="faultDiskWrite" 
        value={faultDiskWrite}
        description="Convex succeeds, but SQLite fails. Should trigger Cloud Undo."
      />

      <FaultRow 
        label="Kill Hardware Alarms" 
        storeKey="faultHardware" 
        value={faultHardware}
        description="The Big Test: Native Kotlin fails. Should undo Disk and Cloud."
      />

      <Text style={{ color: '#FF3B30', fontSize: 12, fontWeight: 'bold', marginTop: 20, marginBottom: 20, letterSpacing: 1 }}>
        RECONCILIATION TEST (UNDO PHASE)
      </Text>

      <FaultRow 
        label="Kill Cloud Rollback" 
        storeKey="faultCloudUndo" 
        value={faultCloudUndo}
        description="Simulates network loss during Undo. Triggers SPLIT-BRAIN & Auto-Heal."
      />

      <TouchableOpacity 
        onPress={async () => {
          await nukeLocalDb(db);
          router.back();
        }}
        style={{ padding: 18, backgroundColor: '#FF3B30', borderRadius: 12, alignItems: 'center', marginTop: 30 }}
      >
        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>☢️ NUKE LOCAL SQLITE</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={resetAll}
        style={{ padding: 18, backgroundColor: '#333', borderRadius: 12, alignItems: 'center', marginTop: 15, marginBottom: 100 }}
      >
        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>RESET ALL FAULTS</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

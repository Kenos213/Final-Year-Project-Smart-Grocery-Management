import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Button, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {core_URL} from './HostIp'

export default function ReviewScreen() {
 
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  const { scannedItems } = route.params || { scannedItems: [] };
  
  const [items, setItems] = useState(scannedItems);
  


  const handleSave = async () => {
    try {
      const response = await fetch(`${core_URL}/inventory/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: items }),
      });

      const result = await response.json();

      if (result.status === 'success') {
          Alert.alert("Success", "Items added to Inventory!");
        
          navigation.navigate('CameraScanner'); 
      }
    } catch (error) {
      Alert.alert("Error", "Could not connect to backend.");
      console.log(error);
    }
  };


  const handleDelete = (index: number) => {
      const newList = [...items];
      newList.splice(index, 1);
      setItems(newList);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Confirm Items</Text>
      
      <ScrollView style={styles.list}>
        {items.length === 0 && <Text style={styles.empty}>No items found.</Text>}
        
        {items.map((item: any, index: number) => (
          <View key={index} style={styles.itemRow}>
            <View style={styles.textContainer}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.brand}>{item.brand || "Unknown Brand"}</Text>
            </View>
            
            <TouchableOpacity onPress={() => handleDelete(index)}>
                <Text style={styles.deleteBtn}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Add to Inventory" onPress={handleSave} disabled={items.length === 0} />
        <View style={{marginTop: 10}}>
            <Button title="Cancel / Retake" color="red" onPress={() => navigation.goBack()} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#f5f5f5' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  list: { flex: 1 },
  empty: { textAlign: 'center', marginTop: 50, color: '#888' },
  itemRow: { 
    flexDirection: 'row', backgroundColor: 'white', padding: 15, 
    borderRadius: 10, marginBottom: 10, alignItems: 'center',
    shadowColor: "#000", shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.2
  },
  textContainer: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold' },
  brand: { fontSize: 12, color: '#666' },
  price: { fontSize: 14, color: '#2ecc71', fontWeight: 'bold' },
  deleteBtn: { fontSize: 18, padding: 10 },
  footer: { marginTop: 20, marginBottom: 20 }
});
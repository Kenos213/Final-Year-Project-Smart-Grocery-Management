import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ProductCard from './components/ProductCard';



export default function ReviewScreen() {
  const router = useRouter();
  const { scannedItems: rawItems } = useLocalSearchParams();

  
  const parsed = rawItems ? JSON.parse(rawItems as string) : [];
  const [items, setItems] = useState(parsed);


  const handleSave = () => {
    router.push({
      pathname: '/ExpiryScreen',
      params: { confirmedItems: JSON.stringify(items) },
    });
  };

  const handleDelete = (index: number) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  return (
    <View style={styles.container}>
     
      <Text style={styles.header}>Confirm Items</Text>
      <Text style={styles.subheader}>
        {items.length} {items.length === 1 ? 'item' : 'items'} detected
      </Text>

   
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {items.length === 0 && (
          <Text style={styles.empty}>No items found. Try scanning again.</Text>
        )}

        {items.map((item: any, index: number) => (
          <ProductCard
            key={index}
            name={item.name}
            brand={item.brand}
            price={item.price}
            category={item.category}
            image_url={item.image_url}
            rightAction={
              <TouchableOpacity
                onPress={() => handleDelete(index)}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            }
          />
        ))}
      </ScrollView>

     
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            items.length === 0 && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={items.length === 0}
        >
          <Text style={styles.saveButtonText}>
            Next — Set Expiry Dates
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel / Retake</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#F8F9FA',
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1A1A2E',
  },
  subheader: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  list: {
    flex: 1,
  },
  empty: {
    textAlign: 'center',
    marginTop: 60,
    color: '#AAA',
    fontSize: 16,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 14,
    color: '#E53935',
    fontWeight: '700',
  },
  footer: {
    marginTop: 16,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#CCC',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E53935',
  },
  cancelButtonText: {
    color: '#E53935',
    fontSize: 14,
    fontWeight: '600',
  },
});

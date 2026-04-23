import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,

} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ProductCard from '../components/ProductCard';
import { authFetch } from '../constants/api';
import { SafeAreaView } from 'react-native-safe-area-context';




export default function ReviewScreen() {
  const router = useRouter();
  const { scannedItems: rawItems } = useLocalSearchParams();

  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [priceIndex, setPriceIndex] = useState<number | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const parsed = rawItems ? JSON.parse(rawItems as string) : [];
  const [items, setItems] = useState(parsed);


  const handleSave = () => {
    router.push({
      pathname: '/ExpiryScreen',
      params: { confirmedItems: JSON.stringify(items) },
    });
  };

  const handlePriceSave = () => {
  if (priceIndex === null) return;
  const updated = [...items];
  updated[priceIndex] = {
    ...updated[priceIndex],
    price: priceInput || '0.00',
  };
  setItems(updated);
  setPriceModalVisible(false);
  setPriceIndex(null);
  setPriceInput('');
};

  const handleDelete = (index: number) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}> 
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
          footer={
            (!item.price || item.price === '0.00') ? (
              <TouchableOpacity onPress={() => {
                setPriceIndex(index);
                setPriceInput('');
                setPriceModalVisible(true);
              }}>
                <Text style={{ fontSize: 12, color: '#F57F17', fontWeight: '600' }}>
                  Tap to add price
                </Text>
              </TouchableOpacity>
            ) : null
          }
          rightAction={
            <TouchableOpacity onPress={() => handleDelete(index)} style={styles.deleteButton}>
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

          <Modal visible={priceModalVisible} transparent animationType="slide">
            <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Price</Text>
              <Text style={styles.modalSub}>
                {priceIndex !== null ? items[priceIndex]?.name : ''}
              </Text>

              <View style={styles.priceInputRow}>
                <Text style={styles.poundSign}>£</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0.00"
                  placeholderTextColor="#BBB"
                  keyboardType="decimal-pad"
                  value={priceInput}
                  onChangeText={setPriceInput}
                  autoFocus
                />
              </View>

            <TouchableOpacity style={styles.saveButton} onPress={handlePriceSave}>
              <Text style={styles.saveButtonText}>Save Price</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {
              setPriceModalVisible(false);
              setPriceIndex(null);
            }}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  </View>
  </KeyboardAvoidingView>
</Modal>


    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    
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

  modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'flex-end',
},
modalContent: {
  backgroundColor: '#FFF',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  padding: 24,
  paddingBottom: 40,
  alignItems: 'center',
},
modalTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#1A1A2E',
  marginBottom: 4,
},
modalSub: {
  fontSize: 13,
  color: '#888',
  marginBottom: 20,
},
priceInputRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginBottom: 20,
},
poundSign: {
  fontSize: 28,
  fontWeight: '700',
  color: '#1A1A2E',
},
priceInput: {
  fontSize: 28,
  fontWeight: '700',
  color: '#1A1A2E',
  borderBottomWidth: 2,
  borderBottomColor: '#2E7D32',
  minWidth: 100,
  textAlign: 'center',
  paddingVertical: 8,
},
skipText: {
  textAlign: 'center',
  marginTop: 12,
  fontSize: 13,
  color: '#999',
},
});

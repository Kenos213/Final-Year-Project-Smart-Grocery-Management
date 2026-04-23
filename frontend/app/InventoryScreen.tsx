import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProductCard from '../components/ProductCard';
import BottomNav from '../components/BottomNav';
import { authFetch } from '../constants/api';
import { cancelItemReminders } from '../constants/Notifications';

const CATEGORIES = ['All', 'Dairy', 'Produce', 'Meat', 'Fish', 'Bakery', 'Beverages', 'Snacks', 'Frozen', 'Pantry', 'Household'];

export default function InventoryScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleDelete = async (itemId: string, index: number) => {
    const response = await authFetch(`/inventory/delete`, {
        method: 'DELETE',
        body: JSON.stringify({ item_id: itemId })
    });
    
    if (!response) return;
    
    const result = await response.json();
    if (result.status === 'success') {
        // Remove from local state so screen updates instantly
        await cancelItemReminders(itemId);
        const updated = [...items];
        updated.splice(index, 1);
        setItems(updated);
    }
};

  const fetchInventory = async () => {
    try {
      
      const response = await authFetch('/inventory/list?status=unused');
      if (!response) {
        return
      }
      const result = await response.json();

      if (result.status === 'success') {
        const today = new Date().toISOString().split('T')[0];
        const activeItems = result.items.filter(
          (item: any) => !item.expiry_date || item.expiry_date >= today
        );
        setItems(activeItems);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter items based on selected category
  const filteredItems = selectedCategory === 'All'
    ? items
    : items.filter((item: any) => item.category === selectedCategory);

  // Work out how many days until expiry and return a label
  const getExpiryLabel = (expiryDate: string) => {
    if (!expiryDate) return 'No date set';

    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return 'Expired';
    if (daysLeft === 0) return 'Expires today';
    if (daysLeft === 1) return 'Expires tomorrow';
    return `${daysLeft} days left`;
  };

  // Pick colour based on urgency
  const getExpiryColour = (expiryDate: string) => {
    if (!expiryDate) return '#999';

    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 1) return '#E53935';
    if (daysLeft <= 3) return '#F57F17';
    return '#2E7D32';
  };

  // Count items per category for the badge number
  const getCategoryCount = (category: string) => {
    if (category === 'All') return items.length;
    return items.filter((item: any) => item.category === category).length;
  };

  const handleMarkUsed = async (itemId: string, index: number) => {
  const response = await authFetch('/inventory/use', {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId }),
  });

  if (!response) return;
  const result = await response.json();

  if (result.status === 'success') {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  }
};

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>My Inventory</Text>
      <Text style={styles.subheader}>
        {items.length} {items.length === 1 ? 'item' : 'items'} in stock
      </Text>

      {/* Category Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {CATEGORIES.map((cat) => {
          const count = getCategoryCount(cat);
          const isActive = selectedCategory === cat;

          // Skip categories with 0 items (except All)
          if (cat !== 'All' && count === 0) return null;

          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {cat}
              </Text>
              <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                <Text style={[styles.countText, isActive && styles.countTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      )}

      {/* Items List */}
      {!loading && (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {filteredItems.length === 0 && (
            <Text style={styles.empty}>
              {items.length === 0
                ? 'No items yet. Scan a receipt to get started!'
                : `No ${selectedCategory} items in stock.`}
            </Text>
          )}
          
         {filteredItems.map((item: any, index: number) => (
    <ProductCard
        key={item._id || index}
        name={item.name}
        brand={item.brand}
        price={item.price}
        category={item.category}
        image_url={item.image_url}
        rightAction={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => handleMarkUsed(item._id, index)}
            style={styles.usedButton}>
            <Text style={styles.usedBtnText}>Used</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item._id, index)}
            style={styles.deleteButton}>
            <Text style={styles.deleteBtnText}>X</Text>
          </TouchableOpacity>
        </View>
}
        footer={
            <Text style={{ fontSize: 12, fontWeight: '600', color: getExpiryColour(item.expiry_date) }}>
                {getExpiryLabel(item.expiry_date)}
            </Text>
        }
    />
))}
        </ScrollView>
      )}

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A2E',
    textAlign: 'center',
    marginTop: 10,
  },
  subheader: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },

  // Filter tabs
  filterRow: {
    maxHeight: 44,
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EEEEF2',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  filterTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
  },
  countTextActive: {
    color: '#FFF',
  },

  // List
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  empty: {
    textAlign: 'center',
    marginTop: 60,
    color: '#AAA',
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
usedButton: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
  backgroundColor: '#E8F5E9',
},
usedBtnText: {
  fontSize: 12,
  fontWeight: '600',
  color: '#2E7D32',
},

});
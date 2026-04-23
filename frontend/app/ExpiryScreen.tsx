import React, { useState, useMemo } from 'react';
import {View,Text,StyleSheet,ScrollView,TouchableOpacity,Alert} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ProductCard from '../components/ProductCard';
import ExpiryDateModal from '../components/ExpiryDateModal';
import { authFetch } from '../constants/api';
import { scheduleAllReminders } from '../constants/Notifications';



const PERISHABLE_CATEGORIES = new Set([
  'Dairy', 'Produce', 'Meat', 'Fish', 'Bakery',
]);

// Default constants shelf life values
const SHELF_LIFE_DEFAULTS: Record<string, number> = {
  Dairy: 7,
  Produce: 5,
  Meat: 3,
  Fish: 2,
  Bakery: 4,
  Frozen: 90,
  Pantry: 180,
  Beverages: 14,
  Snacks: 60,
  Household: 365,
  Other: 30,
};


const daysFromNow = (days: number): string => { // this function takes in a number of days and returns a date string that is that many days from the current date
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];  
};


const formatDate = (isoDate: string): string => { // this function takes in a date string is iso format and returns a formated datae
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
};

export default function ExpiryScreen() { // this is the screen where the user can set the expiry dates for their items and then save them to thier iventory
  
  const router = useRouter();
  const { confirmedItems: rawItems } = useLocalSearchParams();


  const parsed = rawItems ? JSON.parse(rawItems as string) : []; // i parse the items that are passed in from the previous screen 
  // and then i add some additional properties to them such as whether they are perishable or not and their estimated shelf life based on their category. 
  // This is so that i can display them differently in the UI and also provide default expiry dates for non-perishable items that the user can override if they want to.


  const [items, setItems] = useState(() =>
    parsed.map((item: any) => { // looking through each item in the parse array
      const category = item.category || 'Other';
      const isPerishable = PERISHABLE_CATEGORIES.has(category);
      const defaultDays = SHELF_LIFE_DEFAULTS[category] || 30;

      return {
        ...item,
        is_perishable: isPerishable,
        expiry_days: defaultDays,
        expiry_date: isPerishable ? null : daysFromNow(defaultDays),
        expiry_source: isPerishable ? null : 'category_estimate',
        needs_manual_date: isPerishable,
      };
    })
  );

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  // Split items into perishable and non-perishable
  const { perishable, nonPerishable } = useMemo(() => {
    const p: { item: any; index: number }[] = [];
    const np: { item: any; index: number }[] = [];

    items.forEach((item: any, index: number) => {
      if (item.is_perishable) {
        p.push({ item, index });
      } else {
        np.push({ item, index });
      }
    });

    return { perishable: p, nonPerishable: np };
  }, [items]);


  const pendingCount = items.filter( // this is counting how many items are perishable 
    (i: any) => i.is_perishable && !i.expiry_date
  ).length;


  const openDateModal = (index: number) => {
    setModalIndex(index);
    setModalVisible(true);
  };


  const handleDateSave = (date: Date) => {
    if (modalIndex === null) return;
    const updated = [...items];
    updated[modalIndex] = {
      ...updated[modalIndex],
      expiry_date: date.toISOString().split('T')[0],
      expiry_source: 'manual',
      needs_manual_date: false,
    };
    setItems(updated);
    setModalVisible(false);
    setModalIndex(null);
  };


  const handleSkipAll = () => { // this function is called when the user clicks the skip all button it just fills in estimated dates for all perishable items that dont have dates 
  // and then updates the state with the new items array so that the user can then save them to their inventory
    const updated = items.map((item: any) => {
      if (item.is_perishable && !item.expiry_date) {
        return {
          ...item,
          expiry_date: daysFromNow(item.expiry_days),
          expiry_source: 'category_estimate',
          needs_manual_date: false,
        };
      }
      return item;
    });
    setItems(updated);
  };


  const handleSaveAll = async () => { // when this route is called via a button click it send the items array to the backened
    try {
      const response = await authFetch(`/inventory/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (!response){
        Alert.alert('Error', 'Failed to save items to inventory.');
        return;
      }

      const result = await response.json();

      if (result.status === 'success') {
        await scheduleAllReminders(items);
        Alert.alert('Success', `${items.length} items added to Inventory!`);
       router.replace('/');;
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to backend.');
      console.log(error);
    }
  };

  return (
    <View style={styles.container}>
 
      <Text style={styles.header}>Set Expiry Dates</Text>
      <Text style={styles.subheader}>
        We need dates for perishable items
      </Text>

  
      {pendingCount > 0 && (
        <View style={styles.tipBanner}>
          <Text style={styles.tipText}>
            <Text style={styles.tipBold}>Reduced Item? </Text>
            Tap the item to enter the exact date from the packaging.
          </Text>
        </View>
      )}

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
      
        {perishable.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: '#E53935' }]} />
              <Text style={[styles.sectionLabel, { color: '#E53935' }]}>
                Perishable — Dates Needed ({perishable.length})
              </Text>
            </View>

            {/* looping through perishable items assigning values and using the index and as a key for referenceing*/}
            {perishable.map(({ item, index }) => ( 
              <ProductCard
                key={`p-${index}`}
                name={item.name}
                brand={item.brand}
                category={item.category}
                image_url={item.image_url}
                onPress={() => openDateModal(index)}
                rightAction={
                  <View style={styles.expiryAction}>
                    {item.expiry_date ? (
                      <View style={styles.hasDateBadge}>
                        <Text style={styles.hasDateText}>
                          ✓ {formatDate(item.expiry_date)}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.needsDateBadge}>
                        <Text style={styles.needsDateText}> Set date</Text>
                      </View>
                    )}
                    <Text style={styles.expiryHint}>
                      {item.expiry_date
                        ? item.expiry_source === 'manual'
                          ? 'Manual entry'
                          : 'Tap to change'
                        : `~${item.expiry_days}d suggested`}
                    </Text>
                  </View>
                }
              />
            ))}
          </>
        )}

      
        {nonPerishable.length > 0 && (
          <>
            <View style={styles.autoSummary}>
              <Text style={styles.autoText}>
                <Text style={styles.autoBold}>
                  {nonPerishable.length} items auto-assigned
                </Text>
                {' — non-perishable items given estimated shelf life. Tap any to override.'}
              </Text>
            </View>

            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: '#2E7D32' }]} />
              <Text style={[styles.sectionLabel, { color: '#2E7D32' }]}>
                Auto-Assigned ({nonPerishable.length})
              </Text>
            </View>
            {/* looping through non-perishable items */}
            {nonPerishable.map(({ item, index }) => (
              <ProductCard
                key={`np-${index}`}
                name={item.name}
                brand={item.brand}
                category={item.category}
                image_url={item.image_url}
                onPress={() => openDateModal(index)}
                rightAction={
                  <View style={styles.expiryAction}>
                    <View style={styles.autoDateBadge}>
                      <Text style={styles.autoDateText}>
                        ~{item.expiry_days < 30
                          ? `${item.expiry_days} days`
                          : `${Math.round(item.expiry_days / 30)} months`}
                      </Text>
                    </View>
                    <Text style={styles.expiryHint}>Category estimate</Text>
                  </View>
                }
              />
            ))}
          </>
        )}
      </ScrollView>

    
      <View style={styles.footer}>
        {pendingCount > 0 && (
          <Text style={styles.pendingText}>
            {pendingCount} perishable {pendingCount === 1 ? 'item' : 'items'} still{' '}
            {pendingCount === 1 ? 'needs' : 'need'} a date
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.saveButton,
            pendingCount > 0 && styles.saveButtonDisabled,
          ]}
          onPress={handleSaveAll}
          disabled={pendingCount > 0}
        >
          <Text style={styles.saveButtonText}>Save All to Inventory</Text>
        </TouchableOpacity>

        {pendingCount > 0 && (
          <TouchableOpacity onPress={handleSkipAll}>
            <Text style={styles.skipText}>Skip — use estimates for all</Text>
          </TouchableOpacity>
        )}
      </View>

    
      <ExpiryDateModal
        visible={modalVisible}
        item={modalIndex !== null ? items[modalIndex] : null}
        onSave={handleDateSave}
        onClose={() => {
          setModalVisible(false);
          setModalIndex(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#F6F7F9',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1A1A2E',
  },
  subheader: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressDone: { fontSize: 11, color: '#999', fontWeight: '500' },
  progressActive: { fontSize: 11, color: '#2E7D32', fontWeight: '700' },
  progressPending: { fontSize: 11, color: '#CCC', fontWeight: '500' },
  progressBar: {
    height: 4,
    backgroundColor: '#EEEEF2',
    borderRadius: 4,
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    width: '60%',
    backgroundColor: '#2E7D32',
    borderRadius: 4,
  },
  tipBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
    gap: 8,
  },
  tipIcon: { fontSize: 16, marginTop: 1 },
  tipText: { flex: 1, fontSize: 12, color: '#795600', lineHeight: 18 },
  tipBold: { fontWeight: '700' },
  list: { flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  autoSummary: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    marginBottom: 14,
    alignItems: 'center',
    gap: 10,
  },
  autoIcon: { fontSize: 18 },
  autoText: { flex: 1, fontSize: 12, color: '#1565C0', lineHeight: 18 },
  autoBold: { fontWeight: '700' },
  expiryAction: {
    alignItems: 'flex-end',
    gap: 3,
  },
  needsDateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFF8E1',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#F57F17',
  },
  needsDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57F17',
  },
  hasDateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
  },
  hasDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  autoDateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  autoDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1565C0',
  },
  expiryHint: {
    fontSize: 9,
    color: '#BBB',
  },
  footer: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEEEF2',
    marginTop: 10,
  },
  pendingText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#F57F17',
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 14,
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
  skipText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 13,
    color: '#999',
  },
});

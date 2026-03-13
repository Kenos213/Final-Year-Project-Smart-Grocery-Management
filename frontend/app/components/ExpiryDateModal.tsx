import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import CategoryBadge from './CategoryBadge';



interface ExpiryDateModalProps {
  visible: boolean;
  item: {
    name: string;
    brand?: string;
    category?: string;
    expiry_days?: number;
  } | null;
  onSave: (date: Date) => void;
  onClose: () => void;
}

const QUICK_OPTIONS = [
  { days: 1, label: 'Tomorrow', subtitle: 'Reduced item' },
  { days: 2, label: '2 days', subtitle: 'Very short life' },
  { days: 3, label: '3 days', subtitle: 'Short life' },
  { days: 7, label: '1 week', subtitle: 'Longer fresh' },
];

export default function ExpiryDateModal({
  visible,
  item,
  onSave,
  onClose,
}: ExpiryDateModalProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  if (!item) return null;

 
  const daysFromNow = (days: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  };


  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleQuickSelect = (days: number) => {
    const date = daysFromNow(days);
    setSelectedDate(date);
  };

  const handleDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) setSelectedDate(date);
  };

  const handleConfirm = () => {
    onSave(selectedDate);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
         
          <View style={styles.header}>
            <Text style={styles.title}>Set Expiry Date</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

    
          <View style={styles.itemPreview}>
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>{item.name}</Text>
              <Text style={styles.previewBrand}>{item.brand || 'Unknown'}</Text>
              {item.category ? (
                <CategoryBadge category={item.category} size="small" />
              ) : null}
            </View>
            {item.expiry_days ? (
              <View style={styles.suggestedBadge}>
                <Text style={styles.suggestedText}>
                  ~{item.expiry_days}d suggested
                </Text>
              </View>
            ) : null}
          </View>

    
          <Text style={styles.sectionLabel}>Quick select</Text>
          <View style={styles.quickGrid}>
            {QUICK_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.days}
                style={[
                  styles.quickOption,
                  selectedDate.toDateString() ===
                    daysFromNow(opt.days).toDateString() &&
                    styles.quickOptionSelected,
                ]}
                onPress={() => handleQuickSelect(opt.days)}
              >
                <Text
                  style={[
                    styles.quickDays,
                    selectedDate.toDateString() ===
                      daysFromNow(opt.days).toDateString() &&
                      styles.quickDaysSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={styles.quickSubtitle}>{opt.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>

        
          <Text style={styles.orDivider}>or pick exact date</Text>

          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.datePickerIcon}>📅</Text>
            <Text style={styles.datePickerText}>
              {formatDate(selectedDate)}
            </Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

         
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>
              Confirm — {formatDate(selectedDate)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F6F7F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
  },


  itemPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7F9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  previewBrand: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  suggestedBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  suggestedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1565C0',
  },

  // Quick grid
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickOption: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EEEEF2',
    alignItems: 'center',
  },
  quickOptionSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  quickDays: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  quickDaysSelected: {
    color: '#2E7D32',
  },
  quickSubtitle: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },

 
  orDivider: {
    textAlign: 'center',
    fontSize: 12,
    color: '#BBB',
    marginBottom: 12,
  },


  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EEEEF2',
    gap: 8,
    marginBottom: 8,
  },
  datePickerIcon: {
    fontSize: 16,
  },
  datePickerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },


  confirmBtn: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

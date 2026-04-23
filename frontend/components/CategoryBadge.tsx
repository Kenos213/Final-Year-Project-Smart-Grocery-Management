import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const categoryColours: Record<string, { bg: string; text: string }> = {
  Dairy:      { bg: '#E3F2FD', text: '#1565C0' },
  Produce:    { bg: '#E8F5E9', text: '#2E7D32' },
  Meat:       { bg: '#FCE4EC', text: '#C62828' },   ///each category is asigned a specific colour scheme to make it easier for the user  to indentify the category
  Fish:       { bg: '#E0F7FA', text: '#00838F' },
  Bakery:     { bg: '#FFF8E1', text: '#F57F17' },
  Beverages:  { bg: '#F3E5F5', text: '#7B1FA2' },
  Snacks:     { bg: '#FFF3E0', text: '#E65100' },
  Frozen:     { bg: '#E8EAF6', text: '#283593' },
  Pantry:     { bg: '#EFEBE9', text: '#4E342E' },
  Household:  { bg: '#ECEFF1', text: '#37474F' },
  Other:      { bg: '#F5F5F5', text: '#616161' },
};

interface CategoryBadgeProps {
  category: string;
  size?: 'small' | 'default'; 
}

export default function CategoryBadge({
  category,
  size = 'default',     /// component that renders a badge with the category name and appropriate colours based on the category
}: CategoryBadgeProps) {
  const colours = categoryColours[category] || categoryColours['Other'];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colours.bg },
        size === 'small' && styles.badgeSmall,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: colours.text },
          size === 'small' && styles.textSmall,
        ]}
      >
        {category}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 9,
  },
});

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import CategoryBadge from './CategoryBadge';



const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/80x80.png?text=No+Image';

interface ProductCardProps {
  name: string;
  brand?: string;
  price?: string;
  category?: string;
  image_url?: string;

  rightAction?: React.ReactNode;

  footer?: React.ReactNode;
 
  onPress?: () => void;
}

export default function ProductCard({
  name,
  brand,
  price,
  category,
  image_url,
  rightAction,
  footer,
  onPress,
}: ProductCardProps) {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={styles.card}
      {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}
    >
    
      <Image
        source={{ uri: image_url || PLACEHOLDER_IMAGE }}
        style={styles.image}
        resizeMode="contain"
      />

   
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>

        {brand ? <Text style={styles.brand}>{brand}</Text> : null}

        <View style={styles.metaRow}>
          {category ? <CategoryBadge category={category} /> : null}

          {price && price !== '0.00' ? (
            <Text style={styles.price}>£{price}</Text>
          ) : null}
        </View>

        {footer ? <View style={styles.footerContainer}>{footer}</View> : null}
      </View>

  
      {rightAction ? (
        <View style={styles.actionSlot}>{rightAction}</View>
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
   
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,

    elevation: 3,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    marginRight: 12,
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  brand: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
  },
  footerContainer: {
    marginTop: 8,
  },
  actionSlot: {
    marginLeft: 8,
  },
});

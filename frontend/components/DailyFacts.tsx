import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const FOOD_TIPS = [
  "The average UK household wastes £700 worth of food per year.",
  "Freezing food on its use-by date extends its life by months.",
  "Bananas release ethylene gas which ripens nearby fruit faster.",
  "Best before dates are about quality, not safety. Use-by dates are about safety.",
  "Storing bread in the fridge actually makes it go stale faster.",
  "Wilted vegetables can be revived by soaking in ice water for 30 minutes.",
  "Eggs can last 3-5 weeks in the fridge past their purchase date.",
  "UK households throw away 6.6 million tonnes of food waste annually.",
  "Cheese lasts longer wrapped in wax paper than cling film.",
  "Herbs stay fresh longer stored in a glass of water like flowers.",    /// facts about food waste/storage to educate users although the main reason i decided to include this is to mkae the screen more full but it provides the user with good insight
  "Overripe bananas are perfect for baking — freeze them for later.",
  "Leftover rice should be refrigerated within an hour to avoid bacteria.",
  "Apples stored in the fridge last up to 10 times longer than on the counter.",
  "Potatoes and onions should never be stored together — they speed up spoilage.",
  "Tinned food can last 2-5 years past its best before date if undamaged.",
];

const dailyTip = FOOD_TIPS[new Date().getDate() % FOOD_TIPS.length]; // this picks a different tip each day based of the date and will cycle throught

export default function DailyTip() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Did you know?</Text>
      <Text style={styles.text}>{dailyTip}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#1565C0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1565C0',
    marginBottom: 4,
  },
  text: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
});
// This component renders the bottom navigation bar conisitings of 5 tabs, Home,Inventory,scan,recipes and Insights

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Link, usePathname } from 'expo-router';

const tabs = [
  { name: 'Home', href: '/', icon: require('../assets/images/HomeIcon.png') },
  { name: 'Inventory', href: '/InventoryScreen', icon: require('../assets/images/InventoryIcon.png') },
  { name: 'Scan', href: '/CameraScanner', icon: require('../assets/images/ScanIcon.png') },      //array conntains details of what each button should have i.e icon. link,name
  { name: 'Recipes', href: '/RecipeScreen', icon: require('../assets/images/RecipeIcon.png') },
  { name: 'Insights', href: '/AnalysisScreen', icon: require('../assets/images/analysisIcon.png') },
];

export default function BottomNav() {
  const currentPath = usePathname();

  return (
    <View style={styles.navbar}>
      {tabs.map((tab) =>{    /// maps through the tabs array to render each button in the navbar
        const isActive = currentPath === tab.href;
        const isScan = tab.name === 'Scan';

        return (
          <Link key={tab.name} href={tab.href as any} asChild>
            <TouchableOpacity style={styles.tab}>
              {isScan ? ( //varibile check to see if the current tab is the scan button i wasnted it to stand out as it is the core concept of the project
                
                <View style={styles.scanButton}>
                  <Image source={tab.icon} style={styles.scanIconImg} />
                </View>
              ) : (
               
                <View style={styles.iconContainer}>
                  <Image
                    source={tab.icon}
                    style={[styles.icon, isActive && styles.iconActive]}
                  />
                  {isActive && <View style={styles.activeDot} />}
                </View>
              )}
              <Text style={[
                styles.label,
                isActive && styles.labelActive,
                isScan && styles.scanLabel,
              ]}>
                {tab.name}
              </Text>
            </TouchableOpacity>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEF2',
    paddingTop: 8,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 5,
  },
  tab: {
    alignItems: 'center',
    minWidth: 50,
  },

  // Normal icon
  iconContainer: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
  },
  icon: {
    width: 24,
    height: 24,
    opacity: 0.4,
  },
  iconActive: {
    opacity: 1,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2E7D32',
    marginTop: 3,
    position: 'absolute',
    bottom: -6,
  },

  // Raised scan button
  scanButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -28,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  scanIconImg: {
    width: 24,
    height: 24,
    tintColor: '#FFF',
  },
  scanLabel: {
    marginTop: 4,
  },

  // Labels
  label: {
    fontSize: 10,
    color: '#B5B5C3',
    fontWeight: '500',
    marginTop: 4,
  },
  labelActive: {
    color: '#2E7D32',
    fontWeight: '700',
  },
});
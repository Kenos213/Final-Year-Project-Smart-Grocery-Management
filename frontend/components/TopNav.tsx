import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from 'expo-secure-store';

export default function TopNav() {
  const router = useRouter();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      const userStr = await SecureStore.getItemAsync('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserName(user.name);
      }
    };
    loadUser();
  }, []);

  const initial = userName ? userName.charAt(0).toUpperCase() : '?'; // this is used to display the first initial of the users name in the profile icon in the top right of the dashboard.
  //  If for some reason we cant get the users name we just display a question mark instead

  return (
    <View style={styles.container}>
      {/* App title */}
      <View>
        <Text style={styles.title}>Smart<Text style={styles.titleAccent}> Grocery</Text></Text>
      </View>

      {/* Profile icon */}
      <TouchableOpacity
        style={styles.avatar}
        onPress={() => router.push('/profileScreen')}
      >
        <Text style={styles.avatarText}>{initial}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEF2',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  titleAccent: {
    color: '#2E7D32',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
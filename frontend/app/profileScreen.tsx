import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { authFetch } from '../constants/api';
const backIcon = require('../assets/images/backIcon.png')

export default function ProfileScreen() {
const router = useRouter();
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [loading, setLoading] = useState(false);
const [passwordModalVisible, setPasswordModalVisible] = useState(false);
const [currentPassword, setCurrentPassword] = useState('');
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');

 
const handleChangePassword = async () => {
  if (!currentPassword || !newPassword || !confirmPassword) {
    Alert.alert('Error', 'All fields are required')
    return
  }

  if (newPassword !== confirmPassword) {
    Alert.alert('Error', 'New passwords do not match')
    return
  }

  if (newPassword.length < 6) {
    Alert.alert('Error', 'New password must be at least 6 characters')
    return
  }

  try {
    const response = await authFetch('/user/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });


    if (!response) {
      Alert.alert('Error', 'An issue occured.');
      return
    }

    const result = await response.json();

    if (response.ok) {
      Alert.alert('Success', 'Password updated');
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      Alert.alert('Error', result.error || 'Failed to update password');
    }
  } catch (error) {
    Alert.alert('Error', 'Could not connect to server');
  }
};

const handleLogout = async () => {
  await SecureStore.deleteItemAsync('token')
  await SecureStore.deleteItemAsync('user')
  router.replace('/AuthScreen')
}

const handleUpdate = async () => {
  if (!name.trim() || !email.trim()) {
    Alert.alert('Error', 'Name and email are required');
    return;
  }

  try {
    const response = await authFetch('/user/update', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
      }),
    });

      if (!response) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      if (response.ok) {
        
        Alert.alert('Success', 'Profile updated');
      } else {
        const result = await response.json();
        Alert.alert('Error', result.error || 'Failed to update profile');
      }
    
  } catch (error) {
    console.error('Error updating profile:', error);
    Alert.alert('Error', 'Failed to update profile');
  }
}

const loadProfile = async() =>{
  try {

    const response = await authFetch('/user/profile');
    if (!response) {
      Alert.alert('Error', 'Please log in again');
      return;
    }

    const result = await response.json();

    if (result.status === 'success') {
      setName(result.user.name);
      setEmail(result.user.email);
    }

  } catch (error) {
    console.error('Error fetching profile:', error);
    Alert.alert('Error', 'Failed to load profile');
  }
}


useEffect(() => {

loadProfile();

}, [])


return(
  <SafeAreaView style={{flex: 1}}>
    <View style={styles.headerContainer}>
       <TouchableOpacity onPress={() => router.back()}>
        <Image source = {backIcon} style={styles.backButton} />
      </TouchableOpacity>
      <Text style ={styles.header}>Your Profile</Text>
     
    </View>

    <View style={styles.container}>
     <Text style={styles.inputLabel}>Name</Text>
     <TextInput id="name" style={styles.input}
       placeholder= "Placeholder for user name"
       value={name}
       onChangeText={setName}
     /> 
     <Text style={styles.inputLabel}>Email</Text>
     <TextInput id="email" style={styles.input}
       placeholder= "Placeholder for user email"
       value={email}
       onChangeText={setEmail}
     /> 

     {/* Add this inside the main View container */}
<TouchableOpacity 
  style={styles.passwordButton} 
  onPress={() => setPasswordModalVisible(true)}
>
  <Text style={styles.passwordButtonText}>Change Password</Text>
</TouchableOpacity>

    <Modal visible={passwordModalVisible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Change Password</Text>

        <Text style={styles.inputLabel}>Current Password</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="Enter current password"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />

        <Text style={styles.inputLabel}>New Password</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="Enter new password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <Text style={styles.inputLabel}>Confirm New Password</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="Confirm new password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity style={styles.confirmButton} onPress={handleChangePassword}>
          <Text style={styles.confirmButtonText}>Update Password</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => {
          setPasswordModalVisible(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>

     <TouchableOpacity style = {styles.confirmButton} onPress={handleUpdate}>
      <Text style={styles.confirmButtonText}>Update Profile</Text>
     </TouchableOpacity>

     <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
      <Text style={styles.logoutButtonText}>Log Out</Text>
     </TouchableOpacity>

    </View>


  </SafeAreaView>
)

}


const styles = StyleSheet.create({

  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 20,
  },

  container : {

    flex: 1,
    backgroundColor: ' #cdd1d9',
    
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A2E',
    textAlign: 'center',
    marginTop: 10,
    left: 95,
    
  },

  logoutButton: {
    backgroundColor: '#E53935',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    marginHorizontal: 20,
  },
  logoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

confirmButton: {
    backgroundColor: '#058700',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    marginHorizontal: 20,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  input: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 8,
  },

  inputLabel:{

    marginTop: 20,
    marginHorizontal: 20,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  backButton:{
    
    width: 24,
    height: 24,
    position: 'absolute',
    left: 0,
    top: 0,

  },
  passwordButton: {
  backgroundColor: '#1565C0',
  padding: 12,
  borderRadius: 8,
  alignItems: 'center',
  marginTop: 12,
  marginHorizontal: 20,
},
passwordButtonText: {
  color: '#FFF',
  fontSize: 16,
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
},
modalTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#1A1A2E',
  marginBottom: 16,
  textAlign: 'center',
},
modalInput: {
  backgroundColor: '#F6F7F9',
  padding: 12,
  borderRadius: 8,
  marginTop: 8,
  marginBottom: 4,
},
cancelText: {
  textAlign: 'center',
  marginTop: 12,
  fontSize: 14,
  color: '#999',
},

  

})
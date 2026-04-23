import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { core_URL } from './HostIp';

export async function authFetch(endpoint: string, options: any = {}) {
  const token = await SecureStore.getItemAsync('token');

  const response = await fetch(`${core_URL}${endpoint}`, {
    ...options,    //depacking the options object
    headers: {
      'Content-Type': 'application/json',    
      'Authorization': `Bearer ${token}`, //// this whole function is a wrapper around fetch that automatically adds the users token to the request so that they stay logged in and can access their data without having to log in every time they open the app.
                                          ////  It also handles logging the user out if the token is invalid or expired
      ...options.headers,
    },
  });

  // If backend says token is expired or invalid, log the user out
  if (response.status === 401) {  // i only send the 401 status code when the token is missing/invalid/expired so this is a catch for all token related issues
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    router.replace('/AuthScreen');
    return null;
  }

  return response;
}
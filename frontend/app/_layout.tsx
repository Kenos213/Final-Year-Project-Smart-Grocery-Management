import { Stack } from 'expo-router';
import { setupNotificationHandler, requestNotificationPermission }  from '../constants/Notifications';
import { useEffect } from 'react';

export default function Layout() {
  useEffect(() =>{
    const init = async () =>{
      await requestNotificationPermission()
      await setupNotificationHandler()
    }
    init();

  },[])
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
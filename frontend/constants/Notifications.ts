import * as Notifications from 'expo-notifications';

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Create notification channel (required for Android)
  await Notifications.setNotificationChannelAsync('expiry-reminders', {
    name: 'Expiry Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

export async function scheduleExpiryReminders(itemId: string, itemName: string, expiryDate: string) {
  if (!expiryDate) return [];

  const expiry = new Date(expiryDate);
  const now = new Date();
  const notificationIds: string[] = [];

  // Tier 1 — 3 days before
  const threeDaysBefore = new Date(expiry);
  threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
  threeDaysBefore.setHours(9, 0, 0, 0);

  if (threeDaysBefore > now) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Expiring Soon!',
        body: `${itemName} expires in 3 days. Plan to use it this week.`,
        data: { itemId, type: 'expiry_green' },
      },
      trigger: { type: 'date' as any, date: threeDaysBefore, channelId: 'expiry-reminders' },
    });
    notificationIds.push(id);
  }

  // Tier 2 — 1 day before
  const oneDayBefore = new Date(expiry);
  oneDayBefore.setDate(oneDayBefore.getDate() - 1);
  oneDayBefore.setHours(9, 0, 0, 0);

  if (oneDayBefore > now) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Expires Tomorrow!',
        body: `${itemName} expires tomorrow. Use it today or check for recipes.`,
        data: { itemId, type: 'expiry_amber' },
      },
      trigger: { type: 'date' as any, date: oneDayBefore, channelId: 'expiry-reminders' },
    });
    notificationIds.push(id);
  }

  // Tier 3 — day of expiry
  const dayOf = new Date(expiry);
  dayOf.setHours(8, 0, 0, 0);

  if (dayOf > now) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Expires Today!',
        body: `${itemName} expires today! Use it now to avoid waste.`,
        data: { itemId, type: 'expiry_red' },
      },
      trigger: { type: 'date' as any, date: dayOf, channelId: 'expiry-reminders' },
    });
    notificationIds.push(id);
  }

  return notificationIds;
}

export async function scheduleAllReminders(items: any[]) { // this is called when the user logs in to reschedule reminders for all their items in case they added items while notifications were disabled or if they just logged in on a new device. It loops through all the users items and schedules reminders for each one using the function above 
  for (const item of items) {
    await scheduleExpiryReminders(
      item._id || item.name,
      item.name,
      item.expiry_date
    );
  }
}

export async function cancelItemReminders(itemId: string) { // this cancels all notications related to a specified item that was deleted from the users inventory
  const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of allScheduled) {
    if (notification.content.data?.itemId === itemId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
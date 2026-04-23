import { Text, View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator , Image, Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { authFetch } from '../constants/api';
import BottomNav from '../components/BottomNav';
import TopNav from '../components/TopNav';
import DailyTip from '../components/DailyFacts'
import * as Notifications from 'expo-notifications';
const recipeIcon = require('../assets/images/RecipeIcon.png');

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [expiringItems, setExpiringItems] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_items: 0, expiring_this_week: 0, wasted_items: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();  // runs the function that fetches all data to be displayed on the dashboard when then screen is rendered
  }, []);

  const loadDashboard = async () => {
    const token = await SecureStore.getItemAsync('token');
    if (!token) { 
      router.replace('/AuthScreen') // checks if the user has a token if not , they are redirected to the login scnreen
      return 
    }

    const userStr = await SecureStore.getItemAsync('user');
    if (userStr){
       setUserName(JSON.parse(userStr).name)// retrieves the users name from the secure store and its it to state to be displayed on the dashboard
    }

    const expiryRes = await authFetch('/inventory/expiring');
    if (expiryRes) {
      const data = await expiryRes.json();
      if (data.status === 'success'){
         setExpiringItems(data.items) // retrieves items that are expiring soon
        }  
    }

    const statsRes = await authFetch('/inventory/stats');
    if (statsRes) {
      const data = await statsRes.json();
      if (data.status === 'success') {
        setStats(data.stats) // retrieves the users inventory stats to be displayed on the dashboard
      }
    }

    setLoading(false);
  };

  // Items expiring today or tomorrow
  const urgentItems = expiringItems.filter((i) => i.days_left <= 1); //creates a list of items that are expiring within 24 hours to be displayed in the urgency banner at the top of the dashboard

  // Colour based on days left which indiciate urgency
  const getColour = (days: number) => {
    if (days <= 1) {
      return { bg: '#FFF0F0', text: '#E53935', border: '#E53935' };
    }
    if (days <= 3) {
      return { bg: '#FFF8E1', text: '#F57F17', border: '#F57F17' };
    }
    return { bg: '#E8F5E9', text: '#2E7D32', border: '#2E7D32' };
  };

  // Label based on days left
  const getLabel = (days: number) => {
    if (days < 0) return 'Expired';
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Tomorrow';
    return `${days} days left`;
  };

  

// this should not technically be here but ive added it just to show notificaitons are working
const testNotification = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test Notification',
      body: 'This is a test from Smart Grocery Management notification system.',
    },
    trigger: { type: 'timeInterval' as any, seconds: 10, channelId: 'expiry-reminders' },
  });
  Alert.alert('Scheduled', 'Notification will appear in 10 seconds. Minimise the app.');
};

  return (
    <SafeAreaView style={s.safe}>
      <TopNav />
      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Greeting towards the user */}
        <Text style={s.greeting}>Welcome back,</Text>
        <Text style={s.name}>{userName || 'User'}</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 100 }}/>
        ) : (
          <>
            {/* Urgency Banner */}
            {urgentItems.length > 0 && (
              <View style={s.banner}>
               <Text style={s.bannerTitle}>
                {`${urgentItems.length} ${urgentItems.length === 1 ? 'item' : 'items'} expiring soon!`}
              </Text>
              {/* iterate through urgent items and join their names with a comma */}
                <Text style={s.bannerSub}>
                  {urgentItems.map((i) => i.name).join(', ')}
                </Text>
              </View>
            )}

            {/* Stats */}
            <View style={s.statsRow}>
              <View style={s.stat}>
                <Text style={s.statNum}>{stats.total_items}</Text>
                <Text style={s.statLabel}>In Stock</Text>
              </View>
              <View style={s.stat}>
                <Text style={[s.statNum, { color: '#F57F17' }]}>{stats.expiring_this_week}</Text>
                <Text style={s.statLabel}>Expiring Soon</Text>
              </View>
              <View style={s.stat}>
                <Text style={[s.statNum, { color: '#E53935' }]}>{stats.wasted_items}</Text>
                <Text style={s.statLabel}>Wasted</Text>
              </View>
            </View>

            

            {/* Expiring Soon */}
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Expiring Soon</Text>
              <TouchableOpacity onPress={() => router.push('/InventoryScreen')}>
                <Text style={s.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>

            {expiringItems.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyText}>No items expiring soon </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                {/* iterates throguht expiring items to display them */}
                {expiringItems.map((item, i) => { 
                  const c = getColour(item.days_left);
                  return (
                    <View key={i} style={[s.expiryCard, { borderLeftColor: c.border }]}>
                      <Text style={s.expiryName} numberOfLines={1}>{item.name}</Text>
                      <Text style={s.expiryBrand}>{item.brand || 'Unknown'}</Text>
                      <View style={[s.badge, { backgroundColor: c.bg }]}>
                        <Text style={[s.badgeText, { color: c.text }]}>{getLabel(item.days_left)}</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Recipe Tip */}
            {expiringItems.length > 0 && (
              <TouchableOpacity style={s.tip} onPress={() => router.push('/RecipeScreen')}>
                <Image source={recipeIcon} style={s.tipIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={s.tipTitle}>Cook with {expiringItems[0]?.name}?</Text>
                  <Text style={s.tipSub}>Tap for recipe ideas</Text>
                </View>
                <Text style={{ fontSize: 22, color: '#B5B5C3' }}>›</Text>
              </TouchableOpacity>
            )}
          </>
        )}
          
          {/* although not really needed i felt as if my homepage was a bit empty not i added this to make it feel more full */}
          <DailyTip />

          <TouchableOpacity onPress={testNotification} style={{ padding: 12, backgroundColor: '#1565C0', borderRadius: 8, margin: 20 }}>
          <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: '600' }}>Test Notification</Text>
        </TouchableOpacity>
      </ScrollView>
        
      <BottomNav />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { 
    flex: 1, 
  backgroundColor: '#F6F7F9' 
  },
  content: { 
    flex: 1,
     paddingHorizontal: 20 },

  greeting: {
    fontSize: 14,
    color: '#8A8A9A',
    marginTop: 16 
      },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 20
  },

  banner: { 
    backgroundColor: '#FFF0F0', 
    borderRadius: 14,
     padding: 14, 
     marginBottom: 20,
      borderLeftWidth: 4,
       borderLeftColor: '#E53935' 
      },
  bannerTitle: { 
    fontSize: 14
    , fontWeight: '700', 
    color: '#E53935' 
  },
  bannerSub: { 
    fontSize: 12, 
    color: '#C62828', 
    marginTop: 2 },

  statsRow: {
     flexDirection: 'row', 
     gap: 10,
      marginBottom: 24 },
  stat: { 
    flex: 1, 
    backgroundColor: '#FFF', 
    borderRadius: 14, 
    padding: 16, 
    alignItems: 'center' 
  },
  statNum: { 
    fontSize: 24,
     fontWeight: '700',
      color: '#1A1A2E' 
    },
  statLabel: { 
    fontSize: 10,
     color: '#8A8A9A',
      marginTop: 4,
       textAlign: 'center'
       },

  sectionRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 }
    ,
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1A1A2E' 
  },
  seeAll: { 
    fontSize: 12,
     color: '#1565C0', 
     fontWeight: '600' 
    },

  emptyCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 14,
     padding: 30, 
    alignItems: 'center', 
    marginBottom: 20 
  },
  emptyText: { 
    fontSize: 15, 
    fontWeight: '600',
     color: '#1A1A2E' 
    },

  expiryCard: { 
    width: 150, 
    backgroundColor: '#FFF',
    borderRadius: 14, 
    padding: 14, 
    marginRight: 10, 
    borderLeftWidth: 3 
  },
  expiryName: { 
    fontSize: 14, 
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 3 
    },
  expiryBrand: {
     fontSize: 11,
    color: '#B5B5C3',
    marginBottom: 10 
    },
  badge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6, 
    alignSelf: 'flex-start'
   },
  badgeText: { 
    fontSize: 11, 
    fontWeight: '600' 
  },

  tip: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF',
    borderRadius: 14, 
    padding: 16,
    alignItems: 'center',
    gap: 12, 
    marginBottom: 30 
    },
  tipTitle: { 
    fontSize: 14,
    fontWeight: '600',
     color: '#1A1A2E' 
    },
  tipSub: { 
    fontSize: 11,
    color: '#8A8A9A',
    marginTop: 2 },

  tipIcon: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD', 
    padding: 8
   },
});
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { authFetch } from '../constants/api';
import BottomNav from '../components/BottomNav';

const screenWidth = Dimensions.get('window').width - 60;
const TABS = ['Analysis', 'Predictive', 'Habits'];

export default function AnalysisScreen() {
  const [activeTab, setActiveTab] = useState('Analysis');
  const [loading, setLoading] = useState(true);

  // Analysis
  const [summary, setSummary] = useState({ total_tracked: 0, used_count: 0, wasted_count: 0, active_count: 0, waste_rate: 0 });
  const [money, setMoney] = useState({ saved: 0, wasted: 0 });
  const [weekly, setWeekly] = useState<any[]>([]);

  // Predictive
  const [predictions, setPredictions] = useState<any[]>([]);
  const [predictiveLoading, setPredictiveLoading] = useState(false);

  // Habits
  const [categories, setCategories] = useState<any[]>([]);
  const [worstCategory, setWorstCategory] = useState<any>(null);
  const [bestCategory, setBestCategory] = useState<any>(null);
  const [habitsLoading, setHabitsLoading] = useState(false);

  useEffect(() => { fetchAnalysis(); }, []);

  useEffect(() => {
    if (activeTab === 'Predictive' && predictions.length === 0) fetchPredictions();
    if (activeTab === 'Habits' && categories.length === 0) fetchHabits();
  }, [activeTab]);

  const fetchAnalysis = async () => {
    try {
      const res = await authFetch('/analysis/overview');
      if (!res) return;
      const data = await res.json();
      if (data.status === 'success') {
        setSummary(data.summary);
        setMoney(data.money);
        setWeekly(data.weekly);
      }
    } catch (e) { console.log('Analysis error:', e); }
    finally { setLoading(false); }
  };

  const fetchPredictions = async () => {
    setPredictiveLoading(true);
    try {
      const res = await authFetch('/predictive/restock');
      if (!res) return;
      const data = await res.json();
      if (data.status === 'success') setPredictions(data.predictions);
    } catch (e) { console.log('Predictive error:', e); }
    finally { setPredictiveLoading(false); }
  };

  const fetchHabits = async () => {
    setHabitsLoading(true);
    try {
      const res = await authFetch('/habits/category-breakdown');
      if (!res) return;
      const data = await res.json();
      if (data.status === 'success') {
        setCategories(data.categories);
        setWorstCategory(data.worst_category);
        setBestCategory(data.best_category);
      }
    } catch (e) { console.log('Habits error:', e); }
    finally { setHabitsLoading(false); }
  };

  // Helpers
  const getStatusStyle = (status: string) => {
    if (status === 'overdue') return { bg: '#FFF0F0', text: '#E53935', label: 'Overdue' };
    if (status === 'soon') return { bg: '#FFF8E1', text: '#F57F17', label: 'Buy Soon' };
    if (status === 'upcoming') return { bg: '#E3F2FD', text: '#1565C0', label: 'Upcoming' };
    return { bg: '#F0F0F0', text: '#8A8A9A', label: 'Later' };
  };

  const getMethodStyle = (method: string) => {
    if (method === 'Random Forest') return { bg: '#F3E5F5', text: '#7B1FA2' };
    return { bg: '#E8F5E9', text: '#2E7D32' };
  };

  const getWasteColour = (rate: number) => {
    if (rate === 0) return '#2E7D32';
    if (rate <= 20) return '#4CAF50';
    if (rate <= 50) return '#F57F17';
    return '#E53935';
  };

  const chartConfig = {
    backgroundGradientFrom: '#FFF', backgroundGradientTo: '#FFF',
    color: (opacity = 1) => `rgba(229, 57, 53, ${opacity})`,
    labelColor: () => '#888', barPercentage: 0.6, decimalPlaces: 0,
    propsForBackgroundLines: { strokeDasharray: '', stroke: '#EEEEF2' },
  };

  const pieData = [
    { name: 'Used', count: summary.used_count, color: '#2E7D32', legendFontColor: '#444', legendFontSize: 13 },
    { name: 'Wasted', count: summary.wasted_count, color: '#E53935', legendFontColor: '#444', legendFontSize: 13 },
    { name: 'In Stock', count: summary.active_count, color: '#1565C0', legendFontColor: '#444', legendFontSize: 13 },
  ];

  // ── Analysis Tab ──
  const renderAnalysis = () => (
    <>
      <View style={s.row}>
        <View style={s.statCard}>
          <Text style={s.statNum}>{summary.total_tracked}</Text>
          <Text style={s.statLabel}>Total Tracked</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { color: '#2E7D32' }]}>{summary.used_count}</Text>
          <Text style={s.statLabel}>Used</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { color: '#E53935' }]}>{summary.wasted_count}</Text>
          <Text style={s.statLabel}>Wasted</Text>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>Waste Rate</Text>
        <Text style={[s.rateNum, { color: summary.waste_rate > 30 ? '#E53935' : summary.waste_rate > 15 ? '#F57F17' : '#2E7D32' }]}>
          {summary.waste_rate}%
        </Text>
        <Text style={s.cardHint}>
          {summary.waste_rate === 0 ? 'No waste recorded yet'
            : summary.waste_rate <= 15 ? 'Great job keeping waste low'
            : summary.waste_rate <= 30 ? 'Room for improvement'
            : 'Consider checking expiry dates more often'}
        </Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Item Breakdown</Text>
        {(summary.used_count + summary.wasted_count + summary.active_count) > 0 ? (
          <PieChart data={pieData} width={screenWidth} height={200} chartConfig={chartConfig}
            accessor="count" backgroundColor="transparent" paddingLeft="15" absolute />
        ) : (
          <Text style={s.noData}>No data yet. Start scanning items.</Text>
        )}
      </View>

      <View style={s.row}>
        <View style={[s.moneyCard, { borderLeftColor: '#2E7D32' }]}>
          <Text style={s.moneyLabel}>Money Saved</Text>
          <Text style={[s.moneyNum, { color: '#2E7D32' }]}>£{money.saved.toFixed(2)}</Text>
        </View>
        <View style={[s.moneyCard, { borderLeftColor: '#E53935' }]}>
          <Text style={s.moneyLabel}>Money Wasted</Text>
          <Text style={[s.moneyNum, { color: '#E53935' }]}>£{money.wasted.toFixed(2)}</Text>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Weekly Trends</Text>
        <Text style={s.cardSub}>Wasted items per week (last 8 weeks)</Text>
        {weekly.length > 0 && weekly.some(w => w.wasted > 0) ? (
          <BarChart
            data={{ labels: weekly.map(w => w.week), datasets: [{ data: weekly.map(w => w.wasted) }] }}
            width={screenWidth} height={220} chartConfig={chartConfig}
            yAxisLabel="" yAxisSuffix="" fromZero showValuesOnTopOfBars
            style={{ borderRadius: 12 }} />
        ) : (
          <Text style={s.noData}>Not enough data for trends yet.</Text>
        )}
      </View>
    </>
  );

  // ── Predictive Tab ──
  const renderPredictive = () => (
    <>
      <View style={s.card}>
        <Text style={s.cardTitle}>Predictive Restocking</Text>
        <Text style={s.cardSub}>
          Predicts when you'll need to rebuy products.
        </Text>
      </View>

      {predictiveLoading ? (
        <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 40 }} />
      ) : predictions.length === 0 ? (
        <View style={s.card}>
          <Text style={s.noData}>Not enough purchase history yet. Buy items more than once to see predictions.</Text>
        </View>
      ) : (
        predictions.map((pred, index) => {
          const statusStyle = getStatusStyle(pred.status);
          const methodStyle = getMethodStyle(pred.method);
          return (
            <View key={index} style={s.predCard}>
              <View style={s.predHeader}>
                <Text style={s.predName} numberOfLines={1}>{pred.product}</Text>
                <View style={[s.badge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[s.badgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
                </View>
              </View>
              <View style={s.predRow}><Text style={s.predLabel}>Purchase cycle</Text><Text style={s.predValue}>Every {pred.avg_days_between} days</Text></View>
              <View style={s.predRow}><Text style={s.predLabel}>Last bought</Text><Text style={s.predValue}>{pred.last_purchased}</Text></View>
              <View style={s.predRow}>
                <Text style={s.predLabel}>Next restock</Text>
                <Text style={[s.predValue, { color: statusStyle.text }]}>
                  {pred.days_until < 0 ? `${Math.abs(pred.days_until)} days overdue` : pred.days_until === 0 ? 'Today' : `In ${pred.days_until} days`}
                </Text>
              </View>
              <View style={s.predFooter}>
                <Text style={s.predFooterText}>{pred.purchase_count} purchases</Text>
          
              </View>
            </View>
          );
        })
      )}
    </>
  );

  // ── Habits Tab ──
  const renderHabits = () => (
    <>
      <View style={s.card}>
        <Text style={s.cardTitle}>Category Waste Breakdown</Text>
        <Text style={s.cardSub}>See which food categories you waste the most</Text>
      </View>

      {habitsLoading ? (
        <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 40 }} />
      ) : categories.length === 0 ? (
        <View style={s.card}>
          <Text style={s.noData}>No data yet. Start tracking items to see your habits.</Text>
        </View>
      ) : (
        <>
          {/* Worst and Best summary */}
          {worstCategory && bestCategory && (
            <View style={s.row}>
              <View style={[s.summaryCard, { borderLeftColor: '#E53935' }]}>
                <Text style={s.summaryCardLabel}>Most Wasted</Text>
                <Text style={s.summaryCardValue}>{worstCategory.category}</Text>
                <Text style={[s.summaryCardRate, { color: '#E53935' }]}>{worstCategory.waste_rate}% waste</Text>
              </View>
              <View style={[s.summaryCard, { borderLeftColor: '#2E7D32' }]}>
                <Text style={s.summaryCardLabel}>Best Managed</Text>
                <Text style={s.summaryCardValue}>{bestCategory.category}</Text>
                <Text style={[s.summaryCardRate, { color: '#2E7D32' }]}>{bestCategory.waste_rate}% waste</Text>
              </View>
            </View>
          )}

          {/* Category cards */}
          {categories.map((cat, index) => (
            <View key={index} style={s.habitCard}>
              <View style={s.habitHeader}>
                <Text style={s.habitName}>{cat.category}</Text>
                <Text style={[s.habitRate, { color: getWasteColour(cat.waste_rate) }]}>
                  {cat.waste_rate}% waste
                </Text>
              </View>

              {/* Progress bar */}
              <View style={s.progressBg}>
                <View style={[s.progressFill, {
                  width: `${Math.min(cat.waste_rate, 100)}%`,
                  backgroundColor: getWasteColour(cat.waste_rate),
                }]} />
              </View>

              {/* Stats row */}
              <View style={s.habitStats}>
                <Text style={s.habitStat}>{cat.total} total</Text>
                <Text style={[s.habitStat, { color: '#2E7D32' }]}>{cat.used} used</Text>
                <Text style={[s.habitStat, { color: '#E53935' }]}>{cat.wasted} wasted</Text>
                <Text style={[s.habitStat, { color: '#1565C0' }]}>{cat.active} active</Text>
              </View>

              {/* Suggestion */}
              <Text style={s.habitSuggestion}>{cat.suggestion}</Text>
            </View>
          ))}
        </>
      )}
    </>
  );

  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.header}>Insights</Text>

      <View style={s.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && activeTab === 'Analysis' ? (
        <View style={s.loadingContainer}><ActivityIndicator size="large" color="#2E7D32" /></View>
      ) : (
        <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'Analysis' && renderAnalysis()}
          {activeTab === 'Predictive' && renderPredictive()}
          {activeTab === 'Habits' && renderHabits()}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      <BottomNav />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7F9' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#1A1A2E', textAlign: 'center', marginTop: 10, marginBottom: 12 },
  content: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  tabRow: { flexDirection: 'row', backgroundColor: '#EEEEF2', borderRadius: 12, padding: 4, marginHorizontal: 20, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#999' },
  tabTextActive: { color: '#1A1A2E' },

  row: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  cardSub: { fontSize: 11, color: '#8A8A9A', marginBottom: 12, lineHeight: 16 },
  cardLabel: { fontSize: 12, fontWeight: '600', color: '#8A8A9A', marginBottom: 4, textAlign: 'center' },
  cardHint: { fontSize: 12, color: '#8A8A9A', marginTop: 6, textAlign: 'center' },
  noData: { fontSize: 13, color: '#BBB', textAlign: 'center', paddingVertical: 30 },

  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  statNum: { fontSize: 28, fontWeight: '700', color: '#1A1A2E' },
  statLabel: { fontSize: 11, color: '#8A8A9A', marginTop: 4 },
  rateNum: { fontSize: 36, fontWeight: '800', textAlign: 'center' },

  moneyCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  moneyLabel: { fontSize: 11, color: '#8A8A9A', marginBottom: 4 },
  moneyNum: { fontSize: 22, fontWeight: '700' },

  // Prediction cards
  predCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  predHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  predName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  predRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  predLabel: { fontSize: 13, color: '#8A8A9A' },
  predValue: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  predFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EEEEF2', paddingTop: 10, marginTop: 6 },
  predFooterText: { fontSize: 11, color: '#BBB' },

  // Habits cards
  summaryCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  summaryCardLabel: { fontSize: 11, color: '#8A8A9A', marginBottom: 2 },
  summaryCardValue: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  summaryCardRate: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  habitCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  habitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  habitName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  habitRate: { fontSize: 14, fontWeight: '700' },

  progressBg: { height: 6, backgroundColor: '#EEEEF2', borderRadius: 3, marginBottom: 10 },
  progressFill: { height: 6, borderRadius: 3 },

  habitStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  habitStat: { fontSize: 11, color: '#8A8A9A', fontWeight: '500' },

  habitSuggestion: { fontSize: 12, color: '#666', fontStyle: 'italic', lineHeight: 18 },
});
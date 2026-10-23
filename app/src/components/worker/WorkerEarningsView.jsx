import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { BrandColors } from '@/constants/theme';
import { workersAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { WorkerWalletModal } from './WorkerWalletModal';

export const WorkerEarningsView = () => {
  const { authToken } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('today'); // 'today' | 'yesterday' | '7days' | 'month' | 'all'
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [earningsData, setEarningsData] = useState(null);
  const [walletModalVisible, setWalletModalVisible] = useState(false);


  const loadEarnings = async (period = selectedPeriod) => {
    try {
      const res = await workersAPI.getEarnings(period, null, null, authToken);
      if (res && res.success) {
        setEarningsData(res);
      }
    } catch (err) {
      console.warn('[WORKER] Error loading earnings:', err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadEarnings(selectedPeriod);
  }, [selectedPeriod, authToken]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadEarnings(selectedPeriod);
  };

  const periodLabel =
    selectedPeriod === 'today'
      ? "Today's Earnings"
      : selectedPeriod === 'yesterday'
      ? "Yesterday's Earnings"
      : selectedPeriod === '7days'
      ? 'Last 7 Days (Weekly Cycle)'
      : selectedPeriod === 'month'
      ? 'This Month'
      : 'All Time Earnings';

  const currentStats =
    selectedPeriod === 'today'
      ? earningsData?.today || { earnings: 0, grossVolume: 0, commissionDeducted: 0, jobsDone: 0 }
      : earningsData?.periodStats || { earnings: 0, grossVolume: 0, commissionDeducted: 0, jobsDone: 0 };

  const policy = earningsData?.commissionPolicy || {
    freeOrdersTotal: 2,
    freeOrdersUsed: 0,
    freeOrdersRemaining: 2,
    currentCommissionRate: 0,
  };

  const weeklyPayout = earningsData?.weeklyPayout || {
    netPayoutAmount: 0,
    grossAmount: 0,
    commissionDeducted: 0,
    jobsCount: 0,
    status: 'paid',
    nextPayoutDate: 'Every Monday',
  };

  const transactions = earningsData?.transactions || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FBBF24" />}
      showsVerticalScrollIndicator={false}>
      
      {/* 1. Header & Title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings & Settlements</Text>
        <Text style={styles.headerSub}>Transparent payouts • 0% fee on first 2 orders</Text>
      </View>

      {/* 2. Custom Day / Period Selector Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.periodPillsRow}>
        {[
          { key: 'today', label: "Today (Default)" },
          { key: 'yesterday', label: 'Yesterday' },
          { key: '7days', label: 'Last 7 Days' },
          { key: 'month', label: 'This Month' },
          { key: 'all', label: 'All Time' },
        ].map((p) => {
          const isActive = selectedPeriod === p.key;
          return (
            <Pressable
              key={p.key}
              onPress={() => setSelectedPeriod(p.key)}
              style={[styles.periodPill, isActive && styles.periodPillActive]}>
              <Text style={[styles.periodPillText, isActive && styles.periodPillTextActive]}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 3. Primary Earning Metric Card */}
      <View style={styles.mainEarningCard}>
        <View style={styles.metricTopRow}>
          <Text style={styles.metricLabel}>{periodLabel}</Text>
          <View style={styles.jobsBadge}>
            <Text style={styles.jobsBadgeText}>{currentStats.jobsDone} Jobs Done</Text>
          </View>
        </View>

        <Text style={styles.metricValue}>₹{currentStats.earnings.toLocaleString('en-IN')}</Text>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownCol}>
            <Text style={styles.breakdownKey}>Gross Customer Bill</Text>
            <Text style={styles.breakdownVal}>₹{currentStats.grossVolume.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownCol}>
            <Text style={styles.breakdownKey}>Company Profit (20%)</Text>
            <Text style={[styles.breakdownVal, { color: '#EF4444' }]}>
              - ₹{currentStats.commissionDeducted.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownCol}>
            <Text style={styles.breakdownKey}>Your Net Payout</Text>
            <Text style={[styles.breakdownVal, { color: '#10B981' }]}>
              ₹{currentStats.earnings.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>

      {/* 4. First 2 Bookings 0% Commission & 20% Policy Banner (Prompt 5) */}
      <View style={styles.policyCard}>
        <View style={styles.policyHeaderRow}>
          <Text style={styles.policyIcon}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.policyTitle}>Sastayu Partner Commission Policy</Text>
            <Text style={styles.policySub}>
              First 2 bookings are 100% FREE (0% platform charge). Order 3 onwards: 20% platform fee.
            </Text>
          </View>
        </View>

        {/* Example Callout */}
        <View style={styles.exampleBox}>
          <Text style={styles.exampleText}>
            💡 <Text style={{ fontWeight: '700' }}>Example:</Text> If customer bill is ₹1,000, company profit is ₹200 (20%), and you take home ₹800 (80%)!
          </Text>
        </View>

        {/* Free Orders Progress Tracker */}
        <View style={styles.trackerRow}>
          <View style={[styles.trackerStep, policy.freeOrdersUsed >= 1 && styles.trackerStepDone]}>
            <Text style={styles.trackerStepText}>
              {policy.freeOrdersUsed >= 1 ? '✓ Order 1: Free (₹0 fee)' : '○ Order 1: Free (0%)'}
            </Text>
          </View>
          <View style={[styles.trackerStep, policy.freeOrdersUsed >= 2 && styles.trackerStepDone]}>
            <Text style={styles.trackerStepText}>
              {policy.freeOrdersUsed >= 2 ? '✓ Order 2: Free (₹0 fee)' : '○ Order 2: Free (0%)'}
            </Text>
          </View>
          <View style={[styles.trackerStep, policy.freeOrdersUsed >= 2 && styles.trackerStepStandard]}>
            <Text style={styles.trackerStepText}>
              {policy.freeOrdersUsed >= 2 ? '⚡ Order 3+: 20% Fee' : 'Order 3+: 20%'}
            </Text>
          </View>
        </View>
      </View>

      {/* 5. 7-Day Weekly Payout Settlement Status (Prompt 5) */}
      <View style={styles.settlementCard}>
        <View style={styles.settlementTopRow}>
          <View>
            <Text style={styles.settlementTitle}>7-Day Weekly Settlement</Text>
            <Text style={styles.settlementSub}>Direct bank payout settled every 7 days</Text>
          </View>
          <View style={[styles.payoutStatusBadge, weeklyPayout.status === 'paid' ? styles.statusPaid : styles.statusPending]}>
            <Text style={[styles.payoutStatusText, weeklyPayout.status === 'paid' ? styles.statusTextPaid : styles.statusTextPending]}>
              {weeklyPayout.status === 'paid' ? '✓ Paid in 7 Days' : '⏳ Pending Transfer'}
            </Text>
          </View>
        </View>

        <View style={styles.settlementGrid}>
          <View style={styles.settlementGridItem}>
            <Text style={styles.gridKey}>7-Day Amount</Text>
            <Text style={styles.gridVal}>₹{weeklyPayout.netPayoutAmount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.settlementGridItem}>
            <Text style={styles.gridKey}>Payout Cycle</Text>
            <Text style={styles.gridVal}>7 Days (Weekly)</Text>
          </View>
          <View style={styles.settlementGridItem}>
            <Text style={styles.gridKey}>Next Payout</Text>
            <Text style={styles.gridVal}>{weeklyPayout.nextPayoutDate}</Text>
          </View>
        </View>

        {weeklyPayout.transactionRef && (
          <Text style={styles.payoutRefText}>
            Ref: {weeklyPayout.transactionRef} • Settled to registered bank A/C
          </Text>
        )}

        <Pressable
          onPress={() =>
            Alert.alert(
              'Weekly Payout Request',
              `Your 7-day balance of ₹${weeklyPayout.netPayoutAmount.toLocaleString('en-IN')} will be automatically transferred to your bank account every Monday morning.`
            )
          }
          style={styles.requestPayoutBtn}>
          <Text style={styles.requestPayoutText}>View Bank Account Details</Text>
        </Pressable>
      </View>

      {/* Coin Wallet Top-Up Banner */}
      <Pressable
        onPress={() => setWalletModalVisible(true)}
        style={({ pressed }) => [styles.coinWalletBanner, pressed && styles.pressed]}>
        <View style={styles.coinWalletLeft}>
          <Text style={styles.coinWalletIcon}>🪙</Text>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.coinWalletTitle}>Acceptance Coin Wallet</Text>
            <Text style={styles.coinWalletSub}>Overdraft allowed down to -50 Coins • Recharge with Razorpay</Text>
          </View>
        </View>
        <View style={styles.coinRechargeBtn}>
          <Text style={styles.coinRechargeBtnText}>Recharge 💳</Text>
        </View>
      </Pressable>

      {/* 6. Completed Orders Itemized Breakdown */}
      <View style={styles.ordersSection}>

        <Text style={styles.sectionTitle}>
          Order Breakdown ({transactions.length})
        </Text>

        {isLoading ? (
          <ActivityIndicator color="#FBBF24" style={{ marginVertical: 24 }} />
        ) : transactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No completed orders in this period</Text>
            <Text style={styles.emptySub}>
              Accept and complete service requests to see your detailed earnings breakdown here.
            </Text>
          </View>
        ) : (
          transactions.map((t) => (
            <View key={t.id} style={styles.orderCard}>
              <View style={styles.orderCardHeader}>
                <View>
                  <Text style={styles.orderServiceTitle}>{t.serviceTitle}</Text>
                  <Text style={styles.orderCustomer}>{t.customerName} • {t.bookingNumber}</Text>
                </View>
                <View style={[styles.feeTierBadge, t.isFreeTier ? styles.feeTierFree : styles.feeTier20]}>
                  <Text style={[styles.feeTierText, t.isFreeTier ? styles.feeTierTextFree : styles.feeTierText20]}>
                    {t.isFreeTier ? '0% Free Tier' : '20% Fee'}
                  </Text>
                </View>
              </View>

              <View style={styles.orderBillDetails}>
                <View style={styles.billLine}>
                  <Text style={styles.billLineKey}>Gross Customer Bill</Text>
                  <Text style={styles.billLineVal}>₹{t.grossAmount}</Text>
                </View>
                <View style={styles.billLine}>
                  <Text style={styles.billLineKey}>
                    Sastayu Fee ({t.isFreeTier ? '0%' : '20%'})
                  </Text>
                  <Text style={[styles.billLineVal, { color: t.isFreeTier ? '#10B981' : '#EF4444' }]}>
                    {t.isFreeTier ? '₹0 (Free)' : `- ₹${t.commissionAmount}`}
                  </Text>
                </View>
                <View style={styles.billDivider} />
                <View style={styles.billLine}>
                  <Text style={[styles.billLineKey, { fontWeight: '700', color: '#0F172A' }]}>
                    Your Net Take-Home
                  </Text>
                  <Text style={[styles.billLineVal, { fontWeight: '800', color: '#10B981', fontSize: 16 }]}>
                    ₹{t.netAmount}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Technician Coin Wallet & Razorpay Modal */}
      <WorkerWalletModal
        visible={walletModalVisible}
        onClose={() => setWalletModalVisible(false)}
        onBalanceUpdated={() => loadEarnings(selectedPeriod)}
      />
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  periodPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 4,
  },
  periodPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  periodPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  periodPillTextActive: {
    color: '#FBBF24',
    fontWeight: '700',
  },
  mainEarningCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  metricTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jobsBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  jobsBadgeText: {
    fontSize: 12,
    color: '#FBBF24',
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
  },
  breakdownCol: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  breakdownKey: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 4,
    textAlign: 'center',
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  policyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  policyHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  policyIcon: {
    fontSize: 28,
  },
  policyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  policySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
  },
  exampleBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  trackerRow: {
    flexDirection: 'row',
    gap: 6,
  },
  trackerStep: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  trackerStepDone: {
    backgroundColor: '#D1FAE5',
  },
  trackerStepStandard: {
    backgroundColor: '#E0E7FF',
  },
  trackerStepText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  settlementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settlementTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  settlementTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  settlementSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  payoutStatusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusPaid: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  payoutStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusTextPaid: {
    color: '#065F46',
  },
  statusTextPending: {
    color: '#92400E',
  },
  settlementGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  settlementGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  gridKey: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  gridVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  payoutRefText: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  requestPayoutBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  requestPayoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  ordersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderServiceTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderCustomer: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  feeTierBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  feeTierFree: {
    backgroundColor: '#D1FAE5',
  },
  feeTier20: {
    backgroundColor: '#FEE2E2',
  },
  feeTierText: {
    fontSize: 10,
    fontWeight: '800',
  },
  feeTierTextFree: {
    color: '#065F46',
  },
  feeTierText20: {
    color: '#991B1B',
  },
  orderBillDetails: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  billLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billLineKey: {
    fontSize: 12,
    color: '#64748B',
  },
  billLineVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  coinWalletBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  coinWalletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coinWalletIcon: {
    fontSize: 26,
  },
  coinWalletTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FACC15',
  },
  coinWalletSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 15,
  },
  coinRechargeBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginLeft: 8,
  },
  coinRechargeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
});


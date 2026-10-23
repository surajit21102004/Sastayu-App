import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { adminAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export const AdminPortal = () => {
  const { logout, authToken } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'workers' | 'earnings' | 'payouts'
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data states
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [workerEarnings, setWorkerEarnings] = useState(null);
  const [earningsPeriod, setEarningsPeriod] = useState('today'); // 'today' | '7days' | 'all'
  const [payouts, setPayouts] = useState([]);

  // Search states
  const [userSearch, setUserSearch] = useState('');
  const [workerSearch, setWorkerSearch] = useState('');

  // Settlement Modal State
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [selectedWorkerForPayout, setSelectedWorkerForPayout] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutRef, setPayoutRef] = useState('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  // Load all admin data
  const loadAdminData = async () => {
    try {
      const [ovRes, uRes, wRes, eRes, pRes] = await Promise.all([
        adminAPI.getOverview(authToken),
        adminAPI.getUsers(userSearch, authToken),
        adminAPI.getWorkers(workerSearch, authToken),
        adminAPI.getWorkerEarnings(earningsPeriod, authToken),
        adminAPI.getPayouts(authToken),
      ]);

      if (ovRes?.success) setOverview(ovRes.metrics);
      if (uRes?.success) setUsers(uRes.users);
      if (wRes?.success) setWorkers(wRes.workers);
      if (eRes?.success) setWorkerEarnings(eRes);
      if (pRes?.success) setPayouts(pRes.payouts);
    } catch (err) {
      console.warn('[ADMIN] Error loading data:', err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [authToken, earningsPeriod]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadAdminData();
  };

  // Toggle user status
  const handleToggleUserStatus = async (user) => {
    const newRole = user.role === 'customer' ? 'blocked' : 'customer';
    try {
      const res = await adminAPI.updateUserStatus(user.id, newRole, authToken);
      if (res?.success) {
        Alert.alert('User Updated', `Customer ${user.phone} status changed to ${newRole}.`);
        loadAdminData();
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Toggle worker status
  const handleToggleWorkerStatus = async (worker, targetStatus) => {
    try {
      const res = await adminAPI.updateWorkerStatus(worker.id, targetStatus, authToken);
      if (res?.success) {
        Alert.alert('Worker Updated', `${worker.name} status updated to ${targetStatus}.`);
        loadAdminData();
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Open Settle Modal
  const openSettleModal = (item) => {
    setSelectedWorkerForPayout(item);
    setPayoutAmount(String(item.pendingPayout || item.workerNetPayout || ''));
    setPayoutRef(`UTR-${Date.now().toString().slice(-8)}`);
    setSettleModalVisible(true);
  };

  // Submit Payout
  const handleConfirmSettlePayout = async () => {
    if (!selectedWorkerForPayout) return;
    setIsSubmittingPayout(true);
    try {
      const res = await adminAPI.settlePayout(
        {
          workerId: selectedWorkerForPayout.workerId || selectedWorkerForPayout.id,
          amount: Number(payoutAmount) || 0,
          transactionRef: payoutRef.trim() || undefined,
          status: 'paid',
          notes: '7-day weekly payout processed by Admin',
        },
        authToken
      );

      if (res?.success) {
        Alert.alert('Payout Settled! 🎉', res.message);
        setSettleModalVisible(false);
        loadAdminData();
      } else {
        Alert.alert('Error', res?.message || 'Could not record payout.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* 1. Executive Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderCol}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>👑 ADMIN PORTAL</Text>
          </View>
          <Text style={styles.headerTitle}>Sastayu Executive HQ</Text>
        </View>

        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutBtnText}>Exit</Text>
        </Pressable>
      </View>

      {/* 2. Horizontal Navigation Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.navTabsRow}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'earnings', label: '💰 Our Profit & Earnings' },
          { key: 'payouts', label: '💳 7-Day Settlements' },
          { key: 'users', label: '👥 Users' },
          { key: 'workers', label: '👷 Workers' },
        ].map((t) => {
          const isActive = activeTab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              style={[styles.navTab, isActive && styles.navTabActive]}>
              <Text style={[styles.navTabText, isActive && styles.navTabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 3. Tab Content */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#FBBF24" />}
        showsVerticalScrollIndicator={false}>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <View>
            {/* Highlights: Company Profit */}
            <View style={styles.kpiCardGold}>
              <Text style={styles.kpiCardLabel}>Total Company Profit (20% Platform Fee)</Text>
              <Text style={styles.kpiCardValue}>
                ₹{(overview?.totalCompanyProfit || 0).toLocaleString('en-IN')}
              </Text>
              <View style={styles.kpiSubRow}>
                <Text style={styles.kpiSubText}>
                  Today's Profit: <Text style={{ fontWeight: '800', color: '#10B981' }}>₹{(overview?.todayCompanyProfit || 0).toLocaleString('en-IN')}</Text>
                </Text>
                <Text style={styles.kpiSubText}>
                  7-Day Profit: <Text style={{ fontWeight: '800', color: '#FBBF24' }}>₹{(overview?.last7DaysProfit || 0).toLocaleString('en-IN')}</Text>
                </Text>
              </View>
            </View>

            {/* Metrics Grid */}
            <View style={styles.grid2Col}>
              <View style={styles.gridCard}>
                <Text style={styles.gridCardVal}>{overview?.totalUsers || 0}</Text>
                <Text style={styles.gridCardKey}>Total Customers</Text>
              </View>
              <View style={styles.gridCard}>
                <Text style={styles.gridCardVal}>
                  {overview?.totalWorkers || 0}{' '}
                  <Text style={{ fontSize: 13, color: '#10B981' }}>({overview?.onlineWorkers || 0} Online)</Text>
                </Text>
                <Text style={styles.gridCardKey}>Registered Workers</Text>
              </View>
              <View style={styles.gridCard}>
                <Text style={styles.gridCardVal}>{overview?.totalBookings || 0}</Text>
                <Text style={styles.gridCardKey}>Total Bookings</Text>
              </View>
              <View style={styles.gridCard}>
                <Text style={styles.gridCardVal}>
                  ₹{(overview?.grossVolume || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.gridCardKey}>Gross Volume</Text>
              </View>
            </View>

            {/* 7-Day Settlement Status Card */}
            <View style={styles.settlementAlertBox}>
              <Text style={styles.settlementAlertTitle}>7-Day Settlement Status</Text>
              <Text style={styles.settlementAlertSub}>
                {overview?.pendingWorkersCount || 0} worker(s) pending 7-day payout (Total: ₹
                {(overview?.pendingSettlementAmount || 0).toLocaleString('en-IN')})
              </Text>
              <Pressable onPress={() => setActiveTab('payouts')} style={styles.viewPayoutsBtn}>
                <Text style={styles.viewPayoutsText}>Open 7-Day Settlement Manager →</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* TAB 2: WORKER DAILY EARNINGS & COMPANY PROFIT ("OUR PROFIT") */}
        {activeTab === 'earnings' && (
          <View>
            <View style={styles.periodRow}>
              <Text style={styles.sectionHeaderTitle}>Earnings & Company Profit</Text>
              <View style={styles.periodPillContainer}>
                {[
                  { key: 'today', label: 'Today' },
                  { key: '7days', label: 'Last 7 Days' },
                  { key: 'all', label: 'All Time' },
                ].map((p) => (
                  <Pressable
                    key={p.key}
                    onPress={() => setEarningsPeriod(p.key)}
                    style={[styles.smallPill, earningsPeriod === p.key && styles.smallPillActive]}>
                    <Text
                      style={[
                        styles.smallPillText,
                        earningsPeriod === p.key && styles.smallPillTextActive,
                      ]}>
                      {p.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Profit Summary Card */}
            <View style={styles.profitSummaryCard}>
              <View style={styles.profitRow}>
                <View style={styles.profitCol}>
                  <Text style={styles.profitKey}>Gross Customer Billings</Text>
                  <Text style={styles.profitVal}>
                    ₹{(workerEarnings?.summary?.totalGross || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.profitDivider} />
                <View style={styles.profitCol}>
                  <Text style={[styles.profitKey, { color: '#FBBF24', fontWeight: '700' }]}>
                    Our Profit (20%)
                  </Text>
                  <Text style={[styles.profitVal, { color: '#FBBF24', fontSize: 20 }]}>
                    ₹{(workerEarnings?.summary?.totalCompanyProfit || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.profitDivider} />
                <View style={styles.profitCol}>
                  <Text style={styles.profitKey}>Worker Net (80%)</Text>
                  <Text style={[styles.profitVal, { color: '#10B981' }]}>
                    ₹{(workerEarnings?.summary?.totalWorkerNet || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
              <Text style={styles.profitNote}>
                * First 2 bookings for each worker are charged 0% commission (Company profit ₹0). Every booking after that charges 20% platform fee.
              </Text>
            </View>

            {/* List of Workers and their Earnings & Profit */}
            <Text style={[styles.sectionHeaderTitle, { marginTop: 16, marginBottom: 10 }]}>
              Technicians Breakdown ({workerEarnings?.workers?.length || 0})
            </Text>

            {workerEarnings?.workers?.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No worker earnings recorded for this period.</Text>
              </View>
            ) : (
              workerEarnings?.workers?.map((w) => (
                <View key={w.workerId} style={styles.workerEarningItem}>
                  <View style={styles.workerEarningHeader}>
                    <View>
                      <Text style={styles.workerEarningName}>{w.name}</Text>
                      <Text style={styles.workerEarningTrade}>
                        {w.trade} • {w.phone}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.settlementPill,
                        w.payoutStatus === 'paid' ? styles.settlePaid : styles.settlePending,
                      ]}>
                      <Text
                        style={[
                          styles.settleText,
                          w.payoutStatus === 'paid' ? styles.settleTextPaid : styles.settleTextPending,
                        ]}>
                        {w.payoutStatus === 'paid' ? '✓ Paid in 7 Days' : '⏳ Pending'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.earningNumbersGrid}>
                    <View style={styles.earningGridCell}>
                      <Text style={styles.earningCellKey}>Jobs</Text>
                      <Text style={styles.earningCellVal}>{w.jobsCount}</Text>
                    </View>
                    <View style={styles.earningGridCell}>
                      <Text style={styles.earningCellKey}>Gross</Text>
                      <Text style={styles.earningCellVal}>₹{w.grossAmount}</Text>
                    </View>
                    <View style={styles.earningGridCell}>
                      <Text style={[styles.earningCellKey, { color: '#FBBF24' }]}>Our Profit</Text>
                      <Text style={[styles.earningCellVal, { color: '#FBBF24' }]}>
                        ₹{w.companyProfit}
                      </Text>
                    </View>
                    <View style={styles.earningGridCell}>
                      <Text style={[styles.earningCellKey, { color: '#10B981' }]}>Worker Net</Text>
                      <Text style={[styles.earningCellVal, { color: '#10B981' }]}>
                        ₹{w.workerNetPayout}
                      </Text>
                    </View>
                  </View>

                  {w.payoutStatus === 'pending' && (
                    <Pressable
                      onPress={() => openSettleModal(w)}
                      style={styles.settleQuickBtn}>
                      <Text style={styles.settleQuickText}>
                        Mark as Paid (₹{w.workerNetPayout}) →
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: 7-DAY SETTLEMENTS ("IS PAID IN 7 DAYS OR NOT") */}
        {activeTab === 'payouts' && (
          <View>
            <Text style={styles.sectionHeaderTitle}>Weekly 7-Day Settlement Tracker</Text>
            <Text style={styles.sectionHeaderSub}>
              Track whether each technician is paid for their 7-day cycle or pending settlement.
            </Text>

            {payouts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No payouts recorded.</Text>
              </View>
            ) : (
              payouts.map((p) => (
                <View key={p.workerId} style={styles.payoutCard}>
                  <View style={styles.payoutCardHeader}>
                    <View>
                      <Text style={styles.payoutWorkerName}>{p.workerName}</Text>
                      <Text style={styles.payoutWorkerSub}>
                        {p.workerTrade} • {p.workerPhone}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.settlementPill,
                        p.isPaidIn7Days ? styles.settlePaid : styles.settlePending,
                      ]}>
                      <Text
                        style={[
                          styles.settleText,
                          p.isPaidIn7Days ? styles.settleTextPaid : styles.settleTextPending,
                        ]}>
                        {p.isPaidIn7Days ? '✓ Paid in 7 Days' : '⏳ Pending / Due'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.payoutAmountsRow}>
                    <View>
                      <Text style={styles.payoutAmountLabel}>Pending 7-Day Due</Text>
                      <Text
                        style={[
                          styles.payoutAmountValue,
                          { color: p.pendingPayout > 0 ? '#EF4444' : '#10B981' },
                        ]}>
                        ₹{p.pendingPayout.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.payoutAmountLabel}>Settled Lifetime</Text>
                      <Text style={styles.payoutAmountValue}>
                        ₹{p.settledPayout.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.payoutAmountLabel}>Our Profit Generated</Text>
                      <Text style={[styles.payoutAmountValue, { color: '#FBBF24' }]}>
                        ₹{p.companyProfit.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  {p.lastPayoutRef && (
                    <Text style={styles.lastPayoutRef}>
                      Last Transfer Ref: {p.lastPayoutRef}
                    </Text>
                  )}

                  {p.pendingPayout > 0 ? (
                    <Pressable
                      onPress={() => openSettleModal(p)}
                      style={styles.markAsPaidBtn}>
                      <Text style={styles.markAsPaidText}>
                        Mark as Paid (Disburse ₹{p.pendingPayout})
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={styles.upToDateNotice}>
                      <Text style={styles.upToDateText}>✓ All 7-day earnings settled up to date</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 4: MANAGE USERS */}
        {activeTab === 'users' && (
          <View>
            <Text style={styles.sectionHeaderTitle}>Manage Registered Customers</Text>
            <TextInput
              style={styles.searchBar}
              placeholder="Search customers by name, phone..."
              placeholderTextColor="#94A3B8"
              value={userSearch}
              onChangeText={setUserSearch}
              onSubmitEditing={() => adminAPI.getUsers(userSearch, authToken).then((r) => r?.users && setUsers(r.users))}
            />

            {users.map((u) => (
              <View key={u.id} style={styles.userCard}>
                <View style={styles.userCardHeader}>
                  <View>
                    <Text style={styles.userName}>{u.name}</Text>
                    <Text style={styles.userPhone}>+91 {u.phone}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      u.role === 'customer' ? styles.statusActive : styles.statusBlocked,
                    ]}>
                    <Text
                      style={[
                        styles.statusBadgeText,
                        u.role === 'customer' ? styles.statusTextActive : styles.statusTextBlocked,
                      ]}>
                      {u.role === 'customer' ? 'Active' : 'Blocked'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.userAddress}>📍 {u.address}</Text>

                <View style={styles.userMetaRow}>
                  <Text style={styles.userMetaText}>Orders: {u.totalBookings}</Text>
                  <Text style={styles.userMetaText}>Spent: ₹{u.totalSpend}</Text>
                  <Text style={styles.userMetaText}>Age: {u.age || 'N/A'}</Text>
                </View>

                <Pressable
                  onPress={() => handleToggleUserStatus(u)}
                  style={[
                    styles.userActionBtn,
                    u.role === 'customer' ? styles.btnDanger : styles.btnSuccess,
                  ]}>
                  <Text style={styles.userActionBtnText}>
                    {u.role === 'customer' ? 'Block User' : 'Unblock / Activate User'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* TAB 5: MANAGE WORKERS */}
        {activeTab === 'workers' && (
          <View>
            <Text style={styles.sectionHeaderTitle}>Manage Service Partners</Text>
            <TextInput
              style={styles.searchBar}
              placeholder="Search technicians by trade, name, phone..."
              placeholderTextColor="#94A3B8"
              value={workerSearch}
              onChangeText={setWorkerSearch}
              onSubmitEditing={() => adminAPI.getWorkers(workerSearch, authToken).then((r) => r?.workers && setWorkers(r.workers))}
            />

            {workers.map((w) => (
              <View key={w.id} style={styles.workerManageCard}>
                <View style={styles.workerManageHeader}>
                  <View>
                    <Text style={styles.workerManageName}>{w.name}</Text>
                    <Text style={styles.workerManageTrade}>
                      {w.trade} • +91 {w.phone}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      w.status === 'active'
                        ? styles.statusActive
                        : w.status === 'pending_kyc'
                        ? styles.statusPendingKYC
                        : styles.statusBlocked,
                    ]}>
                    <Text
                      style={[
                        styles.statusBadgeText,
                        w.status === 'active'
                          ? styles.statusTextActive
                          : w.status === 'pending_kyc'
                          ? styles.statusTextPendingKYC
                          : styles.statusTextBlocked,
                      ]}>
                      {w.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.workerStatsRow}>
                  <Text style={styles.workerStatItem}>★ {w.rating} Rating</Text>
                  <Text style={styles.workerStatItem}>💼 {w.totalJobs} Jobs Done</Text>
                  <Text style={styles.workerStatItem}>
                    {w.isOnline ? '🟢 Online' : '⚪ Offline'}
                  </Text>
                </View>

                <View style={styles.kycInfoBox}>
                  <Text style={styles.kycKey}>Aadhaar Number:</Text>
                  <Text style={styles.kycVal}>{w.aadhaarNumber}</Text>
                </View>

                <View style={styles.workerActionsRow}>
                  {w.status !== 'active' && (
                    <Pressable
                      onPress={() => handleToggleWorkerStatus(w, 'active')}
                      style={[styles.workerBtn, { backgroundColor: '#10B981' }]}>
                      <Text style={styles.workerBtnText}>Verify & Activate</Text>
                    </Pressable>
                  )}
                  {w.status === 'active' && (
                    <Pressable
                      onPress={() => handleToggleWorkerStatus(w, 'suspended')}
                      style={[styles.workerBtn, { backgroundColor: '#EF4444' }]}>
                      <Text style={styles.workerBtnText}>Suspend Worker</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 4. SETTLE 7-DAY PAYOUT MODAL */}
      <Modal visible={settleModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Settle 7-Day Weekly Payout</Text>
            <Text style={styles.modalSub}>
              Technician: {selectedWorkerForPayout?.workerName || selectedWorkerForPayout?.name}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payout Amount (₹)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={payoutAmount}
                onChangeText={setPayoutAmount}
                placeholder="Amount"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bank / UTR Transfer Reference</Text>
              <TextInput
                style={styles.modalInput}
                value={payoutRef}
                onChangeText={setPayoutRef}
                placeholder="e.g. HDFC_NEFT_123456"
              />
            </View>

            <View style={styles.modalActionsRow}>
              <Pressable
                onPress={() => setSettleModalVisible(false)}
                style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmSettlePayout}
                disabled={isSubmittingPayout}
                style={styles.modalConfirmBtn}>
                {isSubmittingPayout ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm Settlement</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  topHeaderCol: {
    gap: 4,
  },
  brandBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  logoutBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  navTabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
  },
  navTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#0F172A',
  },
  navTabActive: {
    backgroundColor: '#FBBF24',
  },
  navTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  navTabTextActive: {
    color: '#0F172A',
  },
  mainScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mainScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  kpiCardGold: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  kpiCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FBBF24',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiCardValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 10,
  },
  kpiSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 10,
  },
  kpiSubText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  grid2Col: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gridCardVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  gridCardKey: {
    fontSize: 12,
    color: '#64748B',
  },
  settlementAlertBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  settlementAlertTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  settlementAlertSub: {
    fontSize: 13,
    color: '#78350F',
    marginTop: 4,
    lineHeight: 18,
  },
  viewPayoutsBtn: {
    backgroundColor: '#D97706',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  viewPayoutsText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  periodPillContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    padding: 2,
  },
  smallPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  smallPillActive: {
    backgroundColor: '#0F172A',
  },
  smallPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  smallPillTextActive: {
    color: '#FBBF24',
    fontWeight: '700',
  },
  profitSummaryCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profitCol: {
    flex: 1,
    alignItems: 'center',
  },
  profitDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  profitKey: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 4,
    textAlign: 'center',
  },
  profitVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profitNote: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 12,
    lineHeight: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 8,
  },
  workerEarningItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  workerEarningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  workerEarningName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  workerEarningTrade: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  settlementPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  settlePaid: {
    backgroundColor: '#D1FAE5',
  },
  settlePending: {
    backgroundColor: '#FEF3C7',
  },
  settleText: {
    fontSize: 10,
    fontWeight: '800',
  },
  settleTextPaid: {
    color: '#065F46',
  },
  settleTextPending: {
    color: '#92400E',
  },
  earningNumbersGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
  },
  earningGridCell: {
    flex: 1,
    alignItems: 'center',
  },
  earningCellKey: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  earningCellVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  settleQuickBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  settleQuickText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
  },
  payoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  payoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  payoutWorkerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  payoutWorkerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  payoutAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  payoutAmountLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 4,
  },
  payoutAmountValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  lastPayoutRef: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  markAsPaidBtn: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  markAsPaidText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  upToDateNotice: {
    backgroundColor: '#D1FAE5',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  upToDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 14,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  userPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusBlocked: {
    backgroundColor: '#FEE2E2',
  },
  statusPendingKYC: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextActive: {
    color: '#065F46',
  },
  statusTextBlocked: {
    color: '#991B1B',
  },
  statusTextPendingKYC: {
    color: '#92400E',
  },
  userAddress: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 8,
  },
  userMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  userMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  userActionBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDanger: {
    backgroundColor: '#FEE2E2',
  },
  btnSuccess: {
    backgroundColor: '#D1FAE5',
  },
  userActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  workerManageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  workerManageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  workerManageName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  workerManageTrade: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  workerStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  workerStatItem: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  kycInfoBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  kycKey: {
    fontSize: 11,
    color: '#64748B',
  },
  kycVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  workerActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  workerBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  workerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

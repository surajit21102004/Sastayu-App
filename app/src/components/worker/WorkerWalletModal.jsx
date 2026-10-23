import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { BrandColors } from '@/constants/theme';
import { walletAPI, API_BASE_URL } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

// Standard packages matching user request:
// ₹10 -> 10 Coins, ₹50 -> 60 Coins, ₹100 -> 200 Coins
const DEFAULT_PACKAGES = [
  {
    id: 'pack_10',
    amount: 10,
    coins: 10,
    label: 'Starter 10',
    badge: 'Basic',
    bonusCoins: 0,
    perCoinRate: '₹1.00 / coin',
  },
  {
    id: 'pack_50',
    amount: 50,
    coins: 60,
    label: 'Booster 60',
    badge: '+10 Bonus Coins',
    bonusCoins: 10,
    perCoinRate: '₹0.83 / coin',
  },
  {
    id: 'pack_100',
    amount: 100,
    coins: 200,
    label: 'Super Saver 200',
    badge: '🔥 BEST VALUE (+100 Bonus)',
    bonusCoins: 100,
    isPopular: true,
    perCoinRate: '₹0.50 / coin',
  },
  {
    id: 'pack_250',
    amount: 250,
    coins: 550,
    label: 'Pro Partner 550',
    badge: '+300 Bonus Coins',
    bonusCoins: 300,
    perCoinRate: '₹0.45 / coin',
  },
  {
    id: 'pack_500',
    amount: 500,
    coins: 1200,
    label: 'Mega Partner 1200',
    badge: '👑 MAX VALUE (+700 Bonus)',
    bonusCoins: 700,
    perCoinRate: '₹0.41 / coin',
  },
];

export const WorkerWalletModal = ({
  visible,
  onClose,
  workerId,
  onBalanceUpdated,
}) => {
  const { authToken, user, userName, phoneNumber } = useAuth();
  const [loading, setLoading] = useState(true);

  const [recharging, setRecharging] = useState(false);
  const [walletData, setWalletData] = useState({
    coinBalance: 0,
    overdraftLimit: -50,
    freeTier: {
      totalFreeAllowed: 2,
      freeBookingsUsed: 0,
      freeBookingsRemaining: 2,
      isActive: true,
    },
    canAcceptBooking: true,
    isOverdraft: false,
    isLimitReached: false,
    packages: DEFAULT_PACKAGES,
    razorpayKeyId: 'rzp_live_TorXMuZgyrLhzC',
    recentTransactions: [],
  });

  const [selectedPackage, setSelectedPackage] = useState(DEFAULT_PACKAGES[2]); // Default to ₹100 / 200 coins
  const [activeTab, setActiveTab] = useState('recharge'); // 'recharge' | 'history'

  const effectiveWorkerId = workerId || user?.id || 1;

  const loadWallet = async () => {
    try {
      setLoading(true);
      const res = await walletAPI.getBalance(effectiveWorkerId, authToken);
      if (res && res.success) {
        setWalletData({
          ...res,
          packages: res.packages?.length ? res.packages : DEFAULT_PACKAGES,
        });
      }
    } catch (err) {
      console.warn('[Wallet load error]', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadWallet();
    }
  }, [visible]);

  // Listen to deep linking redirects from Razorpay checkout
  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = event?.url;
      if (url && (url.includes('wallet-recharge') || url.includes('sastayu://'))) {
        loadWallet();
        try {
          WebBrowser.dismissBrowser();
        } catch (e) {}
      }
    };

    const sub = Linking.addEventListener('url', handleDeepLink);
    return () => {
      sub.remove();
    };
  }, []);

  const handleRechargePress = async () => {
    if (!selectedPackage) return;
    setRecharging(true);

    try {
      // Simple instant recharge directly in app
      const res = await walletAPI.directRecharge(
        {
          workerId: effectiveWorkerId,
          packageId: selectedPackage.id,
          amount: selectedPackage.amount,
          coins: selectedPackage.coins,
        },
        authToken
      );

      if (res && res.success) {
        Alert.alert(
          '🎉 Recharge Successful!',
          `+${selectedPackage.coins} Coins credited to your wallet!\n\nNew Coin Balance: ${res.coinBalance} Coins.`
        );
        await loadWallet();
        if (onBalanceUpdated) onBalanceUpdated(res.coinBalance);
      } else {
        Alert.alert('Recharge Error', res?.message || 'Could not complete recharge.');
      }
    } catch (err) {
      Alert.alert('Recharge Error', err.message || 'Recharge failed.');
    } finally {
      setRecharging(false);
    }
  };

  const coinBalance = walletData.coinBalance;
  const isNegative = coinBalance < 0;
  const isLimitReached = coinBalance <= (walletData.overdraftLimit || -50);
  const freeRemaining = walletData.freeTier?.freeBookingsRemaining || 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
            <View>
              <Text style={styles.headerTitle}>Technician Coin Wallet</Text>
              <Text style={styles.headerSubtitle}>Accept bookings with wallet coins</Text>
            </View>
          </Pressable>
          <Pressable onPress={loadWallet} style={styles.refreshBtn}>
            <Text style={styles.refreshBtnText}>↻</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BrandColors.primaryBlue} />
            <Text style={styles.loadingText}>Loading wallet status...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Main Balance Card */}
            <View
              style={[
                styles.balanceCard,
                isLimitReached
                  ? styles.balanceCardLimit
                  : isNegative
                  ? styles.balanceCardNegative
                  : styles.balanceCardPositive,
              ]}>
              <View style={styles.balanceHeaderRow}>
                <Text style={styles.balanceCardTitle}>WALLET BALANCE</Text>
                <View
                  style={[
                    styles.statusBadge,
                    isLimitReached
                      ? styles.statusBadgeLimit
                      : isNegative
                      ? styles.statusBadgeNegative
                      : styles.statusBadgePositive,
                  ]}>
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isLimitReached
                        ? styles.statusBadgeTextLimit
                        : isNegative
                        ? styles.statusBadgeTextNegative
                        : styles.statusBadgeTextPositive,
                    ]}>
                    {isLimitReached
                      ? '● LIMIT REACHED (-50)'
                      : isNegative
                      ? '● OVERDRAFT ACTIVE'
                      : '● ACTIVE READY'}
                  </Text>
                </View>
              </View>

              <View style={styles.coinsDisplayRow}>
                <Text style={styles.coinIcon}>🪙</Text>
                <Text
                  style={[
                    styles.coinsNumber,
                    isLimitReached
                      ? styles.coinsNumberLimit
                      : isNegative
                      ? styles.coinsNumberNegative
                      : styles.coinsNumberPositive,
                  ]}>
                  {coinBalance > 0 ? `+${coinBalance}` : `${coinBalance}`}
                </Text>
                <Text style={styles.coinsUnit}>Coins</Text>
              </View>

              {/* Status Explanation */}
              {isLimitReached ? (
                <View style={styles.alertBannerLimit}>
                  <Text style={styles.alertBannerIcon}>🚫</Text>
                  <Text style={styles.alertBannerTextLimit}>
                    Acceptance Blocked! You have reached the negative limit of -50 coins.
                    Recharge your wallet to continue accepting new customer orders.
                  </Text>
                </View>
              ) : isNegative ? (
                <View style={styles.alertBannerOverdraft}>
                  <Text style={styles.alertBannerIcon}>⚠️</Text>
                  <Text style={styles.alertBannerTextOverdraft}>
                    Overdraft Active ({coinBalance} / -50 coins). You can accept orders until
                    balance reaches -50 coins. Recharge now to stay positive!
                  </Text>
                </View>
              ) : (
                <View style={styles.alertBannerPositive}>
                  <Text style={styles.alertBannerIcon}>✓</Text>
                  <Text style={styles.alertBannerTextPositive}>
                    Your wallet is in good standing. You can accept incoming bookings anytime!
                  </Text>
                </View>
              )}
            </View>

            {/* Free Tier Status Card */}
            <View style={styles.freeTierCard}>
              <View style={styles.freeTierHeader}>
                <Text style={styles.freeTierIcon}>🎁</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.freeTierTitle}>First 2 Bookings FREE Offer</Text>
                  <Text style={styles.freeTierSub}>
                    {freeRemaining > 0
                      ? `You have ${freeRemaining} of 2 free bookings remaining! 0 coins deducted.`
                      : 'Free welcome tier completed. Standard 20% token fee applies on accepted orders.'}
                  </Text>
                </View>
              </View>

              <View style={styles.freeStepsRow}>
                <View
                  style={[
                    styles.freeStepPill,
                    walletData.freeTier?.freeBookingsUsed >= 1 && styles.freeStepPillUsed,
                  ]}>
                  <Text
                    style={[
                      styles.freeStepText,
                      walletData.freeTier?.freeBookingsUsed >= 1 && styles.freeStepTextUsed,
                    ]}>
                    Booking #1: {walletData.freeTier?.freeBookingsUsed >= 1 ? '✓ Used' : '🎁 Free'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.freeStepPill,
                    walletData.freeTier?.freeBookingsUsed >= 2 && styles.freeStepPillUsed,
                  ]}>
                  <Text
                    style={[
                      styles.freeStepText,
                      walletData.freeTier?.freeBookingsUsed >= 2 && styles.freeStepTextUsed,
                    ]}>
                    Booking #2: {walletData.freeTier?.freeBookingsUsed >= 2 ? '✓ Used' : '🎁 Free'}
                  </Text>
                </View>
              </View>

              <View style={styles.feeExplainerRow}>
                <Text style={styles.feeExplainerText}>
                  ℹ️ <Text style={{ fontWeight: '700' }}>Token Rule:</Text> After 2 free bookings,
                  accepting an order deducts <Text style={{ fontWeight: '800' }}>20% in Coins</Text> (e.g. ₹200 booking = 40 Coins). Overdraft allowed down to -50 Coins.
                </Text>
              </View>
            </View>

            {/* Segment Tab Buttons: Recharge or History */}
            <View style={styles.tabToggleRow}>
              <Pressable
                onPress={() => setActiveTab('recharge')}
                style={[
                  styles.tabToggleBtn,
                  activeTab === 'recharge' && styles.tabToggleBtnActive,
                ]}>
                <Text
                  style={[
                    styles.tabToggleText,
                    activeTab === 'recharge' && styles.tabToggleTextActive,
                  ]}>
                  ⚡ Recharge Coins
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab('history')}
                style={[
                  styles.tabToggleBtn,
                  activeTab === 'history' && styles.tabToggleBtnActive,
                ]}>
                <Text
                  style={[
                    styles.tabToggleText,
                    activeTab === 'history' && styles.tabToggleTextActive,
                  ]}>
                  📋 Coin History
                </Text>
              </Pressable>
            </View>

            {activeTab === 'recharge' ? (
              <View style={styles.packagesSection}>
                <Text style={styles.sectionHeaderTitle}>Select Recharge Pack</Text>
                <Text style={styles.sectionHeaderSub}>
                  Instant wallet credit • Accept more customer bookings
                </Text>

                {walletData.packages.map((pkg) => {
                  const isSelected = selectedPackage?.id === pkg.id;
                  return (
                    <Pressable
                      key={pkg.id}
                      onPress={() => setSelectedPackage(pkg)}
                      style={[
                        styles.packageCard,
                        isSelected && styles.packageCardSelected,
                        pkg.isPopular && styles.packageCardPopularBorder,
                      ]}>
                      <View style={styles.packageCardTop}>
                        <View style={styles.packageCardLeft}>
                          <View style={styles.pkgRadioCircle}>
                            {isSelected && <View style={styles.pkgRadioInner} />}
                          </View>
                          <View style={{ marginLeft: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.packageAmount}>₹{pkg.amount}</Text>
                              {pkg.badge && (
                                <View
                                  style={[
                                    styles.badgePill,
                                    pkg.isPopular && styles.badgePillPopular,
                                  ]}>
                                  <Text
                                    style={[
                                      styles.badgeText,
                                      pkg.isPopular && styles.badgeTextPopular,
                                    ]}>
                                    {pkg.badge}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.packageRate}>{pkg.perCoinRate || `${pkg.coins} Coins`}</Text>
                          </View>
                        </View>

                        <View style={styles.packageCardRight}>
                          <Text style={styles.packageCoins}>+{pkg.coins}</Text>
                          <Text style={styles.packageCoinsLabel}>Coins</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}

                {/* Instant Pay Now Button */}
                <Pressable
                  onPress={handleRechargePress}
                  disabled={recharging}
                  style={({ pressed }) => [
                    styles.payButton,
                    (pressed || recharging) && styles.pressed,
                  ]}>
                  {recharging ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <View style={styles.payButtonContent}>
                      <Text style={styles.payButtonText}>
                        Recharge ₹{selectedPackage?.amount || 100} • Get {selectedPackage?.coins || 200} Coins
                      </Text>
                      <Text style={styles.razorpayBadge}>⚡ Instant Wallet Credit</Text>
                    </View>
                  )}
                </Pressable>

                <View style={styles.securityRow}>
                  <Text style={styles.securityText}>
                    🛡️ Sastayu Technician Wallet • Instant Coin Credit
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.historySection}>
                <Text style={styles.sectionHeaderTitle}>Recent Coin Activity</Text>
                {walletData.recentTransactions && walletData.recentTransactions.length > 0 ? (
                  walletData.recentTransactions.map((tx) => {
                    const isCredit = tx.coins > 0;
                    return (
                      <View key={tx.id} style={styles.txRow}>
                        <View style={styles.txIconContainer}>
                          <Text style={styles.txIcon}>
                            {tx.type === 'recharge'
                              ? '💳'
                              : tx.type === 'bonus'
                              ? '🎁'
                              : '🪙'}
                          </Text>
                        </View>
                        <View style={styles.txDetailsCol}>
                          <Text style={styles.txDescription}>{tx.description || tx.type}</Text>
                          <Text style={styles.txDate}>
                            {tx.created_at ? new Date(tx.created_at).toLocaleString() : 'Recent'}
                          </Text>
                        </View>
                        <View style={styles.txCoinsCol}>
                          <Text
                            style={[
                              styles.txCoinsAmount,
                              isCredit ? styles.txCredit : styles.txDebit,
                            ]}>
                            {tx.coins > 0 ? `+${tx.coins}` : `${tx.coins}`}
                          </Text>
                          <Text style={styles.txBalanceAfter}>Bal: {tx.balance_after}</Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyHistory}>
                    <Text style={styles.emptyHistoryIcon}>🪙</Text>
                    <Text style={styles.emptyHistoryTitle}>No Coin Transactions Yet</Text>
                    <Text style={styles.emptyHistorySub}>
                      Your coin deductions for accepted bookings and Razorpay recharges will appear here.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backArrow: {
    fontSize: 28,
    color: BrandColors.navyText,
    fontWeight: '300',
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnText: {
    fontSize: 18,
    color: '#334155',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  /* Balance Card */
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  balanceCardPositive: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  balanceCardNegative: {
    backgroundColor: '#451A03',
    borderColor: '#D97706',
  },
  balanceCardLimit: {
    backgroundColor: '#450A0A',
    borderColor: '#DC2626',
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  balanceCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgePositive: {
    backgroundColor: '#166534',
  },
  statusBadgeNegative: {
    backgroundColor: '#9A3412',
  },
  statusBadgeLimit: {
    backgroundColor: '#991B1B',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadgeTextPositive: {
    color: '#86EFAC',
  },
  statusBadgeTextNegative: {
    color: '#FDE68A',
  },
  statusBadgeTextLimit: {
    color: '#FECACA',
  },
  coinsDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  coinIcon: {
    fontSize: 32,
    marginRight: 8,
  },
  coinsNumber: {
    fontSize: 38,
    fontWeight: '900',
  },
  coinsNumberPositive: {
    color: '#FACC15',
  },
  coinsNumberNegative: {
    color: '#FBBF24',
  },
  coinsNumberLimit: {
    color: '#F87171',
  },
  coinsUnit: {
    fontSize: 18,
    fontWeight: '800',
    color: '#E2E8F0',
    marginLeft: 8,
  },
  alertBannerPositive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 101, 52, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  alertBannerOverdraft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(180, 83, 9, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  alertBannerLimit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(185, 28, 28, 0.4)',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  alertBannerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  alertBannerTextPositive: {
    fontSize: 12,
    color: '#BBF7D0',
    flex: 1,
    lineHeight: 16,
  },
  alertBannerTextOverdraft: {
    fontSize: 12,
    color: '#FEF3C7',
    flex: 1,
    lineHeight: 16,
  },
  alertBannerTextLimit: {
    fontSize: 12,
    color: '#FEE2E2',
    fontWeight: '700',
    flex: 1,
    lineHeight: 16,
  },
  /* Free Tier Card */
  freeTierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  freeTierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  freeTierIcon: {
    fontSize: 26,
  },
  freeTierTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  freeTierSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  freeStepsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  freeStepPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
  },
  freeStepPillUsed: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  freeStepText: {
    fontSize: 12,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  freeStepTextUsed: {
    color: '#64748B',
  },
  feeExplainerRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  feeExplainerText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  /* Tabs */
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tabToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabToggleTextActive: {
    color: BrandColors.navyText,
    fontWeight: '800',
  },
  /* Packages */
  packagesSection: {
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.navyText,
    marginBottom: 2,
  },
  sectionHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  packageCardSelected: {
    borderColor: BrandColors.primaryBlue,
    backgroundColor: '#EFF6FF',
  },
  packageCardPopularBorder: {
    borderColor: '#F59E0B',
  },
  packageCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  packageCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pkgRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BrandColors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pkgRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BrandColors.primaryBlue,
  },
  packageAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: BrandColors.navyText,
  },
  packageRate: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  badgePill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillPopular: {
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
  },
  badgeTextPopular: {
    color: '#B45309',
  },
  packageCardRight: {
    alignItems: 'flex-end',
  },
  packageCoins: {
    fontSize: 20,
    fontWeight: '900',
    color: '#059669',
  },
  packageCoinsLabel: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  /* Pay Button */
  payButton: {
    backgroundColor: BrandColors.primaryBlue,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: BrandColors.primaryBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  payButtonContent: {
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  razorpayBadge: {
    fontSize: 11,
    color: '#BFDBFE',
    fontWeight: '600',
    marginTop: 3,
  },
  securityRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  securityText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  /* History */
  historySection: {
    marginBottom: 20,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  txIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  txIcon: {
    fontSize: 18,
  },
  txDetailsCol: {
    flex: 1,
  },
  txDescription: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.navyText,
  },
  txDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  txCoinsCol: {
    alignItems: 'flex-end',
  },
  txCoinsAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  txCredit: {
    color: '#16A34A',
  },
  txDebit: {
    color: '#DC2626',
  },
  txBalanceAfter: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  emptyHistory: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyHistoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  emptyHistorySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  StatusBar,
  Vibration,
  Linking,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors, BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { RequestDetailsModal } from './RequestDetailsModal';
import { WorkerBookingsView } from './WorkerBookingsView';
import { WorkerCompleteJobModal } from './WorkerCompleteJobModal';
import { WorkerFloatingTabBar } from '@/components/navigation/WorkerFloatingTabBar';
import { WorkerEarningsView } from './WorkerEarningsView';
import { WorkerWalletModal } from './WorkerWalletModal';
import { workersAPI, bookingsAPI } from '@/services/api';

import { TechnicianAvatar } from '@/components/common/TechnicianAvatar';

export const WorkerDashboard = () => {
  const { userName, workerTrade, phoneNumber, userLocation, logout, authToken, workerSelfie, user } = useAuth();
  const [currentTab, setCurrentTab] = useState('home'); // 'home' | 'bookings' | 'earnings' | 'profile'
  const [isOnline, setIsOnline] = useState(true);

  // Live profile details directly from MySQL database
  const [liveWorkerId, setLiveWorkerId] = useState(user?.id || 4);
  const [liveWorkerName, setLiveWorkerName] = useState(userName || '');

  const [liveWorkerTrade, setLiveWorkerTrade] = useState(workerTrade || 'Service Partner');
  const [liveWorkerPhone, setLiveWorkerPhone] = useState(phoneNumber || '');
  const [liveWorkerAddress, setLiveWorkerAddress] = useState(userLocation || '');
  const [liveWorkerSelfie, setLiveWorkerSelfie] = useState(workerSelfie || null);
  const [headerImgError, setHeaderImgError] = useState(false);
  const [profileImgError, setProfileImgError] = useState(false);

  // Sync state if AuthContext updates
  useEffect(() => {
    if (userName) setLiveWorkerName(userName);
    if (workerTrade) setLiveWorkerTrade(workerTrade);
    if (phoneNumber) setLiveWorkerPhone(phoneNumber);
    if (userLocation) setLiveWorkerAddress(userLocation);
    if (workerSelfie) setLiveWorkerSelfie(workerSelfie);
  }, [userName, workerTrade, phoneNumber, userLocation, workerSelfie]);

  // Live stats from backend database
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [jobsDone, setJobsDone] = useState(0);

  // Technician Coin Wallet state
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [freeBookingsRemaining, setFreeBookingsRemaining] = useState(2);
  const [canAcceptBooking, setCanAcceptBooking] = useState(true);

  // Incoming Live Request (null by default until an active request exists)

  const [incomingRequest, setIncomingRequest] = useState(null);
  const [requestDetailsVisible, setRequestDetailsVisible] = useState(false);

  // Live Bookings list
  const [workerBookings, setWorkerBookings] = useState([]);

  // Complete Job OTP Modal
  const [completeJobModalVisible, setCompleteJobModalVisible] = useState(false);
  const [selectedCompleteBooking, setSelectedCompleteBooking] = useState(null);

  const lastSyncTimestamp = useRef(Date.now());
  const dismissedRequests = useRef(new Set());
  const activeIncomingIdRef = useRef(null);

  // Dynamic worker initials and profile values from real database record
  const effectiveName = liveWorkerName || userName || 'Technician';
  const effectiveTrade = liveWorkerTrade || workerTrade || 'Service Partner';
  const effectivePhone = liveWorkerPhone || phoneNumber || '';
  const effectiveAddress = liveWorkerAddress || userLocation || 'Local Service Base';
  const workerInitials = effectiveName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SP';

  // Fetch live stats & bookings from MySQL backend
  const loadLiveStats = async () => {
    try {
      const res = await workersAPI.getDashboard(authToken);
      if (res && res.success) {
        if (res.stats) {
          setTodayEarnings(Number(res.stats.todayEarnings) || 0);
          setJobsDone(Number(res.stats.jobsDone) || 0);
        }
        if (res.wallet) {
          setCoinBalance(Number(res.wallet.coinBalance) || 0);
          setFreeBookingsRemaining(Number(res.wallet.freeBookingsRemaining) || 0);
          setCanAcceptBooking(Boolean(res.wallet.canAcceptBooking));
        }
        if (res.worker) {
          if (res.worker.id) setLiveWorkerId(res.worker.id);
          if (res.worker.name) setLiveWorkerName(res.worker.name);
          if (res.worker.trade || res.worker.customTrade) {

            setLiveWorkerTrade(res.worker.customTrade || res.worker.trade);
          }
          if (res.worker.phone) setLiveWorkerPhone(res.worker.phone);
          if (res.worker.address) setLiveWorkerAddress(res.worker.address);
          if (res.worker.selfieUrl) setLiveWorkerSelfie(res.worker.selfieUrl);
          if (typeof res.worker.isOnline === 'boolean') {
            setIsOnline(res.worker.isOnline);
          }
        }
      }

      // Fetch all assigned bookings for this worker
      const bRes = await bookingsAPI.getBookings(null, authToken);
      if (bRes && bRes.success && Array.isArray(bRes.bookings)) {
        const mapped = bRes.bookings.map((b) => ({
          id: String(b.id),
          title: b.service_title,
          subtitle: `${b.user_name || 'Customer'} · ${b.address || 'Local area'}`,
          status: b.status,
          badgeText:
            b.status === 'in_progress'
              ? 'In progress'
              : b.status === 'accepted'
              ? 'Ready to Start'
              : b.status === 'pending'
              ? 'Pending Confirmation'
              : b.status === 'completed'
              ? 'Completed'
              : 'Confirmed',
          badgeType:
            b.status === 'in_progress'
              ? 'yellow'
              : b.status === 'accepted'
              ? 'blue'
              : b.status === 'pending'
              ? 'yellow'
              : b.status === 'completed'
              ? 'gray'
              : 'blue',
          filterCategory: b.status === 'completed' ? 'completed' : 'today',
          customerName: b.user_name || 'Customer',
          customerPhone: b.user_phone || '',
          price: Number(b.total_amount) || 149,
          proposedPrice: Number(b.proposed_price) || Number(b.total_amount) || 149,
          voiceNoteUrl: b.voice_note_url || null,
          problemNote: b.customer_notes || b.issue_details || '',
          scheduledDate: b.scheduled_date || 'Today',
          scheduledSlot: b.scheduled_slot || 'ASAP',
          address: b.address || 'Customer Location',
        }));
        setWorkerBookings(mapped);
      }
    } catch (err) {
      console.warn('[WORKER] Dashboard live fetch error:', err.message);
    }
  };

  // Initial load
  useEffect(() => {
    loadLiveStats();
  }, [authToken, workerTrade]);

  // Real-Time LIVE Sync Engine for Worker (every 2.5s - no manual refresh needed!)
  useEffect(() => {
    if (!authToken || !isOnline) return;

    const syncInterval = setInterval(async () => {
      try {
        const res = await bookingsAPI.liveSync(
          { since: lastSyncTimestamp.current, userType: 'worker' },
          authToken
        );

        if (res && res.success) {
          lastSyncTimestamp.current = res.timestamp || Date.now();

          // Process real-time events (counter responses, jaldi requests, new bookings)
          if (Array.isArray(res.events) && res.events.length > 0) {
            for (const ev of res.events) {
              if (ev.type === 'COUNTER_RESPONDED') {
                if (ev.payload.action === 'accept') {
                  Alert.alert(
                    '🎉 Counter Offer Accepted!',
                    `Customer accepted your quote of ₹${ev.payload.finalPrice} for ${ev.payload.serviceTitle || 'Service'}.\n\nBooking is now confirmed!`,
                    [{ text: 'View Bookings', onPress: () => setCurrentTab('bookings') }]
                  );
                  loadLiveStats();
                } else if (ev.payload.action === 'decline') {
                  Alert.alert(
                    'Counter Offer Declined',
                    `Customer declined the counter offer for ${ev.payload.serviceTitle || 'Service'}.`
                  );
                  setIncomingRequest(null);
                  loadLiveStats();
                }
              }

              // ONLY JALDI CHAHIYE emergency requests trigger the urgent popup swipe modal!
              if (ev.type === 'JALDI_REQUEST' && !incomingRequest) {
                const b = ev.payload;
                if (!dismissedRequests.current.has(String(b.bookingId))) {
                  activeIncomingIdRef.current = String(b.bookingId);
                  setIncomingRequest({
                    id: String(b.bookingId),
                    trade: b.serviceTitle?.split('·')[0]?.trim() || workerTrade,
                    problem: b.serviceTitle,
                    customerName: b.userName || 'Customer',
                    customerRating: '5.0',
                    distance: '0.8 km away',
                    area: b.address || 'Nearby Area',
                    note: b.customerNotes || b.issueDetails || '⚡ Urgent Jaldi Chahiye Request',
                    price: Number(b.proposedPrice || b.totalAmount) || 249,
                    expiresIn: '1:30',
                    isEmergency: true,
                  });
                  setRequestDetailsVisible(true);
                  try {
                    Vibration.vibrate([0, 500, 200, 500]);
                  } catch (e) {}
                }
              }

              // Normal bookings also appear as active incoming request with Accept / Counter Offer!
              if (ev.type === 'NEW_BOOKING' && !incomingRequest) {
                const b = ev.payload;
                if (!dismissedRequests.current.has(String(b.bookingId))) {
                  activeIncomingIdRef.current = String(b.bookingId);
                  setIncomingRequest({
                    id: String(b.bookingId),
                    trade: b.trade || b.serviceTitle?.split('·')[0]?.trim() || workerTrade,
                    problem: b.serviceTitle,
                    customerName: b.userName || 'Customer',
                    customerRating: '5.0',
                    distance: '1.2 km away',
                    area: b.address || 'Nearby Area',
                    note: b.customerNotes || b.issueDetails || 'Normal Booking Request',
                    price: Number(b.proposedPrice || b.totalAmount) || 149,
                    expiresIn: '5:00',
                    isEmergency: false,
                    voiceNoteUrl: b.voiceNoteUrl || null,
                  });
                  loadLiveStats();
                  try {
                    Vibration.vibrate(300);
                  } catch (e) {}
                }
              }

              // If another worker accepted the Jaldi request first, dismiss our popup
              if (ev.type === 'JALDI_ACCEPTED') {
                if (activeIncomingIdRef.current === String(ev.payload.bookingId)) {
                  setRequestDetailsVisible(false);
                  setIncomingRequest(null);
                  Alert.alert('⚡ Order Claimed', 'Another partner accepted this Jaldi order first.');
                }
              }

              // Live Wallet Coin balance update
              if (ev.type === 'WALLET_UPDATED') {
                setCoinBalance(Number(ev.payload.coinBalance) || 0);
              }
            }

          }

          // If server reports an active incoming booking (normal booking or emergency!)
          if (res.activeIncoming && !incomingRequest) {
            const b = res.activeIncoming;
            if (!dismissedRequests.current.has(String(b.id))) {
              activeIncomingIdRef.current = String(b.id);
              setIncomingRequest({
                id: String(b.id),
                trade: workerTrade,
                problem: b.service_title,
                customerName: b.user_name || 'Customer',
                customerPhone: b.user_phone || '',
                customerRating: '5.0',
                distance: '1.0 km away',
                area: b.address || 'Nearby Area',
                note: b.customer_notes || b.issue_details || (b.is_emergency ? '⚡ Urgent Jaldi Chahiye' : 'Normal Service Booking'),
                price: Number(b.proposed_price || b.total_amount) || 149,
                expiresIn: b.is_emergency ? '1:30' : '5:00',
                isEmergency: Boolean(b.is_emergency),
                voiceNoteUrl: b.voice_note_url || null,
              });
              if (b.is_emergency) {
                setRequestDetailsVisible(true);
                try {
                  Vibration.vibrate([0, 400, 200, 400]);
                } catch (e) {}
              }
            }
          }
        }
      } catch (err) {
        // Silent retry
      }
    }, 2500);

    return () => clearInterval(syncInterval);
  }, [authToken, isOnline, incomingRequest, workerTrade]);

  const handleToggleOnline = async (val) => {
    setIsOnline(val);
    try {
      await workersAPI.toggleStatus(val, authToken);
    } catch {
      // Handled
    }
  };

  // Request Handlers: First to accept Jaldi gets it!
  const handleAcceptRequest = async (req) => {
    try {
      if (req.id && !req.id.startsWith('wb-')) {
        let res;
        if (req.isEmergency) {
          res = await bookingsAPI.acceptJaldi(req.id, null, authToken);
          if (res && res.alreadyAccepted) {
            Alert.alert('⚡ Too Late!', 'Another partner accepted this Jaldi order first.');
            setIncomingRequest(null);
            setRequestDetailsVisible(false);
            return;
          }
        } else {
          res = await bookingsAPI.acceptProposedPrice(req.id, authToken);
        }

        if (res && res.wallet) {
          setCoinBalance(res.wallet.coinBalance);
          setFreeBookingsRemaining(res.wallet.freeBookingsRemaining);
          if (res.wallet.isFree) {
            Alert.alert('🎉 Booking Accepted FREE!', '🎁 Welcome offer active: 0 coins deducted for this booking!');
          } else {
            Alert.alert('✓ Booking Confirmed!', `🪙 ${res.wallet.coinsDeducted} Coins deducted (20% token fee).\nNew Coin Balance: ${res.wallet.coinBalance} Coins.`);
          }
        }
      }
    } catch (e) {
      console.warn('Accept error:', e);
      if (
        e.insufficientFunds ||
        e.code === 'INSUFFICIENT_WALLET_BALANCE' ||
        (e.message && e.message.includes('Wallet limit reached'))
      ) {
        Alert.alert(
          '⚠️ Wallet Limit Reached (-50 Coins)',
          e.message || 'Your wallet balance has reached the negative limit (-50 coins). Please recharge your wallet with Razorpay to accept this order.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Recharge Wallet 💳',
              onPress: () => {
                setRequestDetailsVisible(false);
                setWalletModalVisible(true);
              },
            },
          ]
        );
        return;
      }
      Alert.alert('Notice', e.message || 'Could not accept order.');
      setIncomingRequest(null);
      setRequestDetailsVisible(false);
      return;
    }


    if (req.id) dismissedRequests.current.add(String(req.id));

    await loadLiveStats();
    setIncomingRequest(null);
    setRequestDetailsVisible(false);
    setCurrentTab('bookings');
  };

  const handleCounterRequest = async (req, counterPrice, counterReason) => {
    try {
      if (req.id) dismissedRequests.current.add(String(req.id));
      await bookingsAPI.counterPrice(req.id, counterPrice, counterReason, authToken);
      setIncomingRequest(null);
      setRequestDetailsVisible(false);
      Alert.alert(
        'Counter Quote Sent! ⚡',
        `Your counter quote of ₹${counterPrice} has been sent to ${req.customerName}. Booking will be finalized LIVE once customer accepts.`
      );
    } catch (err) {
      Alert.alert('Notice', 'Counter offer recorded.');
      setIncomingRequest(null);
      setRequestDetailsVisible(false);
    }
  };

  const handleDeclineRequest = async () => {
    const reqId = incomingRequest?.id;
    if (reqId) {
      dismissedRequests.current.add(String(reqId));
      try {
        await bookingsAPI.declineBooking(reqId, 'Declined by technician', authToken);
      } catch (err) {
        console.warn('[DECLINE ERROR]', err.message);
      }
    }
    setIncomingRequest(null);
    setRequestDetailsVisible(false);
    Alert.alert('Request Declined', 'This booking has been cancelled and the customer has been notified.');
  };

  const handleMarkJobComplete = (booking) => {
    setSelectedCompleteBooking(booking);
    setCompleteJobModalVisible(true);
  };

  const handleCompleteSuccess = (booking, totalAmount) => {
    setWorkerBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id
          ? {
              ...b,
              status: 'completed',
              badgeText: 'Completed',
              badgeType: 'gray',
              subtitle: `Today · Completed · Paid ₹${totalAmount || b.price}`,
              filterCategory: 'completed',
            }
          : b
      )
    );
    setTodayEarnings((e) => e + (Number(totalAmount) || Number(booking.price) || 0));
    setJobsDone((j) => j + 1);
    loadLiveStats();
  };

  const handleCallCustomer = async (booking) => {
    const phone = booking?.customerPhone || '8910710493';
    const clean = String(phone).replace(/\D/g, '');
    try {
      await Linking.openURL(`tel:${clean}`);
    } catch (err) {
      Alert.alert('Calling Customer', `Dialing ${booking.customerName || 'Customer'}: +91 ${clean}`);
    }
  };

  const handleNavigateMap = (booking) => {
    const destination = booking?.address || booking?.subtitle || userLocation || 'Customer Location';
    const query = encodeURIComponent(destination);
    const mapsUrl = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${query}`,
    });

    Linking.openURL(mapsUrl).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${query}`);
    });
  };

  const handleStartWork = async (booking) => {
    try {
      await bookingsAPI.updateStatus(booking.id, 'in_progress', authToken);
      setWorkerBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? {
                ...b,
                status: 'in_progress',
                badgeText: 'In progress',
                badgeType: 'yellow',
              }
            : b
        )
      );
      Alert.alert(
        'Work Started! ⚡',
        `Job "${booking.title}" is now In Progress.\nAsk customer for the 4-digit completion OTP when work is done.`
      );
      loadLiveStats();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not start work.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* TOP DARK NAVY APP BAR MATCHING SCREENSHOT 2 */}
      <View style={styles.darkAppBar}>
        <SafeAreaView edges={['top']} style={styles.appBarSafeArea}>
          {/* Top Row: Avatar, Namaste, Online toggle */}
          <View style={styles.topProfileRow}>
            <View style={styles.workerIdentCol}>
              <TechnicianAvatar
                uri={liveWorkerSelfie}
                name={effectiveName}
                trade={effectiveTrade}
                size={46}
              />
              <View style={styles.nameTextCol}>
                <Text style={styles.namasteLabel}>Namaste</Text>
                <Text style={styles.workerNameHeadline}>{effectiveName}</Text>
              </View>
            </View>

            {/* Online Toggle matching Screenshot 2 */}
            <View style={styles.onlineToggleRow}>
              <Text style={styles.onlineStatusText}>Online</Text>
              <Switch
                value={isOnline}
                onValueChange={handleToggleOnline}
                trackColor={{ false: '#334155', true: '#FBBF24' }}
                thumbColor={isOnline ? '#0F172A' : '#94A3B8'}
                ios_backgroundColor="#334155"
              />
            </View>
          </View>

          {/* Stats Cards Row matching Screenshot 2 + Coin Wallet */}
          <View style={styles.statsCardRow}>
            {/* Card 1: Today's earnings */}
            <View style={styles.statMetricCard}>
              <Text style={styles.statMetricLabel}>Today's earnings</Text>
              <Text style={styles.statMetricValue}>₹{todayEarnings.toLocaleString('en-IN')}</Text>
            </View>

            {/* Card 2: Jobs done */}
            <View style={styles.statMetricCard}>
              <Text style={styles.statMetricLabel}>Jobs done</Text>
              <Text style={styles.statMetricValue}>{jobsDone}</Text>
            </View>

            {/* Card 3: Coin Wallet (Interactive Tap to Recharge!) */}
            <Pressable
              onPress={() => setWalletModalVisible(true)}
              style={({ pressed }) => [
                styles.statMetricCard,
                styles.statWalletCard,
                coinBalance <= -50
                  ? styles.statWalletCardLimit
                  : coinBalance < 0
                  ? styles.statWalletCardOverdraft
                  : null,
                pressed && { opacity: 0.85 },
              ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.statMetricLabel}>Wallet 🪙</Text>
                <Text style={styles.walletRechargeHint}>+ Add</Text>
              </View>
              <Text
                style={[
                  styles.statMetricValue,
                  styles.walletValue,
                  coinBalance <= -50
                    ? styles.walletValueLimit
                    : coinBalance < 0
                    ? styles.walletValueOverdraft
                    : null,
                ]}>
                {coinBalance > 0 ? `+${coinBalance}` : `${coinBalance}`}
                <Text style={styles.coinsSuffix}> Coins</Text>
              </Text>
            </Pressable>
          </View>

          {/* Banner notification if Free Tier or Limit Reached */}
          {freeBookingsRemaining > 0 ? (
            <Pressable
              onPress={() => setWalletModalVisible(true)}
              style={styles.freeTierBannerStrip}>
              <Text style={styles.freeTierBannerText}>
                🎁 <Text style={{ fontWeight: '800' }}>{freeBookingsRemaining} Free Booking{freeBookingsRemaining > 1 ? 's' : ''} Left!</Text> 0 Coins deducted on acceptance.
              </Text>
            </Pressable>
          ) : coinBalance <= -50 ? (
            <Pressable
              onPress={() => setWalletModalVisible(true)}
              style={styles.limitReachedBannerStrip}>
              <Text style={styles.limitReachedBannerText}>
                🚫 <Text style={{ fontWeight: '800' }}>Limit reached (-50 coins)!</Text> Tap to recharge with Razorpay.
              </Text>
            </Pressable>
          ) : null}
        </SafeAreaView>
      </View>


      {/* TAB CONTENT */}
      {currentTab === 'bookings' ? (
        <WorkerBookingsView
          workerBookings={workerBookings}
          onMarkJobComplete={handleMarkJobComplete}
          onStartWork={handleStartWork}
          onAcceptBooking={handleAcceptRequest}
          onCounterBooking={(b) => {
            setIncomingRequest({
              id: b.id,
              trade: workerTrade,
              problem: b.title,
              customerName: b.customerName,
              customerPhone: b.customerPhone,
              customerRating: '5.0',
              distance: '1.0 km away',
              area: b.address,
              note: b.problemNote || 'Service Booking',
              price: b.price,
              expiresIn: '5:00',
              isEmergency: false,
              voiceNoteUrl: b.voiceNoteUrl,
            });
            setRequestDetailsVisible(true);
          }}
          onNavigateMap={handleNavigateMap}
          onCallCustomer={handleCallCustomer}
        />
      ) : currentTab === 'earnings' ? (
        /* EARNINGS TAB (Prompt 5) */
        <WorkerEarningsView />
      ) : currentTab === 'profile' ? (
        /* PROFILE TAB */
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.tabContentWrap}>
            <Text style={styles.screenHeading}>Partner Profile</Text>

            <View style={styles.profileBox}>
              <TechnicianAvatar
                uri={liveWorkerSelfie}
                name={effectiveName}
                trade={effectiveTrade}
                size={80}
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.profileName}>{effectiveName}</Text>
              <Text style={styles.profileTrade}>{effectiveTrade} • Verified Partner</Text>
              <View style={styles.kycBadge}>
                <Text style={styles.kycBadgeText}>✓ AADHAAR & POLICE VERIFIED</Text>
              </View>
            </View>

            <View style={styles.partnerInfoList}>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowKey}>Phone Number</Text>
                <Text style={styles.infoRowVal}>+91 {effectivePhone}</Text>
              </View>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowKey}>Service Area</Text>
                <Text style={styles.infoRowVal}>{effectiveAddress}</Text>
              </View>
              <View style={styles.infoRowItem}>
                <Text style={styles.infoRowKey}>Registered Trade</Text>
                <Text style={styles.infoRowVal}>{effectiveTrade}</Text>
              </View>
            </View>

            <Pressable onPress={logout} style={styles.logoutBtn}>
              <Text style={styles.logoutBtnText}>Logout / Switch to Customer Mode</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        /* HOME DASHBOARD TAB (SCREENSHOT 2) */
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.tabContentWrap}>
            {/* Section: New requests */}
            <Text style={styles.sectionHeading}>New requests</Text>

            {/* Card 1: Incoming Jaldi Request matching Screenshot 2 */}
            {incomingRequest ? (
              <Pressable
                onPress={() => setRequestDetailsVisible(true)}
                style={styles.requestCard}>
                {/* Badges Row */}
                <View style={styles.cardBadgesRow}>
                  <View style={incomingRequest.isEmergency ? styles.jaldiYellowTag : styles.scheduledBlueTag}>
                    <Text style={styles.jaldiTagLightning}>{incomingRequest.isEmergency ? '⚡' : '📅'}</Text>
                    <Text style={styles.jaldiTagLabel}>{incomingRequest.isEmergency ? 'JALDI CHAHIYE' : 'NORMAL BOOKING'}</Text>
                  </View>

                  <View style={styles.cardTimerRow}>
                    <Text style={styles.cardClock}>⏱</Text>
                    <Text style={styles.cardTimerText}>
                      Expires in {incomingRequest.expiresIn}
                    </Text>
                  </View>
                </View>

                {/* Service Title */}
                <Text style={styles.cardServiceHeadline}>
                  {incomingRequest.trade} · {incomingRequest.problem}
                </Text>

                {/* Location */}
                <View style={styles.cardLocationRow}>
                  <Text style={styles.cardPin}>📍</Text>
                  <Text style={styles.cardLocationText}>
                    {incomingRequest.distance} · {incomingRequest.area}
                  </Text>
                </View>

                {/* Voice Note Pill if audio attached */}
                {incomingRequest.voiceNoteUrl ? (
                  <View style={styles.cardVoicePill}>
                    <Text style={styles.cardVoicePillText}>🎙️ Customer Audio Note Attached • Tap to listen</Text>
                  </View>
                ) : null}

                {/* Visit Charge Pill Box */}
                <View style={styles.visitFeeBox}>
                  <Text style={styles.visitFeeKey}>Visit charge</Text>
                  <Text style={styles.visitFeeVal}>₹{incomingRequest.price}</Text>
                </View>

                {/* Triple Action Buttons: Decline, Counter Quote, Accept */}
                <View style={styles.cardBtnRow}>
                  <Pressable
                    onPress={handleDeclineRequest}
                    style={({ pressed }) => [
                      styles.cardDeclineBtn,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={styles.cardDeclineText}>Decline</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setRequestDetailsVisible(true)}
                    style={({ pressed }) => [
                      styles.cardCounterBtn,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={styles.cardCounterText}>Counter</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleAcceptRequest(incomingRequest)}
                    style={({ pressed }) => [
                      styles.cardAcceptBtn,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={styles.cardAcceptText}>Accept ₹{incomingRequest.price}</Text>
                  </Pressable>
                </View>
              </Pressable>
            ) : (
              <View style={styles.noRequestCard}>
                <Text style={styles.radarWaveEmoji}>📡</Text>
                <Text style={styles.noRequestTitle}>Scanning for nearby jobs...</Text>
                <Text style={styles.noRequestSub}>
                  You are Online. New orders in your trade will pop up here instantly.
                </Text>
              </View>
            )}

            {/* Card 2: Upcoming Job (if assigned) */}
            {workerBookings.length > 0 && (
              <Pressable
                onPress={() => setCurrentTab('bookings')}
                style={({ pressed }) => [styles.scheduledCard, pressed && styles.pressed]}>
                <View style={styles.calSquircle}>
                  <Text style={styles.calIcon}>📅</Text>
                </View>
                <View style={styles.scheduledInfoCol}>
                  <Text style={styles.scheduledTitle}>
                    {workerBookings[0].title}
                  </Text>
                  <Text style={styles.scheduledSubtitle}>
                    {workerBookings[0].subtitle}
                  </Text>
                </View>
                <Text style={styles.scheduledChevron}>›</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}

      {/* APPLE IPHONE FLOATING TAB BAR FOR WORKER PANEL */}
      <WorkerFloatingTabBar
        activeTab={currentTab}
        onTabSelect={(tabId) => setCurrentTab(tabId)}
        onQuickAction={() => {
          Alert.alert(
            'Partner Quick Actions',
            '• Online Status: ACTIVE\n• Daily Target: ₹2,000\n• Emergency Helpline: 1800-SASTAYU'
          );
        }}
      />

      {/* REQUEST DETAILS MODAL (SCREENSHOT 3) */}
      <RequestDetailsModal
        visible={requestDetailsVisible}
        request={incomingRequest}
        onClose={() => setRequestDetailsVisible(false)}
        onAccept={handleAcceptRequest}
        onDecline={handleDeclineRequest}
        onCounter={handleCounterRequest}
      />

      {/* WORKER COMPLETE JOB OTP VERIFICATION MODAL */}
      <WorkerCompleteJobModal
        visible={completeJobModalVisible}
        booking={selectedCompleteBooking}
        onClose={() => setCompleteJobModalVisible(false)}
        onSuccess={handleCompleteSuccess}
      />

      {/* TECHNICIAN COIN WALLET RECHARGE MODAL */}
      <WorkerWalletModal
        visible={walletModalVisible}
        onClose={() => setWalletModalVisible(false)}
        workerId={liveWorkerId || 4}
        onBalanceUpdated={(newBal) => {
          setCoinBalance(newBal);
          loadLiveStats();
        }}
      />

    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  darkAppBar: {
    backgroundColor: '#0F172A',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  appBarSafeArea: {
    width: '100%',
  },
  topProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginBottom: 20,
  },
  workerIdentCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarSquircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarSquircleImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarSquircleText: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  nameTextCol: {},
  namasteLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  workerNameHeadline: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  onlineToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineStatusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FBBF24',
  },
  statsCardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statMetricCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statMetricLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 6,
  },
  statMetricValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statWalletCard: {
    backgroundColor: '#0F2942',
    borderColor: '#38BDF8',
  },
  statWalletCardOverdraft: {
    backgroundColor: '#381A03',
    borderColor: '#F59E0B',
  },
  statWalletCardLimit: {
    backgroundColor: '#450A0A',
    borderColor: '#EF4444',
  },
  walletRechargeHint: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
  },
  walletValue: {
    color: '#FACC15',
  },
  walletValueOverdraft: {
    color: '#FBBF24',
  },
  walletValueLimit: {
    color: '#F87171',
  },
  coinsSuffix: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  freeTierBannerStrip: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeTierBannerText: {
    fontSize: 11,
    color: '#BFDBFE',
    fontWeight: '600',
    textAlign: 'center',
  },
  limitReachedBannerStrip: {
    backgroundColor: '#7F1D1D',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitReachedBannerText: {
    fontSize: 11,
    color: '#FEE2E2',
    fontWeight: '700',
    textAlign: 'center',
  },

  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: BottomTabInset + 70,
    alignItems: 'center',
  },
  tabContentWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  jaldiYellowTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBBF24',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  jaldiTagLightning: {
    fontSize: 11,
    color: '#0F172A',
  },
  jaldiTagLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  cardTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardClock: {
    fontSize: 12,
  },
  cardTimerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  cardServiceHeadline: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  cardPin: {
    fontSize: 13,
  },
  cardLocationText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  visitFeeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  visitFeeKey: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  visitFeeVal: {
    fontSize: 18,
    fontWeight: '900',
    color: BrandColors.primaryBlue,
  },
  cardBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardDeclineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BrandColors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cardDeclineText: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  cardAcceptBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: BrandColors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  cardAcceptText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scheduledCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  calSquircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calIcon: {
    fontSize: 18,
  },
  scheduledInfoCol: {
    flex: 1,
  },
  scheduledTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  scheduledSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  scheduledChevron: {
    fontSize: 22,
    color: '#94A3B8',
    fontWeight: '300',
  },
  noRequestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  radarWaveEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  noRequestTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  noRequestSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  simulateBtn: {
    backgroundColor: '#FBBF24',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  simulateBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  screenHeading: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: -0.4,
  },
  walletCard: {
    backgroundColor: BrandColors.primaryBlue,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  walletLabel: {
    fontSize: 13,
    color: '#BFDBFE',
    fontWeight: '600',
  },
  walletAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 6,
    letterSpacing: -0.5,
  },
  walletSub: {
    fontSize: 12,
    color: '#DBEAFE',
    marginBottom: 16,
  },
  withdrawBtn: {
    backgroundColor: '#FBBF24',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  summaryKey: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#F1F5F9',
  },
  profileBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  profileAvatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: BrandColors.primaryBlue,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  profileTrade: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  kycBadge: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  kycBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  partnerInfoList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    gap: 12,
  },
  infoRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoRowKey: {
    fontSize: 13,
    color: '#64748B',
  },
  infoRowVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});

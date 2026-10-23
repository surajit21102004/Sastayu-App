import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors, BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { servicesAPI } from '@/services/api';
import { CustomerLoginScreen } from '@/components/auth/CustomerLoginScreen';
import { WorkerLoginScreen } from '@/components/auth/WorkerLoginScreen';
import { UserProfileSetupModal } from '@/components/auth/UserProfileSetupModal';
import { WorkerProfileSetupModal } from '@/components/auth/WorkerProfileSetupModal';
import { WorkerDashboard } from '@/components/worker/WorkerDashboard';
import { BookingOptionsModal } from '@/components/booking/BookingOptionsModal';
import { WorkersListModal } from '@/components/booking/WorkersListModal';
import { JaldiChahiyeRadarModal } from '@/components/booking/JaldiChahiyeRadarModal';
import { AllServicesModal } from '@/components/booking/AllServicesModal';
import { FloatingIPhoneTabBar } from '@/components/navigation/FloatingIPhoneTabBar';
import { AdminPortal } from '@/components/admin/AdminPortal';
import { JobCompletedModal } from '@/components/booking/JobCompletedModal';
import BookingsScreen from './bookings';
import ProfileScreen from './profile';

export default function MainAppScreen() {
  const { isAuthenticated, userType, isProfileCompleted, userLocation, setUserLocation, userName, bookings } = useAuth();
  const [authView, setAuthView] = useState('customer');
  const [currentTab, setCurrentTab] = useState('home'); // 'home' | 'bookings' | 'profile'

  // Universal Completed Job Rating Popup (Prompt: Customer screen popup to rate technician)
  const [completedJobModalVisible, setCompletedJobModalVisible] = useState(false);
  const [completedBooking, setCompletedBooking] = useState(null);
  const priorStatusMap = React.useRef(new Map());
  const promptedBookings = React.useRef(new Set());

  React.useEffect(() => {
    if (userType !== 'customer' || !bookings || bookings.length === 0) return;

    bookings.forEach((b) => {
      const prevStatus = priorStatusMap.current.get(b.id);
      // Only pop up if the job was previously active (in_progress, accepted, pending)
      // and JUST transitioned to 'completed' live, AND has NOT been rated yet!
      if (
        prevStatus &&
        prevStatus !== 'completed' &&
        b.status === 'completed' &&
        !b.isRated &&
        !promptedBookings.current.has(b.id)
      ) {
        promptedBookings.current.add(b.id);
        setCompletedBooking(b);
        setCompletedJobModalVisible(true);
      }
      priorStatusMap.current.set(b.id, b.status);
    });
  }, [bookings, userType]);

  // Search & Booking selection states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState('Electrician');
  const [primaryServices, setPrimaryServices] = useState([]);

  // Modals corresponding to user screenshots
  const [bookingOptionsVisible, setBookingOptionsVisible] = useState(false);
  const [workersListVisible, setWorkersListVisible] = useState(false);
  const [radarVisible, setRadarVisible] = useState(false);
  const [allServicesModalVisible, setAllServicesModalVisible] = useState(false);

  React.useEffect(() => {
    async function fetchServices() {
      try {
        const res = await servicesAPI.getCategories();
        if (res && res.success && Array.isArray(res.categories)) {
          setPrimaryServices(
            res.categories.map((c) => ({
              id: c.category.toLowerCase().replace(/\s+/g, '-'),
              name: c.category,
              icon: c.icon || '⚡',
            }))
          );
        }
      } catch (err) {
        console.warn('[SERVICES] Load failed:', err.message);
      }
    }
    fetchServices();
  }, []);

  const searchInputRef = React.useRef(null);

  const handleSearchPress = () => {
    setCurrentTab('home');
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 150);
  };

  // If not logged in, render the login screens
  if (!isAuthenticated) {
    if (authView === 'worker') {
      return <WorkerLoginScreen onSwitchToCustomer={() => setAuthView('customer')} />;
    }
    return <CustomerLoginScreen onSwitchToWorker={() => setAuthView('worker')} />;
  }

  // If profile setup is not completed, block Home/Dashboard with the Setup Profile Popup
  if (!isProfileCompleted) {
    if (userType === 'worker') {
      return <WorkerProfileSetupModal visible={true} />;
    }
    return <UserProfileSetupModal visible={true} />;
  }

  // If logged in as worker and profile is completed, render the Worker Dashboard
  if (userType === 'worker') {
    return <WorkerDashboard />;
  }

  // If logged in as admin, render the Admin Executive Portal (Prompt 5)
  if (userType === 'admin') {
    return <AdminPortal />;
  }

  // Service click handler
  const handleSelectService = (serviceName) => {
    setSelectedService(serviceName);
    setBookingOptionsVisible(true);
  };

  const handleOpenJaldi = () => {
    setBookingOptionsVisible(false);
    setRadarVisible(true);
  };

  const handleOpenList = () => {
    setBookingOptionsVisible(false);
    setWorkersListVisible(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BrandColors.primaryBlue} />

      {/* RENDER CURRENT TAB */}
      {currentTab === 'bookings' ? (
        <BookingsScreen onNavigateTab={setCurrentTab} />
      ) : currentTab === 'profile' ? (
        <ProfileScreen />
      ) : (
        <>
          {/* Apple-style Professional Royal Blue App Bar (Immune to phone dark mode) */}
          <View style={styles.appleAppBar}>
            <SafeAreaView edges={['top']} style={styles.appBarSafeArea}>
              {/* Top Row: Location & User Avatar */}
              <View style={styles.topRow}>
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      'Service Location',
                      'Deliver to: Home • Sector 14, Gurugram / Delhi NCR'
                    );
                  }}
                  style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}>
                  <View style={styles.locationPinCircle}>
                    <Text style={styles.locationPinEmoji}>📍</Text>
                  </View>
                  <View style={styles.locationTextColumn}>
                    <Text style={styles.locationSubLabel}>Service location</Text>
                    <View style={styles.locationTitleRow}>
                      <Text style={styles.locationMainTitle} numberOfLines={1}>
                        {userLocation}
                      </Text>
                      <Text style={styles.chevron}>▾</Text>
                    </View>
                  </View>
                </Pressable>

                {/* Apple-style User Avatar */}
                <Pressable
                  onPress={() => setCurrentTab('profile')}
                  style={styles.avatarButton}>
                  <Text style={styles.avatarText}>{userName.charAt(0)}</Text>
                </Pressable>
              </View>

              {/* Headline */}
              <Text style={styles.heroHeadline}>What needs fixing today?</Text>

              {/* Search Bar Capsule */}
              <View style={styles.searchCapsule}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="Search electrician, AC, plumber..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearch}>
                    <Text style={styles.clearSearchText}>✕</Text>
                  </Pressable>
                )}
              </View>
            </SafeAreaView>
          </View>

          {/* Main Body Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.contentWrapper}>
              {/* FESTIVE OFFER BANNER (Explicitly requested by user) */}
              <View style={styles.festiveBanner}>
                <View style={styles.festiveLeft}>
                  <View style={styles.festiveTag}>
                    <Text style={styles.festiveTagText}>⚡ FESTIVE MEGA OFFER</Text>
                  </View>
                  <Text style={styles.festiveTitle}>FLAT ₹150 OFF on 1st Service</Text>
                  <Text style={styles.festiveSubtitle}>
                    Apply code FESTIVE150 • Valid on AC, Plumbing & 100+ Solutions
                  </Text>
                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        'Festive Offer Applied',
                        '₹150 discount applied on your next booking!'
                      )
                    }
                    style={({ pressed }) => [styles.claimBtn, pressed && styles.pressed]}>
                    <Text style={styles.claimBtnText}>Claim ₹150 Voucher →</Text>
                  </Pressable>
                </View>
                <View style={styles.festiveRightGraphic}>
                  <Text style={styles.festiveGraphicEmoji}>🎉</Text>
                </View>
              </View>

              {/* Popular Services Section (Popular listed first, with View More option) */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Popular Services</Text>
                <Pressable
                  onPress={() => setAllServicesModalVisible(true)}
                  style={({ pressed }) => [styles.viewMoreBtn, pressed && styles.pressed]}>
                  <Text style={styles.viewMoreBtnText}>View More (100+) →</Text>
                </Pressable>
              </View>

              {/* Dynamic Service Grid from Database (Popular Services) */}
              <View style={styles.servicesGrid}>
                {primaryServices.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSelectService(item.name)}
                    style={({ pressed }) => [
                      styles.serviceGridItem,
                      pressed && styles.serviceItemPressed,
                    ]}>
                    <View style={styles.serviceIconSquircle}>
                      <Text style={styles.serviceEmoji}>{item.icon}</Text>
                    </View>
                    <Text style={styles.serviceLabel}>{item.name}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Explore All 100+ Services Wide Card */}
              <Pressable
                onPress={() => setAllServicesModalVisible(true)}
                style={({ pressed }) => [styles.exploreAllCard, pressed && styles.pressed]}>
                <View style={styles.exploreAllLeft}>
                  <Text style={styles.exploreAllTitle}>Explore All 100+ Home Services</Text>
                  <Text style={styles.exploreAllSubtitle}>
                    AC repair, fan fix, deep clean, carpenter, locks, and more
                  </Text>
                </View>
                <View style={styles.exploreAllArrow}>
                  <Text style={styles.exploreArrowText}>→</Text>
                </View>
              </Pressable>

              {/* "Need help right now? Jaldi Chahiye" Banner matching Screenshot 2 */}
              <Pressable
                onPress={() => handleSelectService('Electrician')}
                style={({ pressed }) => [styles.jaldiBanner, pressed && styles.pressed]}>
                <View style={styles.jaldiDarkIconBox}>
                  <Text style={styles.jaldiLightning}>⚡</Text>
                </View>
                <View style={styles.jaldiTextColumn}>
                  <Text style={styles.jaldiBannerTitle}>Need help right now?</Text>
                  <Text style={styles.jaldiBannerSubtitle}>
                    Pick a service and tap <Text style={styles.boldJaldi}>Jaldi Chahiye</Text>.
                  </Text>
                </View>
              </Pressable>

              {/* Trust Guarantees Ribbon */}
              <View style={styles.trustRibbon}>
                <View style={styles.trustItem}>
                  <Text style={styles.trustEmoji}>⏱</Text>
                  <Text style={styles.trustText}>30-45 Min Arrival</Text>
                </View>
                <View style={styles.trustDivider} />
                <View style={styles.trustItem}>
                  <Text style={styles.trustEmoji}>🛡</Text>
                  <Text style={styles.trustText}>30-Day Warranty</Text>
                </View>
                <View style={styles.trustDivider} />
                <View style={styles.trustItem}>
                  <Text style={styles.trustEmoji}>★</Text>
                  <Text style={styles.trustText}>4.88 Rating</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </>
      )}

      {/* Floating iPhone Glass Pill Tab Bar (Image 5) */}
      <FloatingIPhoneTabBar
        activeTab={currentTab}
        onTabSelect={(tabId) => setCurrentTab(tabId)}
        onSearchPress={handleSearchPress}
      />

      {/* All 100+ Services Modal */}
      <AllServicesModal
        visible={allServicesModalVisible}
        onClose={() => setAllServicesModalVisible(false)}
        onSelectService={(catName) => {
          setAllServicesModalVisible(false);
          setSelectedService(catName);
          setBookingOptionsVisible(true);
        }}
      />

      {/* Booking Option Modal (Screenshot 3) */}
      <BookingOptionsModal
        visible={bookingOptionsVisible}
        serviceName={selectedService}
        onClose={() => setBookingOptionsVisible(false)}
        onRequestJaldi={handleOpenJaldi}
        onViewList={handleOpenList}
      />

      {/* Electricians List Modal (Screenshot 4) */}
      <WorkersListModal
        visible={workersListVisible}
        serviceName={selectedService}
        onClose={() => setWorkersListVisible(false)}
        onBookingComplete={() => setCurrentTab('bookings')}
      />

      {/* Live Radar Sonar Modal (Screenshot 5) */}
      <JaldiChahiyeRadarModal
        visible={radarVisible}
        serviceName={selectedService}
        onClose={() => setRadarVisible(false)}
        onSuccess={() => setCurrentTab('bookings')}
      />

      {/* Universal Customer Rating & Overcharge Report Popup */}
      <JobCompletedModal
        visible={completedJobModalVisible}
        booking={completedBooking}
        onClose={() => setCompletedJobModalVisible(false)}
        onOpenPayment={() => {
          setCompletedJobModalVisible(false);
          setCurrentTab('bookings');
        }}
        onOpenReportExtra={() => {
          setCompletedJobModalVisible(false);
          setCurrentTab('bookings');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  appleAppBar: {
    backgroundColor: BrandColors.primaryBlue,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 22,
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  appBarSafeArea: {
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 4,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  locationPinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPinEmoji: {
    fontSize: 15,
  },
  locationTextColumn: {
    flex: 1,
  },
  locationSubLabel: {
    fontSize: 11,
    color: '#BFDBFE',
    fontWeight: '500',
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationMainTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    maxWidth: 220,
  },
  chevron: {
    fontSize: 11,
    color: BrandColors.accentYellow,
    fontWeight: '900',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  heroHeadline: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  searchCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: BrandColors.navyText,
    paddingVertical: 0,
  },
  clearSearch: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: BottomTabInset + 60,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  festiveBanner: {
    backgroundColor: BrandColors.primaryBlue,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  festiveLeft: {
    flex: 1,
    paddingRight: 8,
  },
  festiveTag: {
    backgroundColor: BrandColors.accentYellow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  festiveTagText: {
    color: BrandColors.navyText,
    fontSize: 10,
    fontWeight: '800',
  },
  festiveTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  festiveSubtitle: {
    fontSize: 11,
    color: '#DBEAFE',
    marginBottom: 10,
    lineHeight: 15,
  },
  claimBtn: {
    backgroundColor: BrandColors.accentYellow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  claimBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  festiveRightGraphic: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  festiveGraphicEmoji: {
    fontSize: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  viewMoreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  viewMoreBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  exploreAllCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  exploreAllLeft: {
    flex: 1,
    paddingRight: 10,
  },
  exploreAllTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.navyText,
    marginBottom: 2,
  },
  exploreAllSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  exploreAllArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreArrowText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
    marginBottom: 20,
  },
  serviceGridItem: {
    width: '23%',
    alignItems: 'center',
  },
  serviceIconSquircle: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  serviceEmoji: {
    fontSize: 28,
  },
  serviceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.navyText,
    textAlign: 'center',
  },
  serviceItemPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  jaldiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.accentYellow,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    marginBottom: 20,
    shadowColor: BrandColors.accentYellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  jaldiDarkIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: BrandColors.navyText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jaldiLightning: {
    fontSize: 22,
    color: BrandColors.accentYellow,
  },
  jaldiTextColumn: {
    flex: 1,
  },
  jaldiBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.navyText,
    marginBottom: 2,
  },
  jaldiBannerSubtitle: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  boldJaldi: {
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  trustRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trustEmoji: {
    fontSize: 13,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.navyText,
  },
  trustDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});

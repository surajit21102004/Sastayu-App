import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { workersAPI } from '@/services/api';
import { WorkerBookingScheduleModal } from './WorkerBookingScheduleModal';
import { TechnicianAvatar } from '@/components/common/TechnicianAvatar';

export const WorkersListModal = ({
  visible,
  serviceName,
  onClose,
  onBookingComplete,
}) => {
  const { userLocation, userCoordinates } = useAuth();
  const [activeFilter, setActiveFilter] = useState('nearest'); // 'nearest' | 'rating' | 'price'
  const [workersList, setWorkersList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Selected worker for schedule booking modal
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    async function fetchWorkers() {
      setLoading(true);
      try {
        const res = await workersAPI.getNearby(
          serviceName || 'Electrician',
          userCoordinates?.latitude,
          userCoordinates?.longitude
        );
        if (res && res.success && Array.isArray(res.workers)) {
          setWorkersList(res.workers);
        } else {
          setWorkersList([]);
        }
      } catch (err) {
        console.warn('[WORKERS] Fetch failed:', err.message);
        setWorkersList([]);
      } finally {
        setLoading(false);
      }
    }
    fetchWorkers();
  }, [visible, serviceName]);

  // Apply active sorting filter
  const sortedWorkers = [...workersList].sort((a, b) => {
    if (activeFilter === 'nearest') {
      return (a.distanceKm || 0) - (b.distanceKm || 0);
    }
    if (activeFilter === 'rating') {
      return (b.rating || 0) - (a.rating || 0);
    }
    if (activeFilter === 'price') {
      return (a.hourlyRate || 0) - (b.hourlyRate || 0);
    }
    return 0;
  });

  const handleOpenSchedule = (worker) => {
    setSelectedWorker(worker);
    setScheduleModalVisible(true);
  };

  const handleBookingSuccess = () => {
    setScheduleModalVisible(false);
    onClose();
    if (onBookingComplete) onBookingComplete();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header with Back Arrow */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
            <View>
              <Text style={styles.backTitle}>{serviceName || 'Service'} Partners</Text>
              <Text style={styles.backSubtitle}>Sorted by nearest to your location</Text>
            </View>
          </Pressable>
        </View>

        {/* Filter Chips Bar */}
        <View style={styles.filtersBar}>
          <Pressable
            onPress={() => setActiveFilter('nearest')}
            style={[
              styles.filterChip,
              activeFilter === 'nearest' && styles.filterChipActive,
            ]}>
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'nearest' && styles.filterChipTextActive,
              ]}>
              📍 Nearest First (1km - 5km)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveFilter('rating')}
            style={[
              styles.filterChip,
              activeFilter === 'rating' && styles.filterChipActive,
            ]}>
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'rating' && styles.filterChipTextActive,
              ]}>
              ★ Top Rated
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveFilter('price')}
            style={[
              styles.filterChip,
              activeFilter === 'price' && styles.filterChipActive,
            ]}>
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'price' && styles.filterChipTextActive,
              ]}>
              ₹ Low Price
            </Text>
          </Pressable>
        </View>

        {/* Content Area */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={BrandColors.primaryBlue} />
            <Text style={styles.loadingText}>Finding nearest {serviceName}s...</Text>
          </View>
        ) : sortedWorkers.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>No partners online right now</Text>
            <Text style={styles.emptySub}>
              Please check back in a few minutes or try "Jaldi Chahiye" for instant dispatch.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {sortedWorkers.map((worker) => (
              <View key={worker.id} style={styles.workerCard}>
                <View style={styles.cardTopRow}>
                  {/* Avatar / Selfie */}
                  <TechnicianAvatar
                    uri={worker.selfieUrl}
                    name={worker.name}
                    trade={worker.trade}
                    size={52}
                    showOnlineBadge={true}
                    isOnline={worker.isOnline}
                    style={{ marginRight: 12 }}
                  />

                  {/* Worker Details */}
                  <View style={styles.infoCol}>
                    <View style={styles.nameRow}>
                      <Text style={styles.workerName}>{worker.name}</Text>
                      <View style={styles.verifiedTag}>
                        <Text style={styles.verifiedTagText}>✓ Verified</Text>
                      </View>
                    </View>

                    <Text style={styles.tradeSub}>{worker.trade}</Text>

                    <View style={styles.statsRow}>
                      <View style={styles.ratingBadge}>
                        <Text style={styles.ratingStar}>★</Text>
                        <Text style={styles.ratingNum}>{worker.rating}</Text>
                      </View>
                      <Text style={styles.jobsDoneText}>• {worker.totalJobs} jobs completed</Text>
                    </View>
                  </View>
                </View>

                {/* Distance & Price Ribbon */}
                <View style={styles.metaRibbon}>
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>📍 {worker.distanceLabel || '1.2 km away'}</Text>
                  </View>
                  <View style={styles.etaBadge}>
                    <Text style={styles.etaText}>⚡ {worker.etaLabel || '15 mins away'}</Text>
                  </View>
                  <View style={styles.priceCol}>
                    <Text style={styles.priceRate}>₹{worker.hourlyRate}</Text>
                    <Text style={styles.priceUnit}>/hr base</Text>
                  </View>
                </View>

                {/* Book Technician Button */}
                <Pressable
                  onPress={() => handleOpenSchedule(worker)}
                  style={({ pressed }) => [
                    styles.bookButton,
                    pressed && styles.buttonPressed,
                  ]}>
                  <Text style={styles.bookButtonText}>Book Technician →</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Schedule & Price Negotiation Modal */}
        {selectedWorker && (
          <WorkerBookingScheduleModal
            visible={scheduleModalVisible}
            worker={selectedWorker}
            serviceName={serviceName}
            onClose={() => setScheduleModalVisible(false)}
            onBookingSuccess={handleBookingSuccess}
          />
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backArrow: {
    fontSize: 28,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
    marginTop: -3,
  },
  backTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  backSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  filtersBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: BrandColors.primaryBlue,
    borderColor: BrandColors.primaryBlue,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: BrandColors.navyText,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  workerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  verifiedTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  tradeSub: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  ratingStar: {
    fontSize: 10,
    color: '#B45309',
  },
  ratingNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  jobsDoneText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  metaRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  distanceBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
  },
  etaBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  etaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  priceCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  priceRate: {
    fontSize: 15,
    fontWeight: '900',
    color: '#059669',
  },
  priceUnit: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  bookButton: {
    backgroundColor: BrandColors.primaryBlue,
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primaryBlue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});

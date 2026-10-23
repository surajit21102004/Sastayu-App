import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';

const ALL_CATEGORIES_DATA = [
  {
    category: 'Electrician',
    icon: '⚡',
    tag: 'MOST POPULAR',
    tagColor: '#FEF3C7',
    tagTextColor: '#92400E',
    basePrice: 149,
    description: 'Fan repair, switches, wiring, MCB & fuse, light installation',
    services: [
      { name: 'Ceiling Fan Repair / Install', price: 200, icon: '🌀' },
      { name: 'Switchboard & Socket Fixing', price: 150, icon: '🔌' },
      { name: 'MCB Tripping & Short Circuit', price: 250, icon: '⚡' },
      { name: 'Chandelier & Light Fitting', price: 180, icon: '💡' },
      { name: 'Inverter & Battery Wiring', price: 300, icon: '🔋' },
    ],
  },
  {
    category: 'Plumber',
    icon: '🔧',
    tag: 'POPULAR',
    tagColor: '#DBEAFE',
    tagTextColor: '#1E40AF',
    basePrice: 149,
    description: 'Tap leakage, washbasin, toilet flush, pipeline, geyser fitting',
    services: [
      { name: 'Tap & Mixer Leakage Repair', price: 199, icon: '🚰' },
      { name: 'Toilet Flush & Jet Spray', price: 220, icon: '🚽' },
      { name: 'Washbasin / Sink Blockage', price: 249, icon: '🧽' },
      { name: 'Geyser Pipe Fitting & Valve', price: 299, icon: '🚿' },
      { name: 'Water Tank Float Valve', price: 250, icon: '🛢️' },
    ],
  },
  {
    category: 'AC Repair',
    icon: '❄️',
    tag: 'HIGH DEMAND',
    tagColor: '#E0E7FF',
    tagTextColor: '#3730A3',
    basePrice: 299,
    description: 'Deep foam jet service, water leakage, gas charging, cooling issue',
    services: [
      { name: 'AC Deep Foam Jet Cleaning', price: 399, icon: '🧼' },
      { name: 'Water Leakage Repair', price: 350, icon: '💧' },
      { name: 'Gas Leak Check & Top-Up', price: 499, icon: '❄️' },
      { name: 'AC Uninstallation / Installation', price: 599, icon: '🛠️' },
      { name: 'PCB & Capacitor Repair', price: 450, icon: '📟' },
    ],
  },
  {
    category: 'Appliance',
    icon: '🧺',
    tag: 'SAME DAY',
    tagColor: '#DCFCE7',
    tagTextColor: '#166534',
    basePrice: 199,
    description: 'Washing machine, refrigerator, microwave, water purifier (RO)',
    services: [
      { name: 'Washing Machine Not Spinning', price: 299, icon: '🧺' },
      { name: 'Refrigerator Cooling Issue', price: 349, icon: '🧊' },
      { name: 'RO Water Filter Membrane & Service', price: 299, icon: '💧' },
      { name: 'Microwave Not Heating', price: 279, icon: '🍲' },
    ],
  },
  {
    category: 'Carpenter',
    icon: '🔨',
    tag: 'EXPERTS',
    tagColor: '#F3E8FF',
    tagTextColor: '#6B21A8',
    basePrice: 199,
    description: 'Door lock repair, furniture assembly, hinges, shelf drilling',
    services: [
      { name: 'Door Lock & Latch Replacement', price: 249, icon: '🚪' },
      { name: 'Cupboard Hinge & Channel Repair', price: 199, icon: '🗄️' },
      { name: 'Bed & Table Assembly', price: 399, icon: '🪑' },
      { name: 'Drilling & Wall Hanging', price: 149, icon: '🔩' },
    ],
  },
  {
    category: 'Cleaning',
    icon: '✨',
    tag: 'DEEP CLEAN',
    tagColor: '#FEF9C3',
    tagTextColor: '#854D0E',
    basePrice: 399,
    description: 'Bathroom deep cleaning, kitchen chimney, sofa shampooing',
    services: [
      { name: 'Bathroom Acid-Free Deep Clean', price: 399, icon: '🚿' },
      { name: 'Kitchen Chimney & Stove Degreasing', price: 499, icon: '🍳' },
      { name: 'Sofa Fabric Shampooing (3-Seater)', price: 599, icon: '🛋️' },
      { name: 'Full Home Balcony & Floor Scrub', price: 799, icon: '🧹' },
    ],
  },
  {
    category: 'Painting',
    icon: '🎨',
    tag: 'WARRANTY',
    tagColor: '#FFE4E6',
    tagTextColor: '#9F1239',
    basePrice: 499,
    description: 'Wall touch-up, waterproofing, room painting, texture finish',
    services: [
      { name: 'Single Room Wall Fresh Coat', price: 899, icon: '🖌️' },
      { name: 'Water Seepage & Damp Proofing', price: 599, icon: '🛡️' },
      { name: 'Drill Hole & Crack Filling', price: 299, icon: '🧱' },
    ],
  },
  {
    category: 'Pest Control',
    icon: '🛡️',
    tag: 'ODORLESS',
    tagColor: '#E2E8F0',
    tagTextColor: '#334155',
    basePrice: 349,
    description: 'Cockroach herbal gel, termite treatment, bedbug eradication',
    services: [
      { name: 'Cockroach Herbal Gel Spray', price: 349, icon: '🪳' },
      { name: 'Bedbug Dual-Stage Treatment', price: 699, icon: '🛏️' },
      { name: 'Termite Drill & Injection Warranty', price: 999, icon: '🪵' },
    ],
  },
];

const FILTER_TABS = [
  'All',
  'Electrician',
  'Plumber',
  'AC Repair',
  'Appliance',
  'Carpenter',
  'Cleaning',
  'Painting',
  'Pest Control',
];

export const AllServicesModal = ({ visible, onClose, onSelectService }) => {
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState('All');

  const filteredCategories = ALL_CATEGORIES_DATA.filter((cat) => {
    if (selectedTab !== 'All' && cat.category !== selectedTab) {
      return false;
    }
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const matchCat = cat.category.toLowerCase().includes(query);
    const matchDesc = cat.description.toLowerCase().includes(query);
    const matchSub = cat.services.some((s) => s.name.toLowerCase().includes(query));
    return matchCat || matchDesc || matchSub;
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.headerTitle}>All 100+ Home Services</Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search electrician, fan, AC, tap, lock..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Category Horizontal Filter Chips */}
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}>
            {FILTER_TABS.map((tab) => {
              const isSelected = selectedTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setSelectedTab(tab)}
                  style={[styles.tabChip, isSelected && styles.tabChipActive]}>
                  <Text style={[styles.tabChipText, isSelected && styles.tabChipTextActive]}>
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Services List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {filteredCategories.map((item) => (
            <View key={item.category} style={styles.categoryCard}>
              {/* Category Header */}
              <View style={styles.categoryTop}>
                <View style={styles.categoryIconCircle}>
                  <Text style={styles.categoryEmoji}>{item.icon}</Text>
                </View>
                <View style={styles.categoryMeta}>
                  <View style={styles.tagRow}>
                    <Text style={styles.categoryTitle}>{item.category}</Text>
                    <View style={[styles.badge, { backgroundColor: item.tagColor }]}>
                      <Text style={[styles.badgeText, { color: item.tagTextColor }]}>
                        {item.tag}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.categorySub}>{item.description}</Text>
                </View>
              </View>

              {/* Sub-services list with Suggested Prices */}
              <View style={styles.subServicesList}>
                {item.services.map((sub) => (
                  <Pressable
                    key={sub.name}
                    onPress={() => onSelectService(item.category, sub.name, sub.price)}
                    style={({ pressed }) => [
                      styles.subServiceRow,
                      pressed && styles.subServicePressed,
                    ]}>
                    <View style={styles.subLeft}>
                      <Text style={styles.subIcon}>{sub.icon}</Text>
                      <Text style={styles.subName}>{sub.name}</Text>
                    </View>
                    <View style={styles.subRight}>
                      <Text style={styles.subPrice}>₹{sub.price}</Text>
                      <Text style={styles.bookArrow}>Book →</Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              {/* View all workers in this category */}
              <Pressable
                onPress={() => onSelectService(item.category, `${item.category} Service`, item.basePrice)}
                style={({ pressed }) => [styles.viewWorkersBtn, pressed && styles.btnPressed]}>
                <Text style={styles.viewWorkersBtnText}>
                  View Nearest {item.category} Partners →
                </Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backArrow: {
    fontSize: 28,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
    marginTop: -3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  clearSearch: {
    fontSize: 14,
    color: '#94A3B8',
    padding: 4,
  },
  tabsContainer: {
    marginBottom: 12,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabChipActive: {
    backgroundColor: BrandColors.primaryBlue,
    borderColor: BrandColors.primaryBlue,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryMeta: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  categorySub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  subServicesList: {
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    paddingTop: 8,
    marginBottom: 10,
  },
  subServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#F8FAFC',
  },
  subServicePressed: {
    backgroundColor: '#F8FAFC',
  },
  subLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  subIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  subName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  subRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  bookArrow: {
    fontSize: 12,
    fontWeight: '800',
    color: BrandColors.primaryBlue,
  },
  viewWorkersBtn: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  viewWorkersBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primaryBlue,
  },
  btnPressed: {
    opacity: 0.8,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors, BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { ServiceCard } from '@/components/services/ServiceCard';
import { SastayuLogo } from '@/components/brand/SastayuLogo';
import { servicesAPI } from '@/services/api';

export default function ExploreScreen() {
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [servicesList, setServicesList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      try {
        const [servicesRes, catRes] = await Promise.all([
          servicesAPI.getServices(),
          servicesAPI.getCategories(),
        ]);

        if (servicesRes && servicesRes.success && Array.isArray(servicesRes.services)) {
          const mapped = servicesRes.services.map((s) => ({
            id: String(s.id),
            categoryId: s.category.toLowerCase().replace(/\s+/g, '-'),
            categoryName: s.category,
            title: s.name,
            shortDesc: s.description || 'Standard verified home service',
            price: Number(s.base_price) || 149,
            rating: 4.9,
            durationMinutes: 30,
            warrantyDays: 30,
            isPopular: true,
            features: ['Safety tested', 'Standard pricing', 'Tools included'],
            inclusions: ['Pre-service inspection', 'Skilled technician', 'Safety check'],
          }));
          setServicesList(mapped);
        }

        if (catRes && catRes.success && Array.isArray(catRes.categories)) {
          setCategoriesList(catRes.categories.map((c) => ({
            id: c.category.toLowerCase().replace(/\s+/g, '-'),
            name: c.category,
            icon: c.icon || '⚡',
          })));
        }
      } catch (err) {
        console.warn('[CATALOG] Load failed:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const filtered = servicesList.filter((svc) => {
    const matchesCat = selectedCat === 'all' || svc.categoryId === selectedCat;
    const matchesSearch =
      searchTerm.trim() === '' ||
      svc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      svc.shortDesc.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleBook = (item) => {
    Alert.alert(
      'Schedule Service',
      `Booking request for ${item.title} (₹${item.price}) initialized. A verified technician will be dispatched to your location.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Banner */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>100+ Solutions Catalog</Text>
            <Text style={styles.headerSubtitle}>
              Certified professionals at standardized rates
            </Text>
          </View>
          <SastayuLogo variant="badge" width={36} height={36} />
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search service by name or symptom..."
            placeholderTextColor="#94A3B8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {/* Category Pills Bar */}
      <View style={styles.categoriesBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
          <Pressable
            onPress={() => setSelectedCat('all')}
            style={[styles.pill, selectedCat === 'all' && styles.pillActive]}>
            <Text style={[styles.pillText, selectedCat === 'all' && styles.pillTextActive]}>
              All Categories
            </Text>
          </Pressable>

          {categoriesList.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCat(cat.id)}
              style={[styles.pill, selectedCat === cat.id && styles.pillActive]}>
              <Text style={[styles.pillText, selectedCat === cat.id && styles.pillTextActive]}>
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.resultsInfoRow}>
            <Text style={styles.resultsCount}>
              Showing {filtered.length} active solution{filtered.length !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.warrantyTag}>🛡 30-Day Sastayu Assurance</Text>
          </View>

          {filtered.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onPress={() => handleBook(service)}
              onBook={() => handleBook(service)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: BrandColors.navyText,
  },
  headerSubtitle: {
    fontSize: 12,
    color: BrandColors.mutedText,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: BrandColors.navyText,
    paddingVertical: 0,
  },
  categoriesBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  pillsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillActive: {
    backgroundColor: BrandColors.primaryBlue,
    borderColor: BrandColors.primaryBlue,
  },
  pillText: {
    fontSize: 12,
    color: BrandColors.navyText,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  contentScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: BottomTabInset + 40,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  resultsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.navyText,
  },
  warrantyTag: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.primaryBlue,
  },
});

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { authAPI, bookingsAPI, disputesAPI } from '@/services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Start unauthenticated so user sees the login screen first
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState('customer'); // 'customer' | 'worker'
  const [isProfileCompleted, setIsProfileCompleted] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [workerTrade, setWorkerTrade] = useState('Electrician');
  const [userName, setUserName] = useState('');
  const [workerSelfie, setWorkerSelfie] = useState(null);
  const [userLocation, setUserLocation] = useState('');
  const [userCoordinates, setUserCoordinates] = useState({ latitude: 22.5726, longitude: 88.3639 });
  const [authToken, setAuthToken] = useState(null);
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);


  // Fetch live bookings whenever authenticated as customer
  const refreshBookings = async () => {
    try {
      const res = await bookingsAPI.getBookings(null, authToken);
      if (res && res.success && Array.isArray(res.bookings)) {
        // Map MySQL records to UI format
        const mapped = res.bookings.map((b) => ({
          id: String(b.id),
          serviceTitle: b.service_title,
          technicianName: b.worker_name || (b.status === 'pending' ? 'Searching for nearby partner...' : 'Assigned Partner'),
          technicianPhone: b.worker_phone || '',
          technicianTrade: b.worker_trade || 'Technician',
          technicianSelfie: b.worker_selfie || null,
          rating: Number(b.worker_rating) || 5.0,
          totalJobs: Number(b.worker_jobs) || 0,
          etaMinutes: b.eta_minutes || 0,
          otp: b.otp || '',
          visitCharge: Number(b.visit_charge) || 0,
          totalAmount: Number(b.total_amount) || 0,
          proposedPrice: Number(b.proposed_price) || Number(b.total_amount) || 200,
          counterPrice: b.counter_price ? Number(b.counter_price) : null,
          counterNote: b.counter_note || '',
          negotiationStatus: b.negotiation_status || 'none',
          scheduledDate: b.scheduled_date || 'Today',
          scheduledSlot: b.scheduled_slot || 'Within 30 mins',
          voiceNoteUrl: b.voice_note_url || null,
          issueDetails: b.issue_details || b.customer_notes || '',
          isEmergency: Boolean(b.is_emergency),
          repairPartsCharge: Number(b.repair_charge) || 0,
          status: b.status,
          isRated: Boolean(b.is_rated),
          userRating: Number(b.user_rating) || null,
          reviewComment: b.review_comment || '',
          statusBadge:
            b.status === 'cancelled'
              ? (b.counter_note && b.counter_note.toLowerCase().includes('technician') ? 'Declined by Partner' : 'Cancelled')
              : b.negotiation_status === 'countered'
              ? 'Price Countered'
              : b.status === 'pending'
              ? (b.is_emergency ? '⚡ Searching for partner...' : 'Pending confirmation')
              : b.status === 'in_progress'
              ? 'In progress'
              : b.status === 'accepted'
              ? 'Technician Confirmed'
              : b.status === 'completed'
              ? 'Completed'
              : 'Confirmed',
          badgeType:
            b.status === 'cancelled'
              ? 'red'
              : b.negotiation_status === 'countered' || b.status === 'pending'
              ? 'yellow'
              : b.status === 'completed'
              ? 'gray'
              : 'blue',
          problemNote: b.customer_notes || '',
          timeInfo: b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Recent',
          bookingNumber: b.booking_number || `SY${b.id}`,
          address: b.address || b.user_location || userLocation || 'Sector 14, Gurugram, Delhi NCR',
          userLocation: b.user_location || b.address || userLocation || 'Sector 14, Gurugram, Delhi NCR',
          paymentMode: b.payment_mode || 'cash',
          paymentStatus: b.payment_status || 'pending',
          transactionId: b.transaction_id || null,
        }));
        setBookings(mapped);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.warn('[AUTH] Error refreshing bookings:', err.message);
      setBookings([]);
    }
  };

  const lastSyncTimestamp = useRef(Date.now());
  const seenCounterBookings = useRef(new Set());
  const seenConfirmedBookings = useRef(new Set());
  const seenCancelledBookings = useRef(new Set());
  const [activeInAppAlert, setActiveInAppAlert] = useState(null);

  // Real-Time LIVE Sync Loop (Runs every 2.5s - no manual refresh needed!)
  useEffect(() => {
    if (!isAuthenticated || userType !== 'customer' || !isProfileCompleted) return;

    // Initial fetch
    refreshBookings();

    const syncInterval = setInterval(async () => {
      try {
        const res = await bookingsAPI.liveSync(
          { since: lastSyncTimestamp.current, userType: 'customer' },
          authToken
        );

        if (res && res.success) {
          lastSyncTimestamp.current = res.timestamp || Date.now();

          // If new bookings returned, update live state
          if (Array.isArray(res.customerBookings) && res.customerBookings.length > 0) {
            const mapped = res.customerBookings.map((b) => ({
              id: String(b.id),
              serviceTitle: b.service_title,
              technicianName: b.worker_name || (b.status === 'pending' ? 'Searching for nearby partner...' : 'Assigned Partner'),
              technicianPhone: b.worker_phone || '',
              technicianTrade: b.worker_trade || 'Technician',
              technicianSelfie: b.worker_selfie || null,
              rating: Number(b.worker_rating) || 5.0,
              totalJobs: Number(b.worker_jobs) || 0,
              etaMinutes: b.eta_minutes || 0,
              otp: b.otp || '',
              visitCharge: Number(b.visit_charge) || 0,
              totalAmount: Number(b.total_amount) || 0,
              proposedPrice: Number(b.proposed_price) || Number(b.total_amount) || 200,
              counterPrice: b.counter_price ? Number(b.counter_price) : null,
              counterNote: b.counter_note || '',
              negotiationStatus: b.negotiation_status || 'none',
              scheduledDate: b.scheduled_date || 'Today',
              scheduledSlot: b.scheduled_slot || 'Within 30 mins',
              voiceNoteUrl: b.voice_note_url || null,
              issueDetails: b.issue_details || b.customer_notes || '',
              isEmergency: Boolean(b.is_emergency),
              repairPartsCharge: Number(b.repair_charge) || 0,
              status: b.status,
              isRated: Boolean(b.is_rated),
              userRating: Number(b.user_rating) || null,
              reviewComment: b.review_comment || '',
              statusBadge:
                b.status === 'cancelled'
                  ? (b.counter_note && b.counter_note.toLowerCase().includes('technician') ? 'Declined by Partner' : 'Cancelled')
                  : b.negotiationStatus === 'countered'
                  ? 'Price Countered'
                  : b.status === 'pending'
                  ? (b.is_emergency ? '⚡ Searching for partner...' : 'Pending confirmation')
                  : b.status === 'in_progress'
                  ? 'In progress'
                  : b.status === 'accepted'
                  ? 'Technician Confirmed'
                  : b.status === 'completed'
                  ? 'Completed'
                  : 'Confirmed',
              badgeType:
                b.status === 'cancelled'
                  ? 'red'
                  : b.negotiation_status === 'countered' || b.status === 'pending'
                  ? 'yellow'
                  : b.status === 'completed'
                  ? 'gray'
                  : 'blue',
              problemNote: b.customer_notes || '',
              timeInfo: b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Recent',
              bookingNumber: b.booking_number || `SY${b.id}`,
              address: b.address || b.user_location || userLocation || 'Sector 14, Gurugram, Delhi NCR',
              userLocation: b.user_location || b.address || userLocation || 'Sector 14, Gurugram, Delhi NCR',
              paymentMode: b.payment_mode || 'cash',
              paymentStatus: b.payment_status || 'pending',
              transactionId: b.transaction_id || null,
            }));

            // Alert customer immediately if technician sent a price counter or confirmed or cancelled
            mapped.forEach((b) => {
              if (b.negotiationStatus === 'countered' && !seenCounterBookings.current.has(b.id)) {
                seenCounterBookings.current.add(b.id);
                setActiveInAppAlert({
                  type: 'warning',
                  title: '⚡ Counter-Offer Received!',
                  message: `${b.technicianName} proposed ₹${b.counterPrice} (Your Offer: ₹${b.proposedPrice}).\nReason: "${b.counterNote || 'Adjustment needed'}"\n\nGo to the Bookings tab to Accept or Decline.`,
                });
              }

              // Order Confirmed Real-Time Alert
              if (b.status === 'accepted' && !seenConfirmedBookings.current.has(b.id)) {
                seenConfirmedBookings.current.add(b.id);
                setActiveInAppAlert({
                  type: 'success',
                  title: 'Order Confirmed! 🎉',
                  message: `${b.technicianName} has confirmed your ${b.serviceTitle} for ${b.scheduledDate || 'Today'} (${b.scheduledSlot || 'ASAP'}).\n\nYour Completion OTP: ${b.otp}`,
                });
              }

              // Order Cancelled / Declined Real-Time Alert
              if (b.status === 'cancelled' && !seenCancelledBookings.current.has(b.id)) {
                seenCancelledBookings.current.add(b.id);
                const reason = b.counterNote || 'Technician was unavailable at this slot';
                setActiveInAppAlert({
                  type: 'error',
                  title: 'Booking Cancelled ⚠️',
                  message: `Your booking for ${b.serviceTitle} was cancelled.\nReason: "${reason}".\n\nYou can re-book or pick another partner anytime.`,
                });
              }
            });

            setBookings(mapped);
          } else if (res.eventsCount > 0) {
            refreshBookings();
          }
        }
      } catch (err) {
        // Silent retry
      }
    }, 2500);

    return () => clearInterval(syncInterval);
  }, [isAuthenticated, userType, isProfileCompleted, authToken]);

  // Customer Login with live API verification
  const loginCustomer = async (phone, otp) => {
    setIsLoading(true);
    const rawDigits = (phone || '').replace(/\D/g, '');
    const cleanPhone = rawDigits === '999999999' || rawDigits === '9999999999' ? '999999999' : rawDigits.slice(-10);

    try {
      const res = await authAPI.customerVerifyOtp(cleanPhone, otp);
      if (res && res.success) {
        setAuthToken(res.token);

        // Prompt 5: Admin Login with 999999999 & 9999
        if (res.userType === 'admin' || res.role === 'admin' || cleanPhone === '999999999') {
          setUserType('admin');
          setUserName('Sastayu Super Admin');
          setPhoneNumber('999999999');
          setIsProfileCompleted(true);
          setIsAuthenticated(true);
          return { success: true, isProfileCompleted: true, userType: 'admin' };
        }

        setUserType('customer');
        const customerData = res.user || { id: 1, phone: cleanPhone, name: res.user?.name || '', role: 'customer' };
        setUser(customerData);
        setPhoneNumber(res.user?.phone || cleanPhone);
        setUserName(res.user?.name || '');
        setUserLocation(res.user?.address || '');
        if (res.user?.latitude && res.user?.longitude) {
          setUserCoordinates({
            latitude: parseFloat(res.user.latitude),
            longitude: parseFloat(res.user.longitude),
          });
        }
        setIsProfileCompleted(Boolean(res.isProfileCompleted));
        setIsAuthenticated(true);
        return { success: true, isProfileCompleted: Boolean(res.isProfileCompleted) };
      } else {

        return { success: false, message: res?.message || 'Invalid verification code.' };
      }
    } catch (err) {
      console.warn('[AUTH] Customer login error:', err.message);
      return { success: false, message: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Worker Login with live API
  const loginWorker = async (phone, otp = '1234', trade = 'Electrician') => {
    setIsLoading(true);
    const rawDigits = (phone || '').replace(/\D/g, '');
    const cleanPhone = rawDigits === '999999999' || rawDigits === '9999999999' ? '999999999' : rawDigits.slice(-10);

    try {
      const res = await authAPI.workerLogin(cleanPhone, otp, trade);
      if (res && res.success) {
        setAuthToken(res.token);

        // Prompt 5: Admin Login with 999999999 & 9999
        if (res.userType === 'admin' || res.role === 'admin' || cleanPhone === '999999999') {
          setUserType('admin');
          setUserName('Sastayu Super Admin');
          setPhoneNumber('999999999');
          setIsProfileCompleted(true);
          setIsAuthenticated(true);
          return { success: true, isProfileCompleted: true, userType: 'admin' };
        }

        setUserType('worker');
        const workerData = res.worker || { id: 1, phone: cleanPhone, trade, name: res.worker?.name || '', role: 'worker' };
        setUser(workerData);
        setWorkerTrade(res.worker?.customTrade || res.worker?.trade || trade);
        setPhoneNumber(res.worker?.phone || cleanPhone);
        setUserName(res.worker?.name || '');
        setWorkerSelfie(res.worker?.selfieUrl || res.worker?.selfie_url || null);
        setUserLocation(res.worker?.address || '');
        setIsProfileCompleted(Boolean(res.isProfileCompleted));
        setIsAuthenticated(true);
        return { success: true, isProfileCompleted: Boolean(res.isProfileCompleted) };
      } else {

        return { success: false, message: res?.message || 'Login failed.' };
      }
    } catch (err) {
      console.warn('[AUTH] Worker login error:', err.message);
      return { success: false, message: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Dedicated Admin Login (Prompt 5: 999999999 & 9999)
  const loginAdmin = async (phone = '999999999', otp = '9999') => {
    setIsLoading(true);
    try {
      const res = await authAPI.customerVerifyOtp(phone, otp);
      if (res && res.success) {
        setAuthToken(res.token);
        setUserType('admin');
        setUserName('Sastayu Super Admin');
        setPhoneNumber('999999999');
        setIsProfileCompleted(true);
        setIsAuthenticated(true);
        return { success: true, isProfileCompleted: true, userType: 'admin' };
      } else {
        return { success: false, message: res?.message || 'Admin authentication failed.' };
      }
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Setup Customer Profile (First time popup submission)
  const completeCustomerProfile = async (profileData) => {
    setIsLoading(true);
    try {
      const res = await authAPI.customerSetupProfile(profileData, authToken);
      if (res && res.success) {
        setUserName(res.user?.name || profileData.name);
        setUserLocation(res.user?.address || profileData.address);
        if (profileData.latitude && profileData.longitude) {
          setUserCoordinates({
            latitude: parseFloat(profileData.latitude),
            longitude: parseFloat(profileData.longitude),
          });
        }
        setIsProfileCompleted(true);
        return { success: true };
      } else {
        return { success: false, message: res?.message || 'Failed to save profile.' };
      }
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Setup Worker Profile (First time partner onboarding submission)
  const completeWorkerProfile = async (profileData) => {
    setIsLoading(true);
    try {
      const res = await authAPI.workerSetupProfile(profileData, authToken);
      if (res && res.success) {
        setUserName(res.worker?.name || profileData.name);
        setWorkerSelfie(res.worker?.selfie_url || res.worker?.selfieUrl || null);
        setUserLocation(res.worker?.address || profileData.address);
        setWorkerTrade(profileData.trade === 'Other' ? profileData.customTrade : profileData.trade);
        setIsProfileCompleted(true);
        return { success: true };
      } else {
        return { success: false, message: res?.message || 'Failed to save partner profile.' };
      }
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAuthToken(null);
    setWorkerSelfie(null);
    setUser(null);
  };


  // Create booking in Live MySQL Database & local state
  const addBooking = async (newBookingData) => {
    // Optimistic local update
    setBookings((prev) => [newBookingData, ...prev]);

    try {
      await bookingsAPI.createBooking(
        {
          serviceTitle: newBookingData.serviceTitle,
          serviceType: newBookingData.serviceType || 'jaldi',
          totalAmount: newBookingData.totalAmount || 149.0,
          proposedPrice: newBookingData.proposedPrice || newBookingData.totalAmount || 149.0,
          visitCharge: newBookingData.visitCharge || 149.0,
          customerNotes: newBookingData.problemNote || newBookingData.customerNotes || '',
          issueDetails: newBookingData.issueDetails || newBookingData.problemNote || '',
          address: newBookingData.address || userLocation,
          paymentMode: newBookingData.paymentMode || newBookingData.paymentMethod || 'cash',
          paymentStatus: newBookingData.paymentStatus || 'pending',
          transactionId: newBookingData.transactionId || null,
        },
        authToken
      );
    } catch (err) {
      console.warn('[AUTH] Create booking API failed:', err.message);
    }
  };

  // Update booking status in Live MySQL
  const updateBookingStatus = async (id, newStatus) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
    );

    try {
      await bookingsAPI.updateStatus(id, newStatus, authToken);
    } catch (err) {
      console.warn('[AUTH] Update status API failed:', err.message);
    }
  };

  // Report Extra Charge Dispute in Live MySQL
  const reportDispute = async (disputeData) => {
    try {
      return await disputesAPI.reportExtraCharge(disputeData, authToken);
    } catch (err) {
      console.warn('[AUTH] Dispute API failed:', err.message);
      return { success: false, message: err.message };
    }
  };

  // Customer: Respond to Worker's Counter Offer (Accept or Decline)
  const respondToCounter = async (bookingId, action) => {
    try {
      const res = await bookingsAPI.respondToCounter(bookingId, action, authToken);
      if (res && res.success) {
        await refreshBookings();
        return { success: true, message: res.message };
      }
      return { success: false, message: res?.message || 'Failed to update counter.' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Mark booking as rated locally immediately to prevent repeated review popups
  const markBookingRated = (bookingId, rating, comment = '') => {
    setBookings((prev) =>
      prev.map((b) =>
        String(b.id) === String(bookingId)
          ? {
              ...b,
              isRated: true,
              userRating: rating,
              reviewComment: comment,
            }
          : b
      )
    );
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userType,
        user,
        worker: user,
        isProfileCompleted,
        phoneNumber,
        workerTrade,

        workerSelfie,
        setWorkerSelfie,
        userName,
        userLocation,
        userCoordinates,
        setUserCoordinates,
        authToken,
        bookings,
        isLoading,
        loginCustomer,
        loginWorker,
        loginAdmin,
        completeCustomerProfile,
        completeWorkerProfile,
        logout,
        setUserLocation,
        addBooking,
        updateBookingStatus,
        refreshBookings,
        reportDispute,
        respondToCounter,
        markBookingRated,
        activeInAppAlert,
        setActiveInAppAlert,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
